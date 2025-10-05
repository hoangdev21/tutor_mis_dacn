// ===== MESSAGES PAGE JAVASCRIPT =====

const API_BASE_URL = 'http://localhost:5000/api';
let currentConversationId = null;
let currentRecipient = null;
let conversations = [];
let messages = [];
let messagePollingInterval = null;
let messageSocket = null;

// Use TokenManager for automatic token refresh
const tokenManager = window.TokenManager || {
  apiRequest: async (endpoint, options) => {
    // Fallback if TokenManager not loaded
    console.warn('⚠️ TokenManager not loaded, using fallback');
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options?.headers
      }
    });
    return response.json();
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  checkAuthentication();
  await loadConversations();
  setupEventListeners();
  startMessagePolling();
  
  // Initialize Socket.IO for real-time updates
  await initializeSocket();
  
  // Ensure empty state is shown if no conversation selected
  ensureEmptyStateDisplay();
  
  // Check if redirected from tutor profile with recipientId
  await checkAndOpenConversation();
});

// Check authentication
function checkAuthentication() {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  if (!token) {
    window.location.href = '/index.html';
    return false;
  }
  return true;
}

// Setup event listeners
function setupEventListeners() {
  // Message input auto-resize
  const messageInput = document.getElementById('messageInput');
  if (messageInput) {
    messageInput.addEventListener('input', (e) => {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    });
  }
}

// Initialize Socket.IO connection
async function initializeSocket() {
  try {
    // Load Socket.IO client script if not already loaded
    if (typeof MessageSocket === 'undefined') {
      await loadScript('/assets/js/messages-socket.js');
    }
    
    // Create socket instance
    messageSocket = new MessageSocket(API_BASE_URL);
    
    // Setup callbacks for online/offline events
    messageSocket.onUserOnline = (data) => {
      console.log('🟢 User came online:', data);
      if (data.userId) {
        updateUserStatusDisplay(data.userId, true, data.lastSeen || new Date());
      }
    };
    
    messageSocket.onUserOffline = (data) => {
      console.log('⚫ User went offline:', data);
      if (data.userId) {
        updateUserStatusDisplay(data.userId, false, data.lastSeen || new Date());
      }
    };
    
    messageSocket.onConnect = () => {
      console.log('✅ Socket connected successfully');
    };
    
    messageSocket.onDisconnect = () => {
      console.log('❌ Socket disconnected');
    };
    
    messageSocket.onError = (error) => {
      console.error('❌ Socket error:', error);
    };
    
    // Connect to socket
    await messageSocket.connect();
  } catch (error) {
    console.error('Error initializing socket:', error);
  }
}

// Load external script dynamically
function loadScript(src) {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// Check and open conversation from URL parameter
async function checkAndOpenConversation() {
  try {
    // Get recipientId from URL (support both recipientId and userId for backward compatibility)
    const urlParams = new URLSearchParams(window.location.search);
    const recipientId = urlParams.get('recipientId') || urlParams.get('userId');
    
    if (!recipientId) {
      return;
    }
    
    console.log('🔍 Opening conversation with recipient:', recipientId);
    
    // Check if conversation already exists
    const existingConvo = conversations.find(c => {
      const otherUser = c.otherUser || c.recipient;
      return otherUser && otherUser._id === recipientId;
    });
    
    if (existingConvo) {
      // Open existing conversation
      console.log('✅ Found existing conversation:', existingConvo._id);
      selectConversation(existingConvo._id, recipientId);
    } else {
      // Create new conversation or get recipient info
      console.log('📝 Creating new conversation with:', recipientId);
      
      // Try to get recipient info from localStorage (from tutor profile page)
      const chatRecipient = localStorage.getItem('chatRecipient');
      let recipientInfo = null;
      
      if (chatRecipient) {
        recipientInfo = JSON.parse(chatRecipient);
        console.log('👤 Got recipient info from localStorage:', recipientInfo);
      } else {
        // Fetch recipient info from API - try multiple endpoints based on role
        console.log('🔍 Fetching recipient info from API...');
        
        // Try to fetch as tutor first (most common case for students)
        try {
          const tutorResponse = await apiRequest(`/auth/tutor/${recipientId}`);
          if (tutorResponse.success && tutorResponse.data) {
            const tutorData = tutorResponse.data;
            recipientInfo = {
              id: tutorData._id || recipientId,
              name: tutorData.profile?.fullName || tutorData.email || 'Gia sư',
              avatar: tutorData.profile?.avatar || tutorData.avatar || '',
              role: 'tutor',
              email: tutorData.email || '',
              phone: tutorData.profile?.phone || ''
            };
            console.log('✅ Found recipient as tutor:', recipientInfo);
          }
        } catch (tutorError) {
          console.log('⚠️ Not a tutor, trying student...');
          
          // If not found as tutor, try as student
          try {
            const studentResponse = await apiRequest(`/auth/student/${recipientId}`);
            if (studentResponse.success && studentResponse.data) {
              const studentData = studentResponse.data;
              recipientInfo = {
                id: studentData._id || recipientId,
                name: studentData.profile?.fullName || studentData.email || 'Học sinh',
                avatar: studentData.profile?.avatar || studentData.avatar || '',
                role: 'student',
                email: studentData.email || '',
                phone: studentData.profile?.phone || ''
              };
              console.log('✅ Found recipient as student:', recipientInfo);
            }
          } catch (studentError) {
            console.log('⚠️ Not a student, trying admin...');
            
            // If still not found, try as admin
            try {
              const adminResponse = await apiRequest(`/auth/admin/${recipientId}`);
              if (adminResponse.success && adminResponse.data) {
                const adminData = adminResponse.data;
                recipientInfo = {
                  id: adminData._id || recipientId,
                  name: adminData.profile?.fullName || adminData.email || 'Admin',
                  avatar: adminData.profile?.avatar || adminData.avatar || '',
                  role: 'admin',
                  email: adminData.email || '',
                  phone: adminData.profile?.phone || ''
                };
                console.log('✅ Found recipient as admin:', recipientInfo);
              }
            } catch (adminError) {
              console.error('❌ Could not find recipient in any role:', adminError);
              
              // Final fallback: create basic recipient info with just the ID
              console.log('⚠️ Using fallback recipient info');
              recipientInfo = {
                id: recipientId,
                name: 'Người dùng',
                avatar: '',
                role: 'user',
                email: '',
                phone: ''
              };
            }
          }
        }
      }
      
      if (recipientInfo) {
        // Set as current recipient and open chat
        currentRecipient = {
          _id: recipientInfo.id,
          name: recipientInfo.name,
          avatar: recipientInfo.avatar,
          role: recipientInfo.role,
          email: recipientInfo.email || '',
          phone: recipientInfo.phone || '',
          isOnline: false
        };
        
        // Show active conversation UI
        const emptyChat = document.querySelector('.empty-chat');
        if (emptyChat) {
          emptyChat.classList.remove('no-conversation');
        }
        
        const activeConversation = document.getElementById('activeConversation');
        if (activeConversation) {
          activeConversation.style.display = 'flex';
        }
        
        // Update conversation header with recipient info (check if elements exist)
        const chatUserAvatar = document.getElementById('chatUserAvatar');
        const chatUserName = document.getElementById('chatUserName');
        const chatUserStatus = document.getElementById('chatUserStatus');
        
        // Update avatar
        if (chatUserAvatar) {
          if (currentRecipient.avatar) {
            chatUserAvatar.src = currentRecipient.avatar;
            chatUserAvatar.alt = currentRecipient.name;
          } else {
            // Fallback to UI Avatars API
            chatUserAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentRecipient.name)}&background=667eea&color=fff&size=128`;
            chatUserAvatar.alt = currentRecipient.name;
          }
          
          // Update online indicator if wrapper exists
          const avatarWrapper = chatUserAvatar.parentElement;
          if (avatarWrapper && avatarWrapper.classList.contains('chat-user-avatar-wrapper')) {
            let indicator = avatarWrapper.querySelector('.online-indicator');
            if (!indicator) {
              indicator = document.createElement('div');
              indicator.className = 'online-indicator';
              avatarWrapper.appendChild(indicator);
            }
            // Update indicator status
            if (currentRecipient.isOnline) {
              indicator.classList.remove('offline');
            } else {
              indicator.classList.add('offline');
            }
          }
        }
        
        if (chatUserName) {
          chatUserName.textContent = currentRecipient.name;
        }
        
        if (chatUserStatus) {
          const statusText = getStatusText(currentRecipient);
          chatUserStatus.textContent = statusText;
          chatUserStatus.className = currentRecipient.isOnline ? 'user-status online' : 'user-status offline';
        }
        
        // Load messages (will be empty for new conversation)
        await loadMessages(recipientId, true);
        
        // Mark conversation as read in UI after loading
        if (existingConvo) {
          await markConversationAsReadInUI(existingConvo._id);
        }
        
        // Clear localStorage
        localStorage.removeItem('chatRecipient');
        
        console.log('✅ New conversation opened successfully');
      } else {
        console.error('❌ Could not get recipient info');
        showNotification('Không thể mở cuộc trò chuyện', 'error');
      }
    }
    
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
    
  } catch (error) {
    console.error('❌ Error opening conversation:', error);
    showNotification('Có lỗi xảy ra khi mở cuộc trò chuyện', 'error');
  }
}

// Load conversations
async function loadConversations() {
  try {
    // Check if user is authenticated first
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!token) {
      console.warn('No token found, skipping conversation load');
      renderEmptyConversations();
      return;
    }
    
    const response = await apiRequest('/messages/conversations');
    
    if (response.success) {
      conversations = response.data || [];
      renderConversations(conversations);
      updateUnreadBadge();
    }
  } catch (error) {
    console.error('Error loading conversations:', error);
    // Show empty state instead of error for better UX
    renderEmptyConversations();
  }
}

// Render empty conversations state
function renderEmptyConversations() {
  const container = document.getElementById('conversationList');
  if (container) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 40px 20px; text-align: center; color: #666;">
        <i class="fas fa-inbox" style="font-size: 48px; color: #ddd; margin-bottom: 16px;"></i>
        <p style="margin-bottom: 8px; font-weight: 500;">Chưa có tin nhắn</p>
        <p style="font-size: 14px; color: #999;">Bắt đầu trò chuyện mới để kết nối</p>
      </div>
    `;
  }
}

// Render conversations
function renderConversations(convos) {
  const container = document.getElementById('conversationList');
  
  if (convos.length === 0) {
    container.innerHTML = `
      <div class="no-conversations">
        <i class="fas fa-comments"></i>
        <p>Chưa có cuộc trò chuyện nào</p>
      </div>
    `;
    return;
  }

  container.innerHTML = convos.map(convo => {
    const isActive = currentConversationId === convo._id;
    const isUnread = convo.unreadCount > 0;
    // API returns otherUser, not recipient
    const otherUser = convo.otherUser || convo.recipient || {};
    const isOnline = otherUser.isOnline;
    const userName = otherUser.fullName || otherUser.name || otherUser.email || 'Người dùng';
    const userAvatar = otherUser.avatar;
    const userId = otherUser._id;
    
    return `
      <div class="conversation-item ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}" 
           onclick="selectConversation('${convo._id}', '${userId}')">
        <div class="user-avatar ${isOnline ? 'online' : ''}">
          ${userAvatar ? 
            `<img src="${userAvatar}" alt="${userName}" style="border-radius: 50%;">` : 
            `<i class="fas fa-user"></i>`
          }
        </div>
        <div class="conversation-info">
          <div class="conversation-header">
            <span class="conversation-name">${userName}</span>
            <span class="conversation-time">${formatTime(convo.lastMessage?.createdAt)}</span>
          </div>
          <p class="conversation-preview">
            ${convo.lastMessage?.content || 'Bắt đầu trò chuyện'}
          </p>
        </div>
        ${isUnread ? `<span class="unread-badge">${convo.unreadCount}</span>` : ''}
      </div>
    `;
  }).join('');
}

// Filter conversations
function filterConversations() {
  const searchInput = document.getElementById('conversationSearch');
  const query = searchInput.value.toLowerCase().trim();
  
  if (!query) {
    renderConversations(conversations);
    return;
  }

  const filtered = conversations.filter(convo => {
    const otherUser = convo.otherUser || convo.recipient || {};
    const userName = otherUser.fullName || otherUser.name || otherUser.email || '';
    return userName.toLowerCase().includes(query) ||
           convo.lastMessage?.content.toLowerCase().includes(query);
  });
  
  renderConversations(filtered);
}

// Select conversation
async function selectConversation(conversationId, recipientId) {
  currentConversationId = conversationId;
  
  // Get recipient info
  const convo = conversations.find(c => c._id === conversationId);
  if (convo) {
    // API returns otherUser
    const otherUser = convo.otherUser || convo.recipient || {};
    currentRecipient = {
      _id: otherUser._id,
      name: otherUser.fullName || otherUser.name || otherUser.email || 'Người dùng',
      email: otherUser.email || '',
      avatar: otherUser.avatar || '',
      role: otherUser.role || 'user',
      isOnline: otherUser.isOnline || false
    };
  }

  // Update UI
  const emptyChat = document.querySelector('.empty-chat');
  const activeConversation = document.getElementById('activeConversation');
  
  if (emptyChat) emptyChat.classList.remove('no-conversation');
  if (activeConversation) activeConversation.style.display = 'flex';
  
  // Update active state in sidebar
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.classList.remove('active');
    // Find the matching conversation item by checking the onclick attribute
    const onclickAttr = item.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes(conversationId)) {
      item.classList.add('active');
    }
  });

  // Load messages
  await loadMessages(conversationId);
  
  // Update recipient info
  updateRecipientInfo();
}

// Load messages
async function loadMessages(conversationIdOrRecipientId, isRecipientId = false) {
  try {
    const recipientId = currentRecipient?._id || conversationIdOrRecipientId;
    
    if (!recipientId) {
      console.error('❌ No recipientId available');
      messages = [];
      renderMessages();
      return;
    }
    
    // Backend API uses: GET /messages/conversation?recipientId=...
    // Note: We're not using conversationId at all - backend needs recipientId
    const response = await apiRequest(`/messages/conversation?recipientId=${recipientId}`);
    
    if (response.success) {
      messages = response.data.messages || response.data || [];
      renderMessages();
      // Chỉ tự động cuộn khi load lần đầu (force = true)
      scrollToBottom(true, true);
    }
  } catch (error) {
    console.error('Error loading messages:', error);
    // Don't show error for new conversations (no messages yet)
    if (!isRecipientId) {
      showError('Không thể tải tin nhắn');
    } else {
      // For new conversations, just show empty state
      messages = [];
      renderMessages();
    }
  }
}

// Render messages
function renderMessages() {
  const container = document.getElementById('messagesArea');
  
  if (!container) {
    console.error('❌ messagesArea element not found');
    return;
  }
  
  const currentUserId = getCurrentUserId();
  
  if (messages.length === 0) {
    container.innerHTML = `
      <div class="no-messages">
        <i class="fas fa-comment-slash"></i>
        <p>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
      </div>
    `;
    return;
  }

  let lastDate = null;
  let html = '';

  messages.forEach(msg => {
    const messageDate = new Date(msg.createdAt).toLocaleDateString();
    
    // Add date divider
    if (messageDate !== lastDate) {
      html += `<div class="date-divider">${formatDate(msg.createdAt)}</div>`;
      lastDate = messageDate;
    }

    // Check if message is sent by current user
    // API returns senderId as object with _id, or sometimes just the ID string
    const messageSenderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
    const isSent = String(messageSenderId) === String(currentUserId);
    
    // Debug logging (có thể remove sau khi fix)
    if (messages.indexOf(msg) === 0) {
      console.log('🔍 Message comparison debug:', {
        messageSenderId: messageSenderId,
        currentUserId: currentUserId,
        isSent: isSent,
        senderObject: msg.senderId
      });
    }
    
    html += `
      <div class="message ${isSent ? 'sent' : 'received'}">
        ${!isSent ? `
        <div class="message-avatar">
          ${currentRecipient?.avatar ? 
            `<img src="${currentRecipient.avatar}" alt="${currentRecipient.name}">` :
            `<i class="fas fa-user"></i>`
          }
        </div>
        ` : ''}
        <div class="message-content">
          <p class="message-text">${escapeHtml(msg.content)}</p>
          ${msg.attachment ? `
            <div class="message-file">
              <i class="fas fa-file"></i>
              <a href="${msg.attachment.url}" target="_blank">${msg.attachment.name}</a>
            </div>
          ` : ''}
          <span class="message-time">${formatTime(msg.createdAt)}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  
  // Thêm scroll listener để phát hiện khi người dùng cuộn
  container.removeEventListener('scroll', checkUserScrolling);
  container.addEventListener('scroll', checkUserScrolling);
}

// Send message
async function sendMessage(event) {
  if (event) event.preventDefault();
  
  const input = document.getElementById('messageInput');
  const content = input.value.trim();
  
  if (!content) return;
  
  // Check if we have recipient (for new conversations) or conversationId (for existing)
  if (!currentRecipient && !currentConversationId) {
    showNotification('Vui lòng chọn người nhận', 'error');
    return;
  }
  
  try {
    // Backend API: POST /messages with recipientId and content
    if (!currentRecipient || !currentRecipient._id) {
      showNotification('Không tìm thấy thông tin người nhận', 'error');
      return;
    }
    
    const response = await apiRequest('/messages', {
      method: 'POST',
      body: JSON.stringify({ 
        recipientId: currentRecipient._id,
        content 
      })
    });

    if (response.success) {
      // Add message to UI optimistically
      messages.push(response.data);
      renderMessages();
      // Force scroll khi người dùng gửi tin nhắn
      scrollToBottom(true, true);
      
      // Clear input
      input.value = '';
      input.style.height = 'auto';
      
      // Update conversation list
      await loadConversations();
    }
  } catch (error) {
    console.error('Error sending message:', error);
    showNotification('Không thể gửi tin nhắn', 'error');
  }
}

// Handle Enter key
function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    event.target.form.dispatchEvent(new Event('submit'));
  }
}

// Attach file
function attachFile() {
  document.getElementById('fileInput').click();
}

// Handle file select
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showNotification('File không được vượt quá 5MB', 'error');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', currentConversationId);

    const response = await fetch(`${API_BASE_URL}/messages/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      },
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      messages.push(data.data);
      renderMessages();
      scrollToBottom();
      await loadConversations();
    } else {
      showNotification(data.message || 'Không thể tải file lên', 'error');
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    showNotification('Lỗi khi tải file lên', 'error');
  }

  // Clear input
  event.target.value = '';
}

// Mark conversation as read - Backend tự động xử lý khi load messages
// Chỉ cần update UI
async function markConversationAsReadInUI(conversationId) {
  try {
    // Update UI
    const convoItem = document.querySelector(`.conversation-item[data-id="${conversationId}"]`);
    if (convoItem) {
      convoItem.classList.remove('unread');
      convoItem.querySelector('.unread-badge')?.remove();
    }
    
    // Reload conversations để cập nhật unread count
    await loadConversations();
  } catch (error) {
    console.error('Error updating conversation UI:', error);
  }
}

// Update recipient info in header
function updateRecipientInfo() {
  if (!currentRecipient) return;

  const chatUserAvatar = document.getElementById('chatUserAvatar');
  const chatUserName = document.getElementById('chatUserName');
  const chatUserStatus = document.getElementById('chatUserStatus');
  const profileUserName = document.getElementById('profileUserName');
  const profileUserRole = document.getElementById('profileUserRole');
  const profileUserEmail = document.getElementById('profileUserEmail');
  const profileUserPhone = document.getElementById('profileUserPhone');

  // Update avatar in chat header
  if (chatUserAvatar) {
    if (currentRecipient.avatar) {
      chatUserAvatar.src = currentRecipient.avatar;
      chatUserAvatar.alt = currentRecipient.name;
    } else {
      // Fallback to UI Avatars API with user's name
      chatUserAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentRecipient.name)}&background=667eea&color=fff&size=128`;
      chatUserAvatar.alt = currentRecipient.name;
    }
    
    // Update online indicator if wrapper exists
    const avatarWrapper = chatUserAvatar.parentElement;
    if (avatarWrapper && avatarWrapper.classList.contains('chat-user-avatar-wrapper')) {
      let indicator = avatarWrapper.querySelector('.online-indicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'online-indicator';
        avatarWrapper.appendChild(indicator);
      }
      // Update indicator status
      if (currentRecipient.isOnline) {
        indicator.classList.remove('offline');
      } else {
        indicator.classList.add('offline');
      }
    }
  }

  // Update name
  if (chatUserName) chatUserName.textContent = currentRecipient.name;
  
  // Show loading state for status while fetching real data
  if (chatUserStatus) {
    chatUserStatus.textContent = 'Đang tải...';
    chatUserStatus.className = 'user-status chat-status offline';
  }
  
  // Fetch and update real-time user status from API
  // This will update the status with accurate data
  if (currentRecipient && currentRecipient._id) {
    fetchAndDisplayUserStatus(currentRecipient._id);
  }
  
  // Update panel info (these might not exist in all pages)
  if (profileUserName) profileUserName.textContent = currentRecipient.name;
  if (profileUserRole) profileUserRole.textContent = currentRecipient.role === 'tutor' ? 'Gia sư' : 'Học sinh';
  if (profileUserEmail) profileUserEmail.textContent = currentRecipient.email || 'N/A';
  if (profileUserPhone) profileUserPhone.textContent = currentRecipient.phone || 'N/A';
}

// View user profile
function viewUserProfile() {
  const panel = document.getElementById('userInfoPanel');
  panel.classList.toggle('active');
}

// Close user info panel
function closeUserInfoPanel() {
  document.getElementById('userInfoPanel').classList.remove('active');
}

// View full profile
function viewFullProfile() {
  if (currentRecipient && currentRecipient.role === 'tutor') {
    window.location.href = `/tutor-profile.html?id=${currentRecipient._id}`;
  }
}

// Block user
async function blockUser() {
  if (!confirm('Bạn có chắc chắn muốn chặn người dùng này?')) return;
  
  try {
    const response = await apiRequest(`/messages/block/${currentRecipient._id}`, {
      method: 'POST'
    });

    if (response.success) {
      showNotification('Đã chặn người dùng', 'success');
      window.location.reload();
    }
  } catch (error) {
    showNotification('Không thể chặn người dùng', 'error');
  }
}

// Toggle chat options
function toggleChatOptions() {
  // Show options menu (implement dropdown)
  showNotification('Chức năng đang phát triển', 'info');
}

// Show new message modal
function showNewMessageModal() {
  document.getElementById('newMessageModal').classList.add('active');
}

// Close new message modal
function closeNewMessageModal() {
  document.getElementById('newMessageModal').classList.remove('active');
  document.getElementById('recipientSearch').value = '';
  document.getElementById('userSearchResults').innerHTML = '';
  document.getElementById('newMessageText').value = '';
}

// Search users
let searchTimeout;
async function searchUsers() {
  clearTimeout(searchTimeout);
  
  const query = document.getElementById('recipientSearch').value.trim();
  if (!query || query.length < 2) {
    document.getElementById('userSearchResults').innerHTML = '';
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      const response = await apiRequest(`/users/search?q=${encodeURIComponent(query)}`);
      
      if (response.success) {
        renderUserSearchResults(response.data);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  }, 300);
}

// Render user search results
function renderUserSearchResults(users) {
  const container = document.getElementById('userSearchResults');
  
  if (users.length === 0) {
    container.innerHTML = '<p style="padding: 12px; text-align: center; color: #999;">Không tìm thấy người dùng</p>';
    return;
  }

  container.innerHTML = users.map(user => `
    <div class="user-result" onclick="selectRecipient('${user._id}', '${user.name}', '${user.role}')">
      <div class="user-result-avatar">
        <i class="fas fa-user"></i>
      </div>
      <div class="user-result-info">
        <h4>${user.name}</h4>
        <p>${user.role === 'tutor' ? 'Gia sư' : 'Học sinh'}</p>
      </div>
    </div>
  `).join('');
}

// Select recipient for new message
let selectedRecipientId = null;
function selectRecipient(userId, userName, userRole) {
  selectedRecipientId = userId;
  document.getElementById('recipientSearch').value = userName;
  document.getElementById('userSearchResults').innerHTML = '';
}

// Send new message
async function sendNewMessage() {
  const content = document.getElementById('newMessageText').value.trim();
  
  if (!selectedRecipientId) {
    showNotification('Vui lòng chọn người nhận', 'error');
    return;
  }
  
  if (!content) {
    showNotification('Vui lòng nhập nội dung tin nhắn', 'error');
    return;
  }

  try {
    const response = await apiRequest('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({
        recipientId: selectedRecipientId,
        content: content
      })
    });

    if (response.success) {
      showNotification('Đã gửi tin nhắn', 'success');
      closeNewMessageModal();
      
      // Reload conversations and select the new one
      await loadConversations();
      if (response.data.conversationId) {
        selectConversation(response.data.conversationId, selectedRecipientId);
      }
    }
  } catch (error) {
    console.error('Error sending new message:', error);
    showNotification('Không thể gửi tin nhắn', 'error');
  }
}

// Start message polling (check for new messages every 5 seconds)
function startMessagePolling() {
  messagePollingInterval = setInterval(async () => {
    if (currentRecipient?._id) {
      try {
        // Reload messages to check for new ones
        const recipientId = currentRecipient._id;
        const response = await apiRequest(`/messages/conversation?recipientId=${recipientId}`);
        
        if (response.success) {
          const newMessages = response.data || [];
          
          // Check if there are new messages
          if (newMessages.length > messages.length) {
            const hadMessages = messages.length > 0;
            messages = newMessages;
            renderMessages();
            
            // Chỉ tự động cuộn nếu user không đang xem tin nhắn cũ
            // Hoặc nếu là tin nhắn đầu tiên
            if (!hadMessages || !isUserScrolling) {
              scrollToBottom(true, false);
            }
            
            // Không cần play sound nữa - hàm này không tồn tại
          }
        }
      } catch (error) {
        // Silently fail for polling errors
        console.debug('Polling error:', error.message);
      }
    }
    
    // Also check for new conversations
    await loadConversations();
  }, 5000);
}

// Update unread badge
function updateUnreadBadge() {
  const totalUnread = conversations.reduce((sum, convo) => sum + (convo.unreadCount || 0), 0);
  const badge = document.getElementById('unreadBadge');
  
  if (badge) {
    badge.textContent = totalUnread;
    badge.style.display = totalUnread > 0 ? 'flex' : 'none';
  }
}

// Ensure empty state is displayed when no conversation is selected
function ensureEmptyStateDisplay() {
  const emptyChat = document.querySelector('.empty-chat');
  const activeConversation = document.getElementById('activeConversation');
  
  // If no current conversation selected, show empty state
  if (!currentConversationId && !currentRecipient) {
    if (emptyChat && !emptyChat.classList.contains('no-conversation')) {
      emptyChat.classList.add('no-conversation');
    }
    if (activeConversation) {
      activeConversation.style.display = 'none';
    }
  }
}

// Utility functions
let isUserScrolling = false;
let scrollTimeout = null;

function scrollToBottom(smooth = true, force = false) {
  const container = document.getElementById('messagesArea');
  if (!container) return;
  
  // Nếu người dùng đang cuộn và không force, không tự động cuộn
  if (isUserScrolling && !force) return;
  
  setTimeout(() => {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, 50);
}

// Kiểm tra xem người dùng có đang cuộn lên xem tin nhắn cũ không
function checkUserScrolling() {
  const container = document.getElementById('messagesArea');
  if (!container) return;
  
  // Nếu người dùng cuộn lên (cách bottom > 100px), đánh dấu là đang cuộn
  const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
  isUserScrolling = !isAtBottom;
}

function getCurrentUserId() {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.id || payload._id;
  } catch (error) {
    console.error('❌ Error decoding token:', error);
    return null;
  }
}

function getStatusText(user) {
  if (!user) return 'Không hoạt động';
  
  // Use formatLastSeen for consistent formatting
  return formatLastSeen(user.lastSeen || user.lastLogin, user.isOnline);
}

function formatTime(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return 'Hôm qua ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays < 7) return `${diffDays} ngày trước`;
  
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' ' + 
         date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Hôm nay';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Hôm qua';
  } else {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;

  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        background: white;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
      }
      .notification--success { border-left: 4px solid #10b981; color: #10b981; }
      .notification--error { border-left: 4px solid #ef4444; color: #ef4444; }
      .notification--info { border-left: 4px solid #3b82f6; color: #3b82f6; }
      .notification i { font-size: 20px; }
      .notification span { color: #333; font-size: 14px; }
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// API request helper - Use TokenManager for automatic token refresh
async function apiRequest(endpoint, options = {}) {
  return await tokenManager.apiRequest(endpoint, options);
}

// ===== USER STATUS FUNCTIONS =====

/**
 * Format lastSeen time to human readable string
 * @param {Date|string} lastSeen - Last seen timestamp
 * @param {boolean} isOnline - Whether user is currently online
 * @returns {string} Formatted status text
 */
function formatLastSeen(lastSeen, isOnline) {
  if (isOnline) {
    return 'Đang hoạt động';
  }
  
  if (!lastSeen) {
    return 'Không hoạt động';
  }
  
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffMs = now - lastSeenDate;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMinutes < 1) {
    return 'Vừa xong';
  } else if (diffMinutes < 60) {
    return `Hoạt động ${diffMinutes} phút trước`;
  } else if (diffHours < 24) {
    return `Hoạt động ${diffHours} giờ trước`;
  } else if (diffDays < 7) {
    return `Hoạt động ${diffDays} ngày trước`;
  } else {
    // Format as date if more than a week
    return `Hoạt động ${lastSeenDate.toLocaleDateString('vi-VN')}`;
  }
}

/**
 * Update user status display in chat header
 * @param {string} userId - User ID to update status for
 * @param {boolean} isOnline - Whether user is online
 * @param {Date|string} lastSeen - Last seen timestamp
 */
function updateUserStatusDisplay(userId, isOnline, lastSeen) {
  // Only update if this is the current conversation
  if (!currentRecipient || currentRecipient._id !== userId) {
    return;
  }
  
  // Update status text using ID selector (more reliable)
  const statusElement = document.getElementById('chatUserStatus');
  if (!statusElement) {
    console.warn('⚠️ Status element not found');
    return;
  }
  
  const statusText = formatLastSeen(lastSeen, isOnline);
  statusElement.textContent = statusText;
  
  // Update status classes
  if (isOnline) {
    statusElement.classList.remove('offline');
    statusElement.classList.add('online');
  } else {
    statusElement.classList.remove('online');
    statusElement.classList.add('offline');
  }
  
  // Update online indicator (the dot next to avatar)
  const statusIndicator = document.querySelector('.chat-header .online-indicator');
  if (statusIndicator) {
    if (isOnline) {
      statusIndicator.classList.remove('offline');
    } else {
      statusIndicator.classList.add('offline');
    }
  }
  
  console.log('✅ Status updated:', { userId, isOnline, statusText });
}

/**
 * Fetch and display user status
 * @param {string} userId - User ID to fetch status for
 */
async function fetchAndDisplayUserStatus(userId) {
  try {
    console.log('🔍 Fetching user status for:', userId);
    
    const response = await apiRequest(`/messages/user-status/${userId}`, {
      method: 'GET'
    });
    
    console.log('📊 User status response:', response);
    
    if (response.success && response.data) {
      console.log('✅ Updating status display:', {
        userId: response.data.userId,
        isOnline: response.data.isOnline,
        lastSeen: response.data.lastSeen
      });
      
      updateUserStatusDisplay(
        response.data.userId,
        response.data.isOnline,
        response.data.lastSeen
      );
    } else {
      console.warn('⚠️ Invalid response:', response);
      // Fallback to offline status
      const statusElement = document.getElementById('chatUserStatus');
      if (statusElement) {
        statusElement.textContent = 'Không hoạt động';
        statusElement.className = 'user-status chat-status offline';
      }
    }
  } catch (error) {
    console.error('❌ Error fetching user status:', error);
    // Fallback to offline status
    const statusElement = document.getElementById('chatUserStatus');
    if (statusElement) {
      statusElement.textContent = 'Không hoạt động';
      statusElement.className = 'user-status chat-status offline';
    }
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
  }
});

console.log('Messages page initialized');
