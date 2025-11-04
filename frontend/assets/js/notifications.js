// Notification System
// API_BASE_URL is defined in main.js and loaded before this script
const NOTIFICATION_API = `${API_BASE_URL.replace('/api', '')}/api/notifications`;
let notificationCheckInterval = null;

// Notification icon and color mapping
const notificationStyles = {
  booking_request: { icon: 'fa-calendar-plus', color: '#667eea' },
  booking_accepted: { icon: 'fa-check-circle', color: '#48bb78' },
  booking_rejected: { icon: 'fa-times-circle', color: '#f56565' },
  booking_completed: { icon: 'fa-graduation-cap', color: '#48bb78' },
  booking_cancelled: { icon: 'fa-ban', color: '#f56565' },
  blog_approved: { icon: 'fa-check-circle', color: '#48bb78' },
  blog_rejected: { icon: 'fa-times-circle', color: '#f56565' },
  blog_comment: { icon: 'fa-comment', color: '#4299e1' },
  message_received: { icon: 'fa-envelope', color: '#4299e1' },
  profile_approved: { icon: 'fa-user-check', color: '#48bb78' },
  profile_rejected: { icon: 'fa-user-times', color: '#f56565' },
  system: { icon: 'fa-info-circle', color: '#a0aec0' }
};

/**
 * Initialize notification system
 */
function initNotifications() {
  console.log('🔔 Initializing notification system...');
  
  // Check if user is logged in
  const token = getToken();
  if (!token) {
    console.log('⚠️ No token found, skipping notification initialization');
    return;
  }

  // Update badge count initially (don't load notifications until panel is opened)
  updateNotificationBadge();

  // Set up notification button click handler
  const notificationBtn = document.querySelector('.notification-btn');
  if (notificationBtn) {
    notificationBtn.addEventListener('click', toggleNotificationPanel);
  }

  // Check for new notifications every 30 seconds
  notificationCheckInterval = setInterval(() => {
    updateNotificationBadge();
  }, 30000);

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notificationPanel');
    const btn = document.querySelector('.notification-btn');
    if (panel && !panel.contains(e.target) && !btn.contains(e.target)) {
      closeNotificationPanel();
    }
  });

  console.log('✅ Notification system initialized');
}

/**
 * Load notifications from API
 */
async function loadNotifications(limit = 4) {
  console.log('🔔 loadNotifications called with limit:', limit);
  const token = getToken();
  if (!token) {
    console.log('❌ No token found');
    return;
  }

  try {
    console.log('📡 Fetching notifications from API...');
    const response = await fetch(`${NOTIFICATION_API}?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      throw new Error('Failed to load notifications');
    }

    const data = await response.json();
    console.log('📦 API Response:', data);
    
    if (data.success) {
      console.log('✅ Notifications loaded:', data.data.notifications.length);
      updateNotificationBadge(data.data.unreadCount);
      renderNotifications(data.data.notifications, data.data.total);
    } else {
      console.log('❌ API returned success:false');
    }
  } catch (error) {
    console.error('❌ Load notifications error:', error);
    // Show error in panel
    const container = document.getElementById('notificationPanelBody');
    if (container) {
      container.innerHTML = `
        <div class="notification-error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Lỗi tải thông báo</p>
        </div>
      `;
    }
  }
}

/**
 * Update notification badge count
 */
async function updateNotificationBadge(count = null) {
  const badge = document.getElementById('notificationBadge');
  if (!badge) return;

  if (count === null) {
    // Fetch count from API
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${NOTIFICATION_API}/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          count = data.data.count;
        }
      }
    } catch (error) {
      console.error('❌ Update badge error:', error);
      return;
    }
  }

  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

/**
 * Toggle notification panel
 */
async function toggleNotificationPanel(e) {
  if (e) e.stopPropagation();
  
  let panel = document.getElementById('notificationPanel');
  
  if (panel) {
    // Panel exists, toggle visibility
    if (panel.classList.contains('show')) {
      closeNotificationPanel();
    } else {
      panel.classList.add('show');
      await loadNotifications(); // Refresh notifications
    }
  } else {
    // Create panel first, then load notifications
    createNotificationPanel();
    
    // Wait for DOM update
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Now load notifications
    await loadNotifications();
  }
}

/**
 * Create notification panel
 */
function createNotificationPanel() {
  console.log('🎨 Creating notification panel');
  const panel = document.createElement('div');
  panel.id = 'notificationPanel';
  panel.className = 'notification-panel show';
  panel.innerHTML = `
    <div class="notification-panel-header">
      <h3><i class="fas fa-bell"></i> Thông Báo</h3>
      <button class="btn-text" onclick="markAllAsRead()">
        <i class="fas fa-check-double"></i>
        Đánh dấu tất cả đã đọc
      </button>
    </div>
    <div class="notification-panel-body" id="notificationPanelBody">
      <div class="notification-loading">
        <div class="spinner"></div>
        <p>Đang tải thông báo...</p>
      </div>
    </div>
    <div class="notification-panel-footer">
      <button class="btn-text" onclick="showAllNotificationsModal()">
        <i class="fas fa-list"></i>
        Xem tất cả thông báo
      </button>
    </div>
  `;

  const headerActions = document.querySelector('.header-actions');
  if (headerActions) {
    headerActions.appendChild(panel);
    console.log('✅ Panel appended to header-actions');
  } else {
    console.error('❌ .header-actions not found!');
  }
  // Don't call loadNotifications here - will be called by toggleNotificationPanel
}

/**
 * Close notification panel
 */
function closeNotificationPanel() {
  const panel = document.getElementById('notificationPanel');
  if (panel) {
    panel.classList.remove('show');
  }
}

/**
 * Render notifications in panel
 */
function renderNotifications(notifications, totalCount = 0) {
  console.log('🎨 renderNotifications called:', {
    count: notifications.length,
    total: totalCount
  });
  
  const container = document.getElementById('notificationPanelBody');
  if (!container) {
    console.log('❌ notificationPanelBody container not found!');
    return;
  }

  if (notifications.length === 0) {
    console.log('ℹ️  No notifications to display');
    container.innerHTML = `
      <div class="notification-empty">
        <i class="fas fa-bell-slash"></i>
        <p>Không có thông báo mới</p>
      </div>
    `;
    return;
  }

  console.log('✅ Rendering', notifications.length, 'notifications');
  console.log('📋 First notification:', notifications[0]);
  
  const notificationItems = notifications.map(notification => {
    const item = createNotificationItem(notification);
    console.log('🔨 Created item for:', notification.title);
    return item;
  });
  
  console.log('📝 Total HTML length:', notificationItems.join('').length);
  container.innerHTML = notificationItems.join('');
  
  console.log('✅ innerHTML set, container.children.length:', container.children.length);
  
  // Show "more" indicator if there are more notifications
  if (totalCount > notifications.length) {
    const moreDiv = document.createElement('div');
    moreDiv.className = 'notification-more-indicator';
    moreDiv.innerHTML = `
      <p>Còn ${totalCount - notifications.length} thông báo khác</p>
    `;
    container.appendChild(moreDiv);
    console.log('➕ Added "more" indicator');
  }
  
  console.log('✅ Render complete');
}

/**
 * Create notification item HTML
 */
function createNotificationItem(notification) {
  const style = notificationStyles[notification.type] || notificationStyles.system;
  const isUnread = !notification.isRead;
  const timeAgo = formatTimeAgo(notification.createdAt);

  return `
    <div class="notification-item ${isUnread ? 'unread' : ''}" 
         onclick="handleNotificationClick('${notification._id}', '${notification.link || '#'}')">
      <div class="notification-icon" style="background-color: ${style.color}20;">
        <i class="fas ${style.icon}" style="color: ${style.color};"></i>
      </div>
      <div class="notification-content">
        <h4>${notification.title}</h4>
        <p>${notification.message}</p>
        <span class="notification-time">
          <i class="fas fa-clock"></i>
          ${timeAgo}
        </span>
      </div>
      ${isUnread ? '<div class="notification-unread-dot"></div>' : ''}
      <button class="notification-delete" onclick="deleteNotification(event, '${notification._id}')">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
}

/**
 * Handle notification click
 */
async function handleNotificationClick(notificationId, link) {
  // Mark as read
  await markNotificationAsRead(notificationId);

  // Navigate to link if provided
  if (link && link !== '#') {
    window.location.href = link;
  }
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(notificationId) {
  const token = getToken();
  if (!token) return;

  try {
    const response = await fetch(`${NOTIFICATION_API}/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        updateNotificationBadge(data.data.unreadCount);
        loadNotifications(); // Refresh list
      }
    }
  } catch (error) {
    console.error('❌ Mark as read error:', error);
  }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead() {
  const token = getToken();
  if (!token) return;

  try {
    const response = await fetch(`${NOTIFICATION_API}/read-all`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        updateNotificationBadge(0);
        loadNotifications(); // Refresh list
      }
    }
  } catch (error) {
    console.error('❌ Mark all as read error:', error);
  }
}

/**
 * Delete notification
 */
async function deleteNotification(event, notificationId) {
  event.stopPropagation();
  
  const token = getToken();
  if (!token) return;

  try {
    const response = await fetch(`${NOTIFICATION_API}/${notificationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        updateNotificationBadge(data.data.unreadCount);
        loadNotifications(); // Refresh list
      }
    }
  } catch (error) {
    console.error('❌ Delete notification error:', error);
  }
}

/**
 * Format time ago
 */
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  const intervals = {
    'năm': 31536000,
    'tháng': 2592000,
    'tuần': 604800,
    'ngày': 86400,
    'giờ': 3600,
    'phút': 60,
    'giây': 1
  };

  for (const [name, secondsInInterval] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInInterval);
    if (interval >= 1) {
      return `${interval} ${name} trước`;
    }
  }

  return 'Vừa xong';
}

/**
 * Show all notifications modal
 */
async function showAllNotificationsModal() {
  // Close notification panel first
  closeNotificationPanel();
  
  // Create modal
  const modal = document.createElement('div');
  modal.id = 'allNotificationsModal';
  modal.className = 'all-notifications-modal show';
  modal.innerHTML = `
    <div class="all-notifications-modal-overlay" onclick="closeAllNotificationsModal()"></div>
    <div class="all-notifications-modal-content">
      <div class="all-notifications-modal-header">
        <h2><i class="fas fa-bell"></i> Tất Cả Thông Báo</h2>
        <div class="all-notifications-modal-actions">
          <button class="btn-secondary-sm" onclick="markAllAsRead()">
            <i class="fas fa-check-double"></i>
            Đánh dấu tất cả đã đọc
          </button>
          <button class="btn-close-modal" onclick="closeAllNotificationsModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <div class="all-notifications-filter-tabs">
        <button class="filter-tab active" data-filter="all" onclick="filterAllNotifications('all')">
          <i class="fas fa-list"></i>
          Tất cả
        </button>
        <button class="filter-tab" data-filter="unread" onclick="filterAllNotifications('unread')">
          <i class="fas fa-envelope"></i>
          Chưa đọc
        </button>
        <button class="filter-tab" data-filter="read" onclick="filterAllNotifications('read')">
          <i class="fas fa-envelope-open"></i>
          Đã đọc
        </button>
      </div>
      
      <div class="all-notifications-modal-body" id="allNotificationsBody">
        <div class="notification-loading">
          <div class="spinner"></div>
          <p>Đang tải thông báo...</p>
        </div>
      </div>
      
      <div class="all-notifications-modal-footer" id="allNotificationsPagination">
        <!-- Pagination will be rendered here -->
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
  
  // Load all notifications
  await loadAllNotifications();
}

/**
 * Close all notifications modal
 */
window.closeAllNotificationsModal = function() {
  const modal = document.getElementById('allNotificationsModal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
}

/**
 * Load all notifications with pagination
 */
let currentNotificationsPage = 1;
let currentNotificationsFilter = 'all';
let totalNotificationsPages = 1;

async function loadAllNotifications(page = 1) {
  const token = getToken();
  if (!token) return;
  
  currentNotificationsPage = page;
  
  const container = document.getElementById('allNotificationsBody');
  if (!container) return;
  
  container.innerHTML = `
    <div class="notification-loading">
      <div class="spinner"></div>
      <p>Đang tải thông báo...</p>
    </div>
  `;

  try {
    const unreadOnlyParam = currentNotificationsFilter === 'unread' ? '&unreadOnly=true' : '';
    const response = await fetch(`${NOTIFICATION_API}?page=${page}&limit=20${unreadOnlyParam}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load notifications');
    }

    const data = await response.json();
    if (data.success) {
      let notifications = data.data.notifications;
      
      // Filter by read status if needed
      if (currentNotificationsFilter === 'read') {
        notifications = notifications.filter(n => n.isRead);
      }
      
      totalNotificationsPages = data.data.pages;
      
      renderAllNotifications(notifications, data.data.total);
      renderAllNotificationsPagination(page, data.data.pages);
    }
  } catch (error) {
    console.error('❌ Load all notifications error:', error);
    container.innerHTML = `
      <div class="notification-error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Lỗi tải thông báo</p>
        <button class="btn-primary-sm" onclick="loadAllNotifications(${page})">
          <i class="fas fa-redo"></i>
          Thử lại
        </button>
      </div>
    `;
  }
}

/**
 * Render all notifications
 */
function renderAllNotifications(notifications, totalCount) {
  const container = document.getElementById('allNotificationsBody');
  if (!container) return;

  if (notifications.length === 0) {
    container.innerHTML = `
      <div class="notification-empty">
        <i class="fas fa-bell-slash"></i>
        <h3>Không có thông báo</h3>
        <p>${currentNotificationsFilter === 'unread' ? 'Bạn đã đọc hết thông báo' : 'Chưa có thông báo nào'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="all-notifications-list">
      ${notifications.map(notification => createNotificationItem(notification, true)).join('')}
    </div>
  `;
}

/**
 * Render pagination for all notifications
 */
function renderAllNotificationsPagination(currentPage, totalPages) {
  const container = document.getElementById('allNotificationsPagination');
  if (!container || totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let paginationHTML = '<div class="pagination">';
  
  // Previous button
  if (currentPage > 1) {
    paginationHTML += `
      <button class="pagination-btn" onclick="loadAllNotifications(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
        Trước
      </button>
    `;
  }
  
  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  if (startPage > 1) {
    paginationHTML += `<button class="pagination-btn" onclick="loadAllNotifications(1)">1</button>`;
    if (startPage > 2) {
      paginationHTML += `<span class="pagination-ellipsis">...</span>`;
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
              onclick="loadAllNotifications(${i})">
        ${i}
      </button>
    `;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<span class="pagination-ellipsis">...</span>`;
    }
    paginationHTML += `<button class="pagination-btn" onclick="loadAllNotifications(${totalPages})">${totalPages}</button>`;
  }
  
  // Next button
  if (currentPage < totalPages) {
    paginationHTML += `
      <button class="pagination-btn" onclick="loadAllNotifications(${currentPage + 1})">
        Sau
        <i class="fas fa-chevron-right"></i>
      </button>
    `;
  }
  
  paginationHTML += '</div>';
  container.innerHTML = paginationHTML;
}

/**
 * Filter all notifications
 */
window.filterAllNotifications = async function(filter) {
  currentNotificationsFilter = filter;
  currentNotificationsPage = 1;
  
  // Update active tab
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.filter === filter) {
      tab.classList.add('active');
    }
  });
  
  await loadAllNotifications(1);
}

/**
 * Get token from localStorage
 */
function getToken() {
  return localStorage.getItem('accessToken') || localStorage.getItem('token');
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
  }
});

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNotifications);
} else {
  initNotifications();
}

/**
 * Inject CSS styles for all notifications modal
 */
(function injectModalStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* All Notifications Modal */
    .all-notifications-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    
    .all-notifications-modal.show {
      opacity: 1;
      pointer-events: all;
    }
    
    .all-notifications-modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
    }
    
    .all-notifications-modal-content {
      position: relative;
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 900px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: modalSlideIn 0.3s ease;
    }
    
    @keyframes modalSlideIn {
      from {
        transform: translateY(-30px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    .all-notifications-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 28px;
      border-bottom: 2px solid #f0f0f0;
      gap: 16px;
    }
    
    .all-notifications-modal-header h2 {
      margin: 0;
      font-size: 24px;
      color: #333;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .all-notifications-modal-header h2 i {
      color: #ff6b6b;
      font-size: 26px;
    }
    
    .all-notifications-modal-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .btn-secondary-sm {
      padding: 10px 16px;
      background: #f8f9fa;
      color: #495057;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }
    
    .btn-secondary-sm:hover {
      background: #e9ecef;
      border-color: #adb5bd;
    }
    
    .btn-close-modal {
      width: 40px;
      height: 40px;
      border: none;
      background: #f8f9fa;
      color: #495057;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: all 0.2s;
    }
    
    .btn-close-modal:hover {
      background: #ff6b6b;
      color: white;
    }
    
    .all-notifications-filter-tabs {
      display: flex;
      gap: 8px;
      padding: 16px 28px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
    }
    
    .filter-tab {
      padding: 10px 20px;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: #495057;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .filter-tab:hover {
      background: #e9ecef;
      border-color: #adb5bd;
    }
    
    .filter-tab.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: #667eea;
    }
    
    .all-notifications-modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px 28px;
    }
    
    .all-notifications-modal-body::-webkit-scrollbar {
      width: 8px;
    }
    
    .all-notifications-modal-body::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }
    
    .all-notifications-modal-body::-webkit-scrollbar-thumb {
      background: #cbd5e0;
      border-radius: 4px;
    }
    
    .all-notifications-modal-body::-webkit-scrollbar-thumb:hover {
      background: #a0aec0;
    }
    
    .all-notifications-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .notification-loading {
      text-align: center;
      padding: 60px 20px;
      color: #718096;
    }
    
    .notification-loading .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #e2e8f0;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .notification-loading p {
      margin: 0;
      font-size: 16px;
    }
    
    .notification-empty {
      text-align: center;
      padding: 80px 20px;
      color: #a0aec0;
    }
    
    .notification-empty i {
      font-size: 64px;
      color: #cbd5e0;
      margin-bottom: 20px;
    }
    
    .notification-empty h3 {
      margin: 0 0 10px 0;
      font-size: 20px;
      color: #718096;
    }
    
    .notification-empty p {
      margin: 0;
      font-size: 14px;
      color: #a0aec0;
    }
    
    .notification-error {
      text-align: center;
      padding: 60px 20px;
      color: #e53e3e;
    }
    
    .notification-error i {
      font-size: 48px;
      margin-bottom: 16px;
    }
    
    .notification-error p {
      margin: 0 0 20px 0;
      font-size: 16px;
    }
    
    .btn-primary-sm {
      padding: 10px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: transform 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    
    .btn-primary-sm:hover {
      transform: translateY(-2px);
    }
    
    .all-notifications-modal-footer {
      padding: 20px 28px;
      border-top: 2px solid #f0f0f0;
      background: #f8f9fa;
      border-radius: 0 0 16px 16px;
    }
    
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .pagination-btn {
      padding: 10px 16px;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: #495057;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 44px;
      justify-content: center;
    }
    
    .pagination-btn:hover {
      background: #e9ecef;
      border-color: #adb5bd;
    }
    
    .pagination-btn.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: #667eea;
    }
    
    .pagination-ellipsis {
      padding: 10px 8px;
      color: #a0aec0;
      font-weight: 500;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .all-notifications-modal-content {
        width: 95%;
        max-height: 90vh;
        border-radius: 12px;
      }
      
      .all-notifications-modal-header {
        flex-direction: column;
        align-items: flex-start;
        padding: 20px;
      }
      
      .all-notifications-modal-header h2 {
        font-size: 20px;
      }
      
      .all-notifications-modal-actions {
        width: 100%;
        justify-content: space-between;
      }
      
      .btn-secondary-sm span {
        display: none;
      }
      
      .all-notifications-filter-tabs {
        padding: 12px 20px;
        overflow-x: auto;
      }
      
      .filter-tab {
        white-space: nowrap;
      }
      
      .all-notifications-modal-body {
        padding: 16px 20px;
      }
      
      .all-notifications-modal-footer {
        padding: 16px 20px;
      }
      
      .pagination-btn {
        padding: 8px 12px;
        font-size: 13px;
        min-width: 38px;
      }
    }
  `;
  document.head.appendChild(style);
})();