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
  
  // Initialize call audio
  initializeCallAudio();
  
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
    
    // Setup WebRTC event listeners (must be after socket connects)
    setupWebRTCListeners();
  } catch (error) {
    console.error('Error initializing socket:', error);
  }
}

// Setup WebRTC event listeners
function setupWebRTCListeners() {
  if (!messageSocket || !messageSocket.socket) {
    console.warn('⚠️ Socket not ready for WebRTC listeners');
    return;
  }
  
  // Remove existing listeners to avoid duplicates
  messageSocket.socket.off('incoming_call');
  messageSocket.socket.off('call_accepted');
  messageSocket.socket.off('call_rejected');
  messageSocket.socket.off('call_ended');
  
  // Listen for incoming calls - This must be always active
  messageSocket.socket.on('incoming_call', (data) => {
    console.log('📞 ===== INCOMING CALL RECEIVED =====');
    console.log('📞 Caller:', data.callerName);
    console.log('📞 Call Type:', data.callType);
    console.log('📞 Full Data:', data);
    handleIncomingCall(data);
  });
  
  // Listen for call accepted (for outgoing calls)
  // Note: WebRTC service already handles the answer, we just update UI
  messageSocket.socket.on('call_accepted', ({ recipientId, answer }) => {
    console.log('✅ Call accepted by:', recipientId);
    
    // Stop ringback tone (outgoing call sound)
    stopRingtone();
    
    // Transition from outgoing to active call UI
    setTimeout(() => {
      document.getElementById('outgoingCall').style.display = 'none';
      document.getElementById('activeCall').style.display = 'block';
      
      // Update active call info with recipient details
      if (currentRecipient) {
        const activeCallName = document.getElementById('activeCallName');
        const activeCallAvatar = document.getElementById('activeCallAvatar');
        
        if (activeCallName) {
          activeCallName.textContent = currentRecipient.name || 'User';
        }
        
        if (activeCallAvatar) {
          activeCallAvatar.src = currentRecipient.avatar || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(currentRecipient.name || 'User')}`;
        }
        
        console.log('📞 Active call info set:', {
          name: currentRecipient.name,
          avatar: currentRecipient.avatar
        });
          
        // Show video button only for video calls
        const toggleVideoBtn = document.getElementById('toggleVideoBtn');
        if (toggleVideoBtn && webrtcService) {
          toggleVideoBtn.style.display = webrtcService.callType === 'video' ? 'block' : 'none';
        }
      } else {
        console.warn('⚠️ currentRecipient is not set!');
      }
      
      startCallDuration();
    }, 500); // Small delay to ensure WebRTC connection is established
  });
  
  // Listen for call rejected
  messageSocket.socket.on('call_rejected', ({ reason }) => {
    console.log('❌ Call rejected:', reason);
    
    // Stop ringback tone
    stopRingtone();
    
    hideCallModal();
    showNotification(reason || 'Cuộc gọi bị từ chối', 'error');
    
    // Add call history message
    addCallHistoryMessage('rejected', false);
  });
  
  // Listen for call ended by peer
  messageSocket.socket.on('call_ended', () => {
    console.log('📴 Call ended by peer');
    
    // Stop any ringtone/ringback
    stopRingtone();
    
    hideCallModal();
    stopCallDuration();
    showNotification('Cuộc gọi đã kết thúc', 'info');
    
    // Add call history message
    addCallHistoryMessage('ended', false);
  });
  
  console.log('✅ WebRTC listeners setup complete');
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
    
    // Check if auto-call is requested
    const autoCall = urlParams.get('autoCall');
    if (autoCall && (autoCall === 'video' || autoCall === 'audio')) {
      console.log(`📞 Auto-initiating ${autoCall} call...`);
      // Wait a bit for the conversation UI to fully load
      setTimeout(() => {
        if (typeof initiateCall === 'function') {
          initiateCall(autoCall);
        } else {
          console.error('❌ initiateCall function not found');
        }
      }, 500);
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
    
    // Render attachments
    let attachmentHTML = '';
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach(att => {
        const isImage = att.mimeType && att.mimeType.startsWith('image/');
        
        if (isImage) {
          // Display image directly - click to view in lightbox
          attachmentHTML += `
            <div class="message-attachment message-image">
              <img src="${att.url}" 
                   alt="${escapeHtml(att.originalName || att.filename)}" 
                   onclick="openImageLightbox('${att.url}', '${escapeHtml(att.originalName || att.filename)}')">
            </div>
          `;
        } else {
          // Display file with icon and download link
          const fileIcon = getFileIcon(att.mimeType, att.originalName || att.filename);
          const fileSize = att.size ? formatFileSize(att.size) : '';
          
          attachmentHTML += `
            <div class="message-attachment message-file">
              <a href="${att.url}" 
                 download="${escapeHtml(att.originalName || att.filename)}" 
                 class="file-link"
                 onclick="handleFileDownload(event, '${att.url}', '${escapeHtml(att.originalName || att.filename)}')">
                <i class="fas ${fileIcon} file-icon"></i>
                <div class="file-info">
                  <span class="file-name">${escapeHtml(att.originalName || att.filename)}</span>
                  ${fileSize ? `<span class="file-size">${fileSize}</span>` : ''}
                </div>
                <i class="fas fa-download download-icon"></i>
              </a>
            </div>
          `;
        }
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
          ${msg.content ? `<p class="message-text">${escapeHtml(msg.content)}</p>` : ''}
          ${attachmentHTML}
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
  
  // Check if we have content or attachment
  if (!content && !currentFileAttachment) {
    return;
  }
  
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
    
    // Prepare message data
    const messageData = {
      recipientId: currentRecipient._id,
      content: content || ''
    };
    
    // Add attachment if exists
    if (currentFileAttachment) {
      messageData.messageType = currentFileAttachment.messageType;
      messageData.attachments = [currentFileAttachment];
      
      console.log('📎 Sending message with attachment:', {
        messageType: messageData.messageType,
        attachments: messageData.attachments,
        hasContent: !!content
      });
    }
    
    console.log('📤 Sending message data:', {
      recipientId: messageData.recipientId,
      contentLength: messageData.content.length,
      messageType: messageData.messageType,
      hasAttachments: !!messageData.attachments,
      attachmentsCount: messageData.attachments?.length || 0
    });
    
    const response = await apiRequest('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData)
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
      
      // Clear file attachment and preview
      clearFilePreview();
      
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

// Global variable to store current file attachment
let currentFileAttachment = null;

// Attach file
function attachFile() {
  document.getElementById('fileInput').click();
}

// Handle file select
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    showError('File quá lớn. Kích thước tối đa là 10MB');
    event.target.value = '';
    return;
  }

  try {
    // Show file preview
    showFilePreview(file);
    
    // Upload file to server
    showNotification('Đang tải file lên...', 'info');
    
    const formData = new FormData();
    formData.append('attachment', file);

    // Get token for Authorization header
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    
    console.log('🔑 Upload file - Token check:', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenStart: token ? token.substring(0, 20) + '...' : 'N/A'
    });
    
    if (!token) {
      showError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
      clearFilePreview();
      setTimeout(() => {
        // Determine correct login path based on current page
        const currentPath = window.location.pathname;
        const loginPath = currentPath.includes('/student/') 
          ? '../../pages/auth/login.html'
          : currentPath.includes('/tutor/')
            ? '../../pages/auth/login.html'
            : '/frontend/pages/auth/login.html';
        window.location.href = loginPath;
      }, 2000);
      return;
    }

    // Use fetch directly for FormData upload (tokenManager doesn't handle FormData well)
    console.log('📤 Uploading file to:', `${API_BASE_URL}/messages/upload`);
    
    const response = await fetch(`${API_BASE_URL}/messages/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type - browser will set it with multipart boundary
      },
      body: formData
    });

    console.log('📥 Upload response status:', response.status);
    
    const data = await response.json();
    console.log('📥 Upload response data:', data);

    if (response.ok && data.success) {
      // Store file attachment data
      currentFileAttachment = {
        url: data.data.url,
        fileName: data.data.fileName,
        fileType: data.data.fileType,
        fileSize: data.data.fileSize,
        messageType: data.data.messageType
      };

      showNotification('File đã được tải lên thành công', 'success');
    } else {
      // Handle token expiration
      if (response.status === 401) {
        console.error('❌ Token expired or invalid');
        showError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        clearFilePreview();
        
        // Clear invalid token
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        
        setTimeout(() => {
          // Determine correct login path based on current page
          const currentPath = window.location.pathname;
          const loginPath = currentPath.includes('/student/') 
            ? '../../pages/auth/login.html'
            : currentPath.includes('/tutor/')
              ? '../../pages/auth/login.html'
              : '/frontend/pages/auth/login.html';
          window.location.href = loginPath;
        }, 2000);
        return;
      }
      
      showError(data.message || 'Không thể tải file lên');
      clearFilePreview();
    }
  } catch (error) {
    console.error('File upload error:', error);
    showError('Không thể tải file lên: ' + (error.message || 'Lỗi không xác định'));
    clearFilePreview();
  } finally {
    // Clear file input
    event.target.value = '';
  }
}

// Show file preview
function showFilePreview(file) {
  const previewContainer = document.getElementById('filePreviewContainer');
  const previewContent = document.getElementById('filePreviewContent');
  
  previewContainer.style.display = 'block';
  
  if (file.type.startsWith('image/')) {
    // Image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      previewContent.innerHTML = `
        <div class="file-preview-image">
          <img src="${e.target.result}" alt="${escapeHtml(file.name)}">
          <p class="file-preview-name">${escapeHtml(file.name)}</p>
        </div>
      `;
    };
    reader.readAsDataURL(file);
  } else {
    // File icon and name preview
    const fileIcon = getFileIcon(file.type, file.name);
    const fileSize = formatFileSize(file.size);
    
    previewContent.innerHTML = `
      <div class="file-preview-file">
        <i class="fas ${fileIcon} file-preview-icon"></i>
        <div class="file-preview-info">
          <p class="file-preview-name">${escapeHtml(file.name)}</p>
          <p class="file-preview-size">${fileSize}</p>
        </div>
      </div>
    `;
  }
}

// Clear file preview
function clearFilePreview() {
  const previewContainer = document.getElementById('filePreviewContainer');
  const previewContent = document.getElementById('filePreviewContent');
  
  previewContainer.style.display = 'none';
  previewContent.innerHTML = '';
  currentFileAttachment = null;
  
  // Clear file input
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.value = '';
  }
}

// Get file icon based on type
function getFileIcon(mimeType, fileName) {
  if (mimeType.startsWith('image/')) return 'fa-image';
  if (mimeType.startsWith('video/')) return 'fa-video';
  if (mimeType.startsWith('audio/')) return 'fa-music';
  if (mimeType.includes('pdf')) return 'fa-file-pdf';
  if (mimeType.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'fa-file-word';
  if (mimeType.includes('text') || fileName.endsWith('.txt')) return 'fa-file-alt';
  if (fileName.endsWith('.py')) return 'fa-file-code';
  if (fileName.endsWith('.cpp') || fileName.endsWith('.c') || fileName.endsWith('.java') || fileName.endsWith('.js')) return 'fa-file-code';
  if (fileName.endsWith('.html')) return 'fa-file-code';
  return 'fa-file';
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ===== IMAGE LIGHTBOX FUNCTIONS =====

/**
 * Open image in lightbox modal
 * @param {string} imageUrl - URL of the image
 * @param {string} caption - Image caption/filename
 */
function openImageLightbox(imageUrl, caption) {
  const lightbox = document.getElementById('imageLightbox');
  const lightboxImg = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  
  if (lightbox && lightboxImg) {
    lightboxImg.src = imageUrl;
    lightboxCaption.textContent = caption || '';
    lightbox.style.display = 'flex';
    
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';
    
    console.log('📸 Opened image lightbox:', imageUrl);
  }
}

/**
 * Close image lightbox
 */
function closeImageLightbox() {
  const lightbox = document.getElementById('imageLightbox');
  const lightboxImg = document.getElementById('lightboxImage');
  
  if (lightbox) {
    lightbox.style.display = 'none';
    
    // Restore body scroll
    document.body.style.overflow = 'auto';
    
    // Clear image src to free memory
    if (lightboxImg) {
      lightboxImg.src = '';
    }
    
    console.log('✖️ Closed image lightbox');
  }
}

// ===== FILE DOWNLOAD FUNCTION =====

/**
 * Handle file download
 * @param {Event} event - Click event
 * @param {string} fileUrl - URL of the file
 * @param {string} fileName - Name of the file
 */
async function handleFileDownload(event, fileUrl, fileName) {
  event.preventDefault();
  
  console.log('📥 Downloading file:', fileName);
  
  // For Cloudinary URLs, use backend proxy
  if (fileUrl.includes('cloudinary.com')) {
    try {
      // Try direct download first (for new public files)
      console.log('🔗 Attempting direct download from:', fileUrl);
      const directResponse = await fetch(fileUrl, {
        method: 'GET',
        mode: 'cors'
      });

      // If 401/403, use backend proxy (for old private files)
      if (directResponse.status === 401 || directResponse.status === 403) {
        console.warn('⚠️ 401/403 error, using backend proxy...');
        
        // Use backend proxy to download file
        const proxyUrl = `${API_BASE_URL}/messages/download-proxy?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(fileName)}`;
        
        console.log('🔄 Downloading via proxy:', proxyUrl);
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error(`Proxy download failed: ${response.status}`);
        }

        const blob = await response.blob();
        downloadBlob(blob, fileName);
        showNotification('Đang tải file xuống...', 'info');
        return;
      }

      // If direct download works, use it
      if (directResponse.ok) {
        const blob = await directResponse.blob();
        downloadBlob(blob, fileName);
        showNotification('Đang tải file xuống...', 'info');
      } else {
        throw new Error(`HTTP error! status: ${directResponse.status}`);
      }

    } catch (error) {
      console.error('❌ Download error:', error);
      
      // Final fallback: try proxy anyway
      try {
        console.warn('⚠️ Trying backend proxy as fallback...');
        const proxyUrl = `${API_BASE_URL}/messages/download-proxy?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(fileName)}`;
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const blob = await response.blob();
          downloadBlob(blob, fileName);
          showNotification('Đang tải file xuống...', 'info');
          return;
        }
      } catch (proxyError) {
        console.error('❌ Proxy fallback failed:', proxyError);
      }
      
      // Last resort: open in new tab
      console.warn('⚠️ All methods failed, opening in new tab');
      window.open(fileUrl, '_blank');
      showNotification('Mở file trong tab mới', 'warning');
    }
  } else {
    // For non-Cloudinary URLs, use direct download
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Đang tải file xuống...', 'info');
  }
}

/**
 * Helper function to download blob as file
 */
function downloadBlob(blob, fileName) {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up blob URL after a short delay
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
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

// ========== WEBRTC VIDEO/AUDIO CALL FUNCTIONALITY ==========

let webrtcService = null;
let callDurationInterval = null;
let callStartTime = null;
let incomingCallData = null;

// Initialize WebRTC service
function initializeWebRTC() {
  if (!WebRTCService.isSupported()) {
    console.error('❌ WebRTC is not supported in this browser');
    showNotification('Trình duyệt của bạn không hỗ trợ gọi điện', 'error');
    return false;
  }

  // Wait for socket to be available
  if (!messageSocket || !messageSocket.socket) {
    console.error('❌ Socket not initialized');
    return false;
  }

  webrtcService = new WebRTCService(messageSocket.socket);

  // Setup callbacks
  webrtcService.onLocalStream = (stream) => {
    const localVideo = document.getElementById('localVideo');
    if (localVideo) {
      localVideo.srcObject = stream;
      // Local video is always muted to prevent echo
      localVideo.muted = true;
      
      // Force position to top-right corner (default)
      localVideo.style.position = 'absolute';
      localVideo.style.top = '20px';
      localVideo.style.right = '20px';
      localVideo.style.left = 'auto';
      localVideo.style.bottom = 'auto';
      
      console.log('✅ Local stream set');
      console.log('   Audio tracks:', stream.getAudioTracks().length);
      console.log('   Video tracks:', stream.getVideoTracks().length);
      
      // Debug: Check if audio tracks are enabled
      stream.getAudioTracks().forEach((track, index) => {
        console.log(`   Audio track ${index}:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        });
      });
      
      // Make local video draggable after position is set
      setTimeout(() => makeLocalVideoDraggable(), 200);
    }
  };

  webrtcService.onRemoteStream = (stream) => {
    // CRITICAL: Stop ringtone immediately when remote stream arrives
    stopRingtone();
    console.log('🔕 Remote stream received, stopping all ringtones');
    
    const remoteVideo = document.getElementById('remoteVideo');
    if (remoteVideo) {
      remoteVideo.srcObject = stream;
      
      // CRITICAL: Enable audio playback
      remoteVideo.volume = 1.0;
      remoteVideo.muted = false;
      
      // Ensure video plays with audio
      remoteVideo.play().catch(err => {
        console.warn('Auto-play prevented, trying with user interaction:', err);
      });
      
      console.log('✅ Remote stream set with audio enabled');
      console.log('   Audio tracks:', stream.getAudioTracks().length);
      console.log('   Video tracks:', stream.getVideoTracks().length);
      
      // Debug: Check if audio tracks are enabled
      stream.getAudioTracks().forEach((track, index) => {
        console.log(`   Audio track ${index}:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        });
      });
    }
  };

  webrtcService.onCallEnded = () => {
    hideCallModal();
    stopCallDuration();
    showNotification('Cuộc gọi đã kết thúc', 'info');
  };

  webrtcService.onError = (error) => {
    console.error('WebRTC Error:', error);
    showNotification(error, 'error');
  };

  webrtcService.onStateChange = (state) => {
    console.log('Call state changed:', state);
    
    // Stop ringtone when call is connected
    if (state === 'connected') {
      stopRingtone();
      console.log('🔕 Call connected, ensuring ringtones stopped');
    }
  };

  console.log('✅ WebRTC service initialized');
  return true;
}

// Initiate a call (audio or video)
async function initiateCall(callType) {
  if (!currentRecipient) {
    showNotification('Vui lòng chọn người nhận', 'error');
    return;
  }

  // Check socket connection
  if (!messageSocket || !messageSocket.socket || !messageSocket.connected) {
    showNotification('Không có kết nối. Vui lòng tải lại trang.', 'error');
    console.error('❌ Socket not connected');
    return;
  }

  console.log('📞 Initiating call to:', currentRecipient);
  console.log('📞 Socket ID:', messageSocket.socket.id);
  console.log('📞 Socket connected:', messageSocket.connected);

  // Initialize WebRTC if not already done
  if (!webrtcService) {
    if (!initializeWebRTC()) {
      showNotification('Không thể khởi tạo WebRTC', 'error');
      return;
    }
  }

  try {
    // Show outgoing call UI
    showOutgoingCall(currentRecipient, callType);
    
    // Play ringback tone for outgoing call
    playRingback();

    // Start the call
    await webrtcService.startCall(currentRecipient._id, callType);
    
    console.log('✅ Call initiated successfully');
    
    // Set a timeout to handle no response (30 seconds)
    setTimeout(() => {
      // Check if still in outgoing state (not connected yet)
      const outgoingCall = document.getElementById('outgoingCall');
      if (outgoingCall && outgoingCall.style.display === 'block') {
        console.log('⏰ Call timeout - no response');
        stopRingtone(); // Stop ringback tone
        hideCallModal();
        showNotification('Không có phản hồi. Người dùng có thể đang bận.', 'warning');
        
        if (webrtcService) {
          webrtcService.endCall();
        }
        
        // Add missed call history
        addCallHistoryMessage('missed', true);
      }
    }, 30000); // 30 seconds timeout
    
  } catch (error) {
    console.error('❌ Error initiating call:', error);
    stopRingtone(); // Stop ringback tone
    hideCallModal();
    
    // Better error messages
    let errorMsg = 'Không thể bắt đầu cuộc gọi';
    if (error.message.includes('offline')) {
      errorMsg = 'Người dùng không trực tuyến. Vui lòng thử lại sau.';
    } else if (error.message.includes('camera')) {
      errorMsg = 'Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.';
    } else if (error.message.includes('microphone')) {
      errorMsg = 'Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.';
    }
    
    showNotification(errorMsg, 'error');
  }
}

// Handle incoming call
function handleIncomingCall(data) {
  console.log('📞 Received incoming call data:', data);
  console.log('  - callerId:', data.callerId);
  console.log('  - callerName:', data.callerName);
  console.log('  - callerAvatar:', data.callerAvatar);
  console.log('  - callerRole:', data.callerRole);
  console.log('  - callType:', data.callType);
  
  incomingCallData = data;
  
  // Show incoming call UI
  showIncomingCall(data);
  
  // Play ringtone (optional)
  playRingtone();
}

// Accept incoming call
async function acceptIncomingCall() {
  if (!incomingCallData) return;

  if (!webrtcService) {
    if (!initializeWebRTC()) return;
  }

  try {
    const { callerId, offer, callType, callerName, callerAvatar } = incomingCallData;
    
    console.log('📞 Accepting call from:', {
      callerId,
      callerName,
      callerAvatar,
      callType,
      fullData: incomingCallData
    });
    
    // Stop ringtone
    stopRingtone();
    
    // Hide incoming call, show active call
    document.getElementById('incomingCall').style.display = 'none';
    document.getElementById('activeCall').style.display = 'block';
    
    // Update active call info with caller details
    const activeCallName = document.getElementById('activeCallName');
    const activeCallAvatar = document.getElementById('activeCallAvatar');
    
    if (activeCallName) {
      activeCallName.textContent = callerName || incomingCallData.callerName || 'Unknown User';
      console.log('✅ Set active call name:', activeCallName.textContent);
    }
    
    if (activeCallAvatar) {
      const avatarUrl = callerAvatar || incomingCallData.callerAvatar || 
        `https://ui-avatars.com/api/?name=${encodeURIComponent(callerName || incomingCallData.callerName || 'User')}`;
      activeCallAvatar.src = avatarUrl;
      console.log('✅ Set active call avatar:', avatarUrl);
    }
    
    // Show/hide video button based on call type
    document.getElementById('toggleVideoBtn').style.display = callType === 'video' ? 'block' : 'none';
    
    // Answer the call
    await webrtcService.answerCall(callerId, offer, callType);
    
    // Start call duration counter
    startCallDuration();
    
  } catch (error) {
    console.error('Error accepting call:', error);
    hideCallModal();
    showNotification('Không thể trả lời cuộc gọi: ' + error.message, 'error');
  }
}

// Reject incoming call
function rejectIncomingCall() {
  if (!incomingCallData) return;

  if (webrtcService) {
    webrtcService.rejectCall(incomingCallData.callerId, 'Cuộc gọi bị từ chối');
  }

  hideCallModal();
  stopRingtone();
  
  // Add call history message
  addCallHistoryMessage('rejected', true);
  
  incomingCallData = null;
}

// End call
function endCall() {
  const hadConnection = callStartTime !== null;
  
  // Stop any playing audio
  stopRingtone();
  
  if (webrtcService) {
    webrtcService.endCall();
  }
  hideCallModal();
  stopCallDuration();
  
  // Add call history message if call was connected
  if (hadConnection) {
    addCallHistoryMessage('ended', true);
  } else {
    // Call was cancelled before connecting
    addCallHistoryMessage('cancelled', true);
  }
}

// Toggle audio mute
function toggleAudio() {
  if (!webrtcService) return;

  const isEnabled = webrtcService.toggleAudio();
  const btn = document.getElementById('toggleAudioBtn');
  const icon = btn.querySelector('i');
  
  if (isEnabled) {
    icon.className = 'fas fa-microphone';
    btn.classList.remove('muted');
  } else {
    icon.className = 'fas fa-microphone-slash';
    btn.classList.add('muted');
  }
}

// Toggle video
function toggleVideo() {
  if (!webrtcService) return;

  const isEnabled = webrtcService.toggleVideo();
  const btn = document.getElementById('toggleVideoBtn');
  const icon = btn.querySelector('i');
  
  if (isEnabled) {
    icon.className = 'fas fa-video';
    btn.classList.remove('muted');
  } else {
    icon.className = 'fas fa-video-slash';
    btn.classList.add('muted');
  }
}

// Show outgoing call UI
function showOutgoingCall(recipient, callType) {
  const callModal = document.getElementById('callModal');
  const outgoingCall = document.getElementById('outgoingCall');
  
  document.getElementById('outgoingRecipientName').textContent = recipient.name;
  document.getElementById('outgoingRecipientAvatar').src = recipient.avatar || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(recipient.name)}`;
  
  callModal.style.display = 'flex';
  document.getElementById('incomingCall').style.display = 'none';
  document.getElementById('activeCall').style.display = 'none';
  outgoingCall.style.display = 'block';
}

// Show incoming call UI
function showIncomingCall(data) {
  const callModal = document.getElementById('callModal');
  const incomingCall = document.getElementById('incomingCall');
  
  console.log('🎨 showIncomingCall called with data:', data);
  console.log('  - callerName:', data.callerName);
  console.log('  - callerAvatar:', data.callerAvatar);
  
  // Set incoming call modal info
  document.getElementById('incomingCallerName').textContent = data.callerName || 'Unknown User';
  document.getElementById('incomingCallerAvatar').src = data.callerAvatar || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(data.callerName || 'User')}`;
  document.getElementById('incomingCallType').textContent = 
    data.callType === 'video' ? 'Cuộc gọi video đến...' : 'Cuộc gọi thoại đến...';
  
  // CRITICAL FIX: Pre-set active call info NOW (before accepting)
  // This ensures info is ready when we switch to active call modal
  const activeCallName = document.getElementById('activeCallName');
  const activeCallAvatar = document.getElementById('activeCallAvatar');
  
  if (activeCallName) {
    activeCallName.textContent = data.callerName || 'Unknown User';
    console.log('✅ Pre-set activeCallName:', activeCallName.textContent);
  } else {
    console.error('❌ activeCallName element not found!');
  }
  
  if (activeCallAvatar) {
    const avatarUrl = data.callerAvatar || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(data.callerName || 'User')}`;
    activeCallAvatar.src = avatarUrl;
    console.log('✅ Pre-set activeCallAvatar:', avatarUrl);
  } else {
    console.error('❌ activeCallAvatar element not found!');
  }
  
  callModal.style.display = 'flex';
  document.getElementById('outgoingCall').style.display = 'none';
  document.getElementById('activeCall').style.display = 'none';
  incomingCall.style.display = 'block';
}

// Hide call modal
function hideCallModal() {
  const callModal = document.getElementById('callModal');
  callModal.style.display = 'none';
  document.getElementById('incomingCall').style.display = 'none';
  document.getElementById('outgoingCall').style.display = 'none';
  document.getElementById('activeCall').style.display = 'none';
  
  // Reset video elements
  const localVideo = document.getElementById('localVideo');
  const remoteVideo = document.getElementById('remoteVideo');
  if (localVideo) {
    localVideo.srcObject = null;
    // Reset position to default (top-right corner)
    localVideo.style.left = 'auto';
    localVideo.style.top = '20px';
    localVideo.style.right = '20px';
    localVideo.style.bottom = 'auto';
  }
  if (remoteVideo) remoteVideo.srcObject = null;
}

// Start call duration counter
function startCallDuration() {
  callStartTime = Date.now();
  callDurationInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    
    const durationEl = document.getElementById('callDuration');
    if (durationEl) {
      durationEl.textContent = `${minutes}:${seconds}`;
    }
  }, 1000);
}

// Stop call duration counter
function stopCallDuration() {
  if (callDurationInterval) {
    clearInterval(callDurationInterval);
    callDurationInterval = null;
  }
  callStartTime = null;
}

// Ringtone functions (optional - can be enhanced with actual audio)
// Audio Management for Calls
let ringtoneAudio = null; // For incoming calls
let ringbackAudio = null; // For outgoing calls
let audioContext = null;
let oscillator = null;
let gainNode = null;

// Initialize audio elements
function initializeCallAudio() {
  try {
    // Use relative path from pages/student or pages/tutor
    const audioBasePath = '../../assets/audio';
    
    // Ringtone for incoming calls
    ringtoneAudio = new Audio(`${audioBasePath}/ringtone.mp3`);
    ringtoneAudio.loop = true;
    ringtoneAudio.volume = 0.5;
    
    // Add error handler
    ringtoneAudio.addEventListener('error', (e) => {
      console.error('❌ Ringtone audio failed to load:', e);
      console.error('  - Attempted path:', ringtoneAudio.src);
    });
    
    // Ringback for outgoing calls
    ringbackAudio = new Audio(`${audioBasePath}/ringback.mp3`);
    ringbackAudio.loop = true;
    ringbackAudio.volume = 0.3;
    
    // Add error handler
    ringbackAudio.addEventListener('error', (e) => {
      console.error('❌ Ringback audio failed to load:', e);
      console.error('  - Attempted path:', ringbackAudio.src);
    });
    
    console.log('✅ Call audio initialized');
    console.log('  - Ringtone path:', ringtoneAudio.src);
    console.log('  - Ringback path:', ringbackAudio.src);
  } catch (error) {
    console.error('⚠️ Could not initialize audio files:', error);
  }
}

// Play ringtone for incoming call
function playRingtone() {
  try {
    console.log('🔔 playRingtone() called');
    stopRingtone(); // Stop any existing ringtone
    
    if (ringtoneAudio) {
      console.log('  - Using HTML5 Audio ringtone');
      ringtoneAudio.currentTime = 0;
      ringtoneAudio.play().then(() => {
        console.log('✅ Ringtone playing via HTML5 Audio');
      }).catch(err => {
        console.warn('❌ Failed to play ringtone, using Web Audio fallback:', err);
        playRingtoneWithWebAudio();
      });
    } else {
      console.log('  - ringtoneAudio not initialized, using Web Audio');
      playRingtoneWithWebAudio();
    }
  } catch (error) {
    console.error('Error playing ringtone:', error);
  }
}

// Stop ringtone
function stopRingtone() {
  try {
    console.log('🔕 Stopping ringtone... (checking all audio sources)');
    
    // Stop HTML5 Audio elements
    if (ringtoneAudio) {
      console.log('  - Stopping ringtoneAudio:', {
        paused: ringtoneAudio.paused,
        currentTime: ringtoneAudio.currentTime,
        src: ringtoneAudio.src
      });
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
      ringtoneAudio.volume = 0; // FORCE mute
      ringtoneAudio.src = ''; // CLEAR source
      try {
        ringtoneAudio.load(); // Force reload to reset state
      } catch (e) {
        console.warn('Could not reload ringtoneAudio:', e);
      }
    }
    
    if (ringbackAudio) {
      console.log('  - Stopping ringbackAudio:', {
        paused: ringbackAudio.paused,
        currentTime: ringbackAudio.currentTime,
        src: ringbackAudio.src
      });
      ringbackAudio.pause();
      ringbackAudio.currentTime = 0;
      ringbackAudio.volume = 0; // FORCE mute
      ringbackAudio.src = ''; // CLEAR source
      try {
        ringbackAudio.load(); // Force reload to reset state
      } catch (e) {
        console.warn('Could not reload ringbackAudio:', e);
      }
    }
    
    // Stop Web Audio API oscillators
    stopWebAudioTone();
    
    // CRITICAL: Close AudioContext completely
    if (audioContext) {
      console.log('  - AudioContext state:', audioContext.state);
      if (audioContext.state === 'running') {
        console.log('  - Suspending AudioContext');
        audioContext.suspend().catch(err => {
          console.warn('Could not suspend AudioContext:', err);
        });
      }
      // Try to close it completely
      if (audioContext.state !== 'closed') {
        console.log('  - Attempting to close AudioContext');
        audioContext.close().then(() => {
          console.log('  - AudioContext closed');
          audioContext = null; // Clear reference
        }).catch(err => {
          console.warn('Could not close AudioContext:', err);
        });
      }
    }
    
    console.log('✅ All ringtones stopped');
    
    // Verify after 100ms
    setTimeout(() => {
      console.log('🔍 Verifying audio stopped...');
      if (ringtoneAudio && !ringtoneAudio.paused) {
        console.error('⚠️ WARNING: ringtoneAudio still playing!');
        ringtoneAudio.pause();
      }
      if (ringbackAudio && !ringbackAudio.paused) {
        console.error('⚠️ WARNING: ringbackAudio still playing!');
        ringbackAudio.pause();
      }
      if (audioContext && audioContext.state === 'running') {
        console.error('⚠️ WARNING: AudioContext still running!');
      }
    }, 100);
  } catch (error) {
    console.error('❌ Error stopping ringtone:', error);
  }
}

// Play ringback for outgoing call
function playRingback() {
  try {
    stopRingtone(); // Stop any existing audio
    
    if (ringbackAudio) {
      ringbackAudio.currentTime = 0;
      ringbackAudio.play().catch(err => {
        console.warn('Failed to play ringback, using fallback:', err);
        playRingbackWithWebAudio();
      });
      console.log('� Playing ringback tone...');
    } else {
      playRingbackWithWebAudio();
    }
  } catch (error) {
    console.error('Error playing ringback:', error);
  }
}

// Web Audio API fallback for ringtone (incoming)
function playRingtoneWithWebAudio() {
  try {
    console.log('🔊 playRingtoneWithWebAudio() called (fallback)');
    
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('  - Created new AudioContext');
    }
    
    stopWebAudioTone();
    console.log('  - Creating oscillator for ringtone');
    
    // Create oscillator for ringtone (double beep pattern)
    oscillator = audioContext.createOscillator();
    gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 480; // Hz
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    
    // Create beep pattern
    const now = audioContext.currentTime;
    oscillator.start(now);
    
    // Pattern: beep-beep-pause-repeat
    let time = now;
    const beepDuration = 0.2;
    const pauseDuration = 0.2;
    const longPause = 1.0;
    
    function scheduleBeeps() {
      // Two short beeps
      gainNode.gain.setValueAtTime(0.3, time);
      gainNode.gain.setValueAtTime(0, time + beepDuration);
      time += beepDuration + pauseDuration;
      
      gainNode.gain.setValueAtTime(0.3, time);
      gainNode.gain.setValueAtTime(0, time + beepDuration);
      time += beepDuration + longPause;
      
      // Repeat every 1.6 seconds
      setTimeout(scheduleBeeps, 1600);
    }
    
    scheduleBeeps();
    
  } catch (error) {
    console.error('Error with Web Audio API:', error);
  }
}

// Web Audio API fallback for ringback (outgoing)
function playRingbackWithWebAudio() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    stopWebAudioTone();
    
    // Create oscillator for ringback (single beep pattern)
    oscillator = audioContext.createOscillator();
    gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 440; // Hz (A note)
    oscillator.type = 'sine';
    gainNode.gain.value = 0.2;
    
    // Create beep pattern
    const now = audioContext.currentTime;
    oscillator.start(now);
    
    // Pattern: beep-pause-repeat (like traditional ringback)
    let time = now;
    const beepDuration = 0.4;
    const pauseDuration = 2.0;
    
    function scheduleRingback() {
      gainNode.gain.setValueAtTime(0.2, time);
      gainNode.gain.setValueAtTime(0, time + beepDuration);
      time += beepDuration + pauseDuration;
      
      // Repeat every 2.4 seconds
      setTimeout(scheduleRingback, 2400);
    }
    
    scheduleRingback();
    
  } catch (error) {
    console.error('Error with Web Audio API:', error);
  }
}

// Stop Web Audio API tone
function stopWebAudioTone() {
  try {
    if (oscillator) {
      console.log('  - Stopping Web Audio oscillator');
      try {
        oscillator.stop();
      } catch (e) {
        // Already stopped
      }
      try {
        oscillator.disconnect();
      } catch (e) {
        // Already disconnected
      }
      oscillator = null;
    }
    
    if (gainNode) {
      console.log('  - Disconnecting gainNode');
      try {
        gainNode.disconnect();
      } catch (e) {
        // Already disconnected
      }
      gainNode = null;
    }
    
    console.log('  - Web Audio tone stopped');
  } catch (error) {
    console.warn('Error in stopWebAudioTone:', error);
  }
}

// Debug: Check what audio is currently playing
function checkAudioStatus() {
  console.log('🔍 Checking audio status...');
  
  if (ringtoneAudio) {
    console.log('  📱 Ringtone:', {
      paused: ringtoneAudio.paused,
      currentTime: ringtoneAudio.currentTime,
      volume: ringtoneAudio.volume,
      muted: ringtoneAudio.muted,
      src: ringtoneAudio.src,
      readyState: ringtoneAudio.readyState
    });
  }
  
  if (ringbackAudio) {
    console.log('  📞 Ringback:', {
      paused: ringbackAudio.paused,
      currentTime: ringbackAudio.currentTime,
      volume: ringbackAudio.volume,
      muted: ringbackAudio.muted,
      src: ringbackAudio.src,
      readyState: ringbackAudio.readyState
    });
  }
  
  if (audioContext) {
    console.log('  🔊 AudioContext:', {
      state: audioContext.state,
      currentTime: audioContext.currentTime
    });
  }
  
  if (oscillator) {
    console.log('  🎵 Oscillator:', {
      exists: !!oscillator,
      type: oscillator?.type,
      frequency: oscillator?.frequency?.value
    });
  } else {
    console.log('  🎵 Oscillator: null');
  }
}

// Make it globally accessible for debugging
window.checkAudioStatus = checkAudioStatus;

// Add call history message to chat
function addCallHistoryMessage(status, isOutgoing) {
  if (!currentRecipient) return;
  
  const messagesArea = document.getElementById('messagesArea');
  if (!messagesArea) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message ' + (isOutgoing ? 'sent' : 'received');
  
  let icon = '';
  let text = '';
  let color = '';
  
  switch(status) {
    case 'rejected':
      icon = '📵';
      text = isOutgoing ? 'Cuộc gọi bị từ chối' : 'Đã từ chối cuộc gọi';
      color = '#ef4444';
      break;
    case 'cancelled':
      icon = '📞';
      text = 'Cuộc gọi đã hủy';
      color = '#f59e0b';
      break;
    case 'ended':
      icon = '📞';
      const duration = callStartTime ? formatCallDuration(Date.now() - callStartTime) : '00:00';
      text = `Cuộc gọi kết thúc • ${duration}`;
      color = '#10b981';
      break;
    case 'missed':
      icon = '📵';
      text = 'Cuộc gọi nhỡ';
      color = '#ef4444';
      break;
    default:
      icon = '📞';
      text = 'Cuộc gọi';
      color = '#667eea';
  }
  
  messageDiv.innerHTML = `
    <div class="message-content" style="background: rgba(102, 126, 234, 0.1); border-left: 3px solid ${color}; padding: 12px 16px; border-radius: 8px;">
      <div style="display: flex; align-items: center; gap: 8px; color: ${color}; font-weight: 500;">
        <span style="font-size: 18px;">${icon}</span>
        <span>${text}</span>
      </div>
      <div class="message-time" style="margin-top: 4px;">${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  `;
  
  messagesArea.appendChild(messageDiv);
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Format call duration
function formatCallDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// ========== DRAGGABLE LOCAL VIDEO ==========
// Make local video draggable with mouse
function makeLocalVideoDraggable() {
  const localVideo = document.getElementById('localVideo');
  if (!localVideo) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let offsetX = 0;
  let offsetY = 0;

  localVideo.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    if (e.target === localVideo) {
      isDragging = true;
      
      // Get current position
      const rect = localVideo.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      
      localVideo.classList.add('dragging');
      e.preventDefault();
    }
  }

  function drag(e) {
    if (!isDragging) return;
    
    e.preventDefault();

    const container = localVideo.parentElement;
    const containerRect = container.getBoundingClientRect();

    // Calculate new position relative to container
    let newLeft = e.clientX - containerRect.left - startX;
    let newTop = e.clientY - containerRect.top - startY;

    // Constrain within container boundaries
    const maxLeft = containerRect.width - localVideo.offsetWidth;
    const maxTop = containerRect.height - localVideo.offsetHeight;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    // Apply position
    localVideo.style.left = newLeft + 'px';
    localVideo.style.top = newTop + 'px';
    localVideo.style.right = 'auto';
    localVideo.style.bottom = 'auto';
  }

  function dragEnd(e) {
    if (isDragging) {
      isDragging = false;
      localVideo.classList.remove('dragging');
    }
  }
}

// Initialize draggable when local stream is set
function initializeLocalVideoDraggable() {
  // Wait for video element to be available
  const checkVideo = setInterval(() => {
    const localVideo = document.getElementById('localVideo');
    if (localVideo && localVideo.srcObject) {
      makeLocalVideoDraggable();
      clearInterval(checkVideo);
    }
  }, 500);

  // Clear check after 10 seconds to prevent memory leak
  setTimeout(() => clearInterval(checkVideo), 10000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
  }
  
  if (webrtcService) {
    webrtcService.destroy();
  }
  
  stopCallDuration();
});

// Keyboard support for lightbox (ESC to close)
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' || event.key === 'Esc') {
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox && lightbox.style.display === 'flex') {
      closeImageLightbox();
    }
  }
});

console.log('Messages page initialized');
