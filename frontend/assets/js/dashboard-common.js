// ===== DASHBOARD COMMON JAVASCRIPT =====

// Check authentication
function checkAuth() {
  // Support both 'token' and 'accessToken' for backward compatibility
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  const userData = localStorage.getItem('userData');

  if (!token || !userData) {
    window.location.href = '/index.html';
    return null;
  }

  return JSON.parse(userData);
}

// Initialize dashboard
const currentUser = checkAuth();

// Sidebar toggle functionality
const menuToggle = document.getElementById('menuToggle');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
const dashboardSidebar = document.getElementById('dashboardSidebar');
const hamburgerIcon = document.getElementById('hamburgerIcon');

// Load collapsed state from localStorage
const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
if (isCollapsed && dashboardSidebar) {
  dashboardSidebar.classList.add('collapsed');
}

// Hamburger icon toggle functionality
if (hamburgerIcon && dashboardSidebar) {
  hamburgerIcon.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dashboardSidebar.classList.toggle('collapsed');
    
    // Save state to localStorage
    const collapsed = dashboardSidebar.classList.contains('collapsed');
    localStorage.setItem('sidebarCollapsed', collapsed);
  });
}

// Mobile sidebar toggle (existing functionality for mobile)
if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    dashboardSidebar.classList.toggle('active');
  });
}

if (sidebarToggleBtn) {
  sidebarToggleBtn.addEventListener('click', () => {
    dashboardSidebar.classList.remove('active');
  });
}

// Hover functionality - auto expand on hover when collapsed
let hoverTimeout;
if (dashboardSidebar) {
  dashboardSidebar.addEventListener('mouseenter', () => {
    if (dashboardSidebar.classList.contains('collapsed')) {
      clearTimeout(hoverTimeout);
    }
  });

  dashboardSidebar.addEventListener('mouseleave', () => {
    if (dashboardSidebar.classList.contains('collapsed')) {
      // Auto collapse again after leaving
      hoverTimeout = setTimeout(() => {
        // This is handled by CSS, no action needed
      }, 300);
    }
  });
}

// Menu navigation
document.querySelectorAll('.menu-item[data-page]').forEach(item => {
  item.addEventListener('click', function() {
    const page = this.getAttribute('data-page');
    const role = currentUser?.role || 'student'; // Get user role
    
    // Define page mappings for each role
    const pageMap = {
      student: {
        dashboard: '/pages/student/dashboard.html',
        courses: '/pages/student/course.html',
        requests: '/pages/student/tutor_request.html',
        'find-tutor': '/pages/student/find_tutor.html',
        messages: '/pages/student/messages.html',
        blog: '/pages/student/blog.html',
        profile: '/pages/student/profile_student.html',
        settings: '/pages/student/settings.html'
      },
      tutor: {
        dashboard: '/pages/tutor/dashboard.html',
        students: '/pages/tutor/student_management.html',
        requests: '/pages/tutor/new_request.html',
        schedule: '/pages/tutor/schedule.html',
        income: '/pages/tutor/income.html',
        messages: '/pages/tutor/messages.html',
        blog: '/pages/tutor/blog.html',
        profile: '/pages/tutor/profile_tutor.html',
        settings: '/pages/tutor/settings.html'
      },
      admin: {
        dashboard: '/pages/admin/dashboard.html',
        users: '/pages/admin/user.html',
        tutors: '/pages/admin/approve.html',
        courses: '/pages/admin/course.html',
        blog: '/pages/admin/blog_management.html',
        reports: '/pages/admin/report.html',
        finance: '/pages/admin/financial_statistics.html',
        contact: '/pages/admin/contact_info.html',
        settings: '/pages/admin/settings.html',
        logs: '/pages/admin/logs.html'
      }
    };
    
    // Get the URL for the page
    const url = pageMap[role]?.[page];
    
    if (url) {
      // Navigate to the page
      window.location.href = url;
    } else {
      console.warn('Page not found:', page);
    }
  });
});

// Set current date
function updateCurrentDate() {
  const dateElement = document.getElementById('currentDate');
  if (dateElement) {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const today = new Date();
    dateElement.textContent = today.toLocaleDateString('vi-VN', options);
  }
}

updateCurrentDate();

// Update user avatar - Load from localStorage or fetch from API
async function updateUserAvatar() {
  const userAvatar = document.getElementById('userAvatar');
  if (!userAvatar) return;

  try {
    // Try to get profile from localStorage first
    let userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    
    // If no profile in localStorage or no avatar, fetch from API
    if (!userProfile || !userProfile.avatar) {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const role = userData.role;
      
      if (role) {
        // Fetch fresh profile data
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        const response = await fetch(`http://localhost:5000/api/${role}/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            userProfile = data.data;
            // Update localStorage with fresh data
            localStorage.setItem('userProfile', JSON.stringify(userProfile));
          }
        }
      }
    }
    
    // Set avatar
    if (userProfile && userProfile.user && userProfile.user.avatar) {
      // Use avatar from user object
      userAvatar.src = userProfile.user.avatar;
      console.log('✅ Avatar loaded from user object:', userProfile.user.avatar);
    } else if (userProfile && userProfile.avatar) {
      // Use avatar from profile object
      userAvatar.src = userProfile.avatar;
      console.log('✅ Avatar loaded from profile:', userProfile.avatar);
    } else if (userProfile && userProfile.fullName) {
      // Use generated avatar with name
      userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.fullName)}&background=667eea&color=fff`;
      console.log('✅ Using generated avatar for:', userProfile.fullName);
    } else {
      // Default avatar
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const name = userData.fullName || userData.email || 'User';
      userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff`;
      console.log('✅ Using default avatar');
    }
  } catch (error) {
    console.error('Error updating avatar:', error);
    // Fallback to default avatar
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const name = userData.fullName || userData.email || 'User';
    userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff`;
  }
}

// Update avatar when page loads
if (document.getElementById('userAvatar')) {
  updateUserAvatar();
}

// Listen for storage changes (when avatar is updated in another tab or page)
window.addEventListener('storage', function(e) {
  if (e.key === 'userProfile') {
    console.log('📢 Profile updated, refreshing avatar...');
    updateUserAvatar();
  }
});

// Custom event for same-page updates
window.addEventListener('avatarUpdated', function() {
  console.log('📢 Avatar updated event received, refreshing...');
  updateUserAvatar();
});

// Logout function
async function logout() {
  try {
    await apiRequest('/auth/logout', {
      method: 'POST'
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage - remove both token keys for backward compatibility
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userProfile');
    
    // Redirect to home
    window.location.href = '/index.html';
  }
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Format relative time
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 7) {
    return formatDate(dateString);
  } else if (days > 0) {
    return `${days} ngày trước`;
  } else if (hours > 0) {
    return `${hours} giờ trước`;
  } else if (minutes > 0) {
    return `${minutes} phút trước`;
  } else {
    return 'Vừa xong';
  }
}

// Show loading state
function showLoading(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
      </div>
    `;
  }
}

// Show empty state
function showEmptyState(containerId, icon, title, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="${icon}"></i>
        <h3>${title}</h3>
        <p>${message}</p>
      </div>
    `;
  }
}

// Show error state
function showErrorState(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Có lỗi xảy ra</h3>
        <p>${message}</p>
        <button class="action-btn primary" onclick="location.reload()">
          <i class="fas fa-redo"></i>
          Thử lại
        </button>
      </div>
    `;
  }
}

// Create table
function createTable(data, columns) {
  if (!data || data.length === 0) {
    return '<p style="text-align: center; padding: 20px; color: var(--text-secondary);">Không có dữ liệu</p>';
  }

  let html = '<table class="data-table"><thead><tr>';
  
  // Headers
  columns.forEach(col => {
    html += `<th>${col.label}</th>`;
  });
  
  html += '</tr></thead><tbody>';
  
  // Rows
  data.forEach(row => {
    html += '<tr>';
    columns.forEach(col => {
      let value = row[col.key];
      if (col.render) {
        value = col.render(value, row);
      }
      html += `<td>${value}</td>`;
    });
    html += '</tr>';
  });
  
  html += '</tbody></table>';
  return html;
}

// Render courses table
function renderCoursesTable(courses) {
  if (!courses || courses.length === 0) {
    return showEmptyState('coursesContainer', 'fas fa-book', 'Chưa có khóa học', 'Bạn chưa tham gia khóa học nào');
  }

  const columns = [
    {
      key: 'tutor',
      label: 'Gia Sư',
      render: (value, row) => `
        <div class="table-user">
          <img src="${value.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(value.fullName)}" 
               class="table-avatar" alt="${value.fullName}">
          <div class="table-user-info">
            <h4>${value.fullName}</h4>
            <p>${value.subjects[0]?.subject || ''}</p>
          </div>
        </div>
      `
    },
    {
      key: 'subject',
      label: 'Môn Học'
    },
    {
      key: 'status',
      label: 'Trạng Thái',
      render: (value) => `<span class="status-badge ${value}">${getStatusText(value)}</span>`
    },
    {
      key: 'startDate',
      label: 'Ngày Bắt Đầu',
      render: (value) => formatDate(value)
    },
    {
      key: 'actions',
      label: 'Thao Tác',
      render: (value, row) => `
        <div class="action-buttons">
          <button class="action-btn primary" onclick="viewCourse('${row._id}')">
            <i class="fas fa-eye"></i>
          </button>
          <button class="action-btn secondary" onclick="messageTutor('${row.tutorId}')">
            <i class="fas fa-comment"></i>
          </button>
        </div>
      `
    }
  ];

  document.getElementById('coursesContainer').innerHTML = createTable(courses, columns);
}

// Get status text
function getStatusText(status) {
  const statusMap = {
    'pending': 'Chờ xác nhận',
    'active': 'Đang học',
    'completed': 'Hoàn thành',
    'cancelled': 'Đã hủy',
    'approved': 'Đã duyệt',
    'rejected': 'Từ chối'
  };
  return statusMap[status] || status;
}

// View course detail
function viewCourse(courseId) {
  console.log('View course:', courseId);
  // TODO: Implement course detail view
}

// Message tutor
function messageTutor(tutorId) {
  console.log('Message tutor:', tutorId);
  // TODO: Implement messaging
}

// Approve tutor
async function approveTutor(userId) {
  if (!confirm('Bạn có chắc muốn duyệt gia sư này?')) {
    return;
  }

  try {
    const response = await apiRequest(`/admin/users/${userId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'approved'
      })
    });

    if (response.success) {
      showNotification('Đã duyệt gia sư thành công', 'success');
      // Reload data
      location.reload();
    }
  } catch (error) {
    console.error('Approve tutor error:', error);
    showNotification('Có lỗi xảy ra khi duyệt gia sư', 'error');
  }
}

// Reject tutor
async function rejectTutor(userId) {
  const reason = prompt('Lý do từ chối:');
  if (!reason) return;

  try {
    const response = await apiRequest(`/admin/users/${userId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'rejected',
        reason: reason
      })
    });

    if (response.success) {
      showNotification('Đã từ chối gia sư', 'success');
      location.reload();
    }
  } catch (error) {
    console.error('Reject tutor error:', error);
    showNotification('Có lỗi xảy ra', 'error');
  }
}

// Toggle user status
async function toggleUserStatus(userId, currentStatus) {
  const action = currentStatus ? 'vô hiệu hóa' : 'kích hoạt';
  if (!confirm(`Bạn có chắc muốn ${action} người dùng này?`)) {
    return;
  }

  try {
    const response = await apiRequest(`/admin/users/${userId}/toggle-status`, {
      method: 'PUT'
    });

    if (response.success) {
      showNotification(`Đã ${action} người dùng thành công`, 'success');
      location.reload();
    }
  } catch (error) {
    console.error('Toggle user status error:', error);
    showNotification('Có lỗi xảy ra', 'error');
  }
}

// Close sidebar on mobile when clicking outside
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 1024 && dashboardSidebar && menuToggle) {
    if (!dashboardSidebar.contains(e.target) && 
        !menuToggle.contains(e.target) && 
        dashboardSidebar.classList.contains('active')) {
      dashboardSidebar.classList.remove('active');
    }
  }
});

// Handle window resize
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (window.innerWidth > 1024) {
      dashboardSidebar.classList.remove('active');
    }
  }, 250);
});

console.log('Dashboard common initialized for user:', currentUser.email);
