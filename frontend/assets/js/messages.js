// ===== MESSAGES PAGE JAVASCRIPT =====

const API_BASE_URL = 'http://localhost:5000/api';
let currentConversationId = null;
let currentRecipient = null;
let conversations = [];
let messages = [];
let messagePollingInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  checkAuthentication();
  await loadConversations();
  setupEventListeners();
  startMessagePolling();
  
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

// Check and open conversation from URL parameter
async function checkAndOpenConversation() {
  try {
    // Get recipientId from URL
    const urlParams = new URLSearchParams(window.location.search);
    const recipientId = urlParams.get('recipientId');
    
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
        // Fetch recipient info from API
        try {
          const response = await apiRequest(`/auth/tutor/${recipientId}`);
          if (response.success && response.data) {
            recipientInfo = {
              id: recipientId,
              name: response.data.profile?.fullName || response.data.name || 'Người dùng',
              avatar: response.data.profile?.avatar || response.data.avatar || '',
              role: response.data.role || 'tutor'
            };
            console.log('👤 Fetched recipient info from API:', recipientInfo);
          }
        } catch (error) {
          console.error('❌ Failed to fetch recipient info:', error);
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
        const noConversation = document.querySelector('.no-conversation');
        if (noConversation) {
          noConversation.style.display = 'none';
        }
        
        const activeConversation = document.getElementById('activeConversation');
        if (activeConversation) {
          activeConversation.style.display = 'flex';
        }
        
        // Update conversation header with recipient info (check if elements exist)
        const chatUserName = document.getElementById('chatUserName');
        const chatUserStatus = document.getElementById('chatUserStatus');
        
        if (chatUserName) {
          chatUserName.textContent = currentRecipient.name;
        }
        
        if (chatUserStatus) {
          chatUserStatus.textContent = currentRecipient.isOnline ? 'Đang hoạt động' : 'Không hoạt động';
          chatUserStatus.className = currentRecipient.isOnline ? 'user-status' : 'user-status offline';
        }
        
        // Load messages (will be empty for new conversation)
        await loadMessages(recipientId, true);
        
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
            `<img src="${userAvatar}" alt="${userName}">` : 
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
  
  if (emptyChat) emptyChat.style.display = 'none';
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
  
  // Mark as read
  await markAsRead(conversationId);
  
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
      scrollToBottom();
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
    const isSent = messageSenderId === currentUserId;
    
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
      scrollToBottom();
      
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

// Mark conversation as read
async function markAsRead(conversationId) {
  if (!currentRecipient?._id) return;
  
  try {
    // Find unread messages from current recipient
    const unreadMessages = messages.filter(
      msg => !msg.isRead && msg.senderId?._id === currentRecipient._id
    );
    
    if (unreadMessages.length === 0) return;
    
    // Mark each unread message as read using backend API: PUT /messages/:messageId/read
    for (const msg of unreadMessages) {
      await apiRequest(`/messages/${msg._id}/read`, {
        method: 'PUT'
      });
    }
    
    // Update UI
    const convoItem = document.querySelector(`.conversation-item[data-id="${conversationId}"]`);
    if (convoItem) {
      convoItem.classList.remove('unread');
      convoItem.querySelector('.unread-badge')?.remove();
    }
    
    updateUnreadBadge();
  } catch (error) {
    console.error('Error marking as read:', error);
  }
}

// Update recipient info in header
function updateRecipientInfo() {
  if (!currentRecipient) return;

  const chatUserName = document.getElementById('chatUserName');
  const chatUserStatus = document.getElementById('chatUserStatus');
  const profileUserName = document.getElementById('profileUserName');
  const profileUserRole = document.getElementById('profileUserRole');
  const profileUserEmail = document.getElementById('profileUserEmail');
  const profileUserPhone = document.getElementById('profileUserPhone');

  if (chatUserName) chatUserName.textContent = currentRecipient.name;
  if (chatUserStatus) {
    // Show online status or last seen time
    const statusText = getStatusText(currentRecipient);
    chatUserStatus.textContent = statusText;
    chatUserStatus.className = currentRecipient.isOnline ? 'user-status online' : 'user-status offline';
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
            messages = newMessages;
            renderMessages();
            scrollToBottom();
            playNotificationSound();
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

// Utility functions
function scrollToBottom() {
  const container = document.getElementById('messagesArea');
  if (container) {
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 100);
  }
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
  
  // Check if user is currently online
  if (user.isOnline) {
    return 'Đang hoạt động';
  }
  
  // Show last seen time if available
  if (user.lastSeen || user.lastLogin) {
    const lastSeenDate = new Date(user.lastSeen || user.lastLogin);
    const now = new Date();
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Hoạt động vừa xong';
    if (diffMins < 60) return `Hoạt động ${diffMins} phút trước`;
    if (diffHours < 24) return `Hoạt động ${diffHours} giờ trước`;
    if (diffDays === 1) return 'Hoạt động hôm qua';
    if (diffDays < 7) return `Hoạt động ${diffDays} ngày trước`;
    
    return 'Không hoạt động';
  }
  
  return 'Không hoạt động';
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

// API request helper
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  
  if (!token) {
    console.error('❌ No token available for API request');
    window.location.href = '../../index.html';
    throw new Error('Authentication required');
  }
  
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    },
    ...options
  };

  const response = await fetch(url, config);
  
  // Handle authentication errors
  if (response.status === 401 || response.status === 403) {
    console.error('❌ Authentication failed - redirecting to login');
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userData');
    window.location.href = '../../index.html';
    throw new Error('Authentication failed');
  }
  
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
  }
});

console.log('Messages page initialized');
