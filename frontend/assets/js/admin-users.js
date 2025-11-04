// ===== ADMIN USER MANAGEMENT JAVASCRIPT =====

let currentPage = 1;
let totalPages = 1;
let currentFilters = {
  role: '',
  status: '',
  approvalStatus: '',
  search: ''
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎓 Admin User Management Initialized');
  loadUsers();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Role filter
  const roleFilter = document.getElementById('roleFilter');
  if (roleFilter) {
    roleFilter.addEventListener('change', (e) => {
      currentFilters.role = e.target.value;
      currentPage = 1;
      loadUsers();
    });
  }

  // Status filter
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentFilters.status = e.target.value;
      currentPage = 1;
      loadUsers();
    });
  }

  // Approval status filter
  const approvalFilter = document.getElementById('approvalFilter');
  if (approvalFilter) {
    approvalFilter.addEventListener('change', (e) => {
      currentFilters.approvalStatus = e.target.value;
      currentPage = 1;
      loadUsers();
    });
  }

  // Search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentFilters.search = e.target.value.trim();
        currentPage = 1;
        loadUsers();
      }, 500); // Debounce 500ms
    });
  }

  // Reset filters button
  const resetBtn = document.getElementById('resetFilters');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetFilters();
    });
  }
}

// Reset filters
function resetFilters() {
  currentFilters = {
    role: '',
    status: '',
    approvalStatus: '',
    search: ''
  };
  currentPage = 1;

  // Reset UI
  const roleFilter = document.getElementById('roleFilter');
  if (roleFilter) roleFilter.value = '';

  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) statusFilter.value = '';

  const approvalFilter = document.getElementById('approvalFilter');
  if (approvalFilter) approvalFilter.value = '';

  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  loadUsers();
}

// Load users from API
async function loadUsers() {
  showLoading('usersContainer');
  
  try {
    // Build query string
    const params = new URLSearchParams({
      page: currentPage,
      limit: 20
    });

    if (currentFilters.role) {
      params.append('role', currentFilters.role);
    }

    if (currentFilters.status) {
      params.append('status', currentFilters.status);
    }

    if (currentFilters.approvalStatus) {
      params.append('approvalStatus', currentFilters.approvalStatus);
    }

    if (currentFilters.search) {
      params.append('search', currentFilters.search);
    }

    const response = await apiRequest(`/admin/users?${params.toString()}`);
    
    if (response.success) {
      const users = response.data.users || [];
      totalPages = response.data.pages || 1;
      
      if (users.length === 0) {
        showEmptyState(
          'usersContainer',
          'fas fa-users',
          'Không tìm thấy người dùng',
          'Thử thay đổi bộ lọc hoặc tìm kiếm'
        );
      } else {
        renderUsers(users);
      }

      // Update pagination
      updatePagination(response.data);
      
      // Update stats
      updateStats(response.data);
    }
  } catch (error) {
    console.error('Load users error:', error);
    showErrorState('usersContainer', 'Không thể tải danh sách người dùng');
  }
}

// Render users table
function renderUsers(users) {
  const container = document.getElementById('usersContainer');
  
  const columns = [
    {
      key: 'profile',
      label: 'Người Dùng',
      render: (value, row) => {
        const userName = value?.fullName || row.email;
        const userAvatar = value?.avatar || 
          `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=667eea&color=fff`;
        
        return `
          <div class="table-user">
            <img src="${userAvatar}" class="table-avatar" alt="${userName}">
            <div class="table-user-info">
              <h4>${userName}</h4>
              <p>${row.email}</p>
            </div>
          </div>
        `;
      }
    },
    {
      key: 'role',
      label: 'Vai Trò',
      render: (value) => {
        const roleMap = {
          'student': { label: 'Học sinh', class: 'info' },
          'tutor': { label: 'Gia sư', class: 'primary' },
          'admin': { label: 'Admin', class: 'danger' }
        };
        const role = roleMap[value] || { label: value, class: 'secondary' };
        return `<span class="status-badge ${role.class}">${role.label}</span>`;
      }
    },
    {
      key: 'approvalStatus',
      label: 'Duyệt',
      render: (value, row) => {
        if (row.role !== 'tutor') {
          return '<span style="color: #999;">-</span>';
        }
        const statusMap = {
          'pending': { label: 'Chờ duyệt', class: 'pending' },
          'approved': { label: 'Đã duyệt', class: 'approved' },
          'rejected': { label: 'Từ chối', class: 'cancelled' }
        };
        const status = statusMap[value] || { label: value, class: 'secondary' };
        return `<span class="status-badge ${status.class}">${status.label}</span>`;
      }
    },
    {
      key: 'isEmailVerified',
      label: 'Email',
      render: (value) => value ? 
        '<span class="status-badge approved"><i class="fas fa-check-circle"></i> Xác thực</span>' : 
        '<span class="status-badge pending"><i class="fas fa-clock"></i> Chưa xác thực</span>'
    },
    {
      key: 'isActive',
      label: 'Trạng Thái',
      render: (value) => value ? 
        '<span class="status-badge active"><i class="fas fa-check"></i> Hoạt động</span>' : 
        '<span class="status-badge cancelled"><i class="fas fa-ban"></i> Vô hiệu hóa</span>'
    },
    {
      key: 'createdAt',
      label: 'Ngày Đăng Ký',
      render: (value) => formatDate(value)
    },
    {
      key: 'actions',
      label: 'Thao Tác',
      render: (value, row) => `
        <div class="action-buttons">
          <button class="action-btn primary" onclick="viewUserDetail('${row._id}')" title="Xem chi tiết">
            <i class="fas fa-eye"></i>
          </button>
          ${row.role === 'tutor' && row.approvalStatus === 'pending' ? `
            <button class="action-btn success" onclick="approveTutor('${row._id}')" title="Duyệt gia sư">
              <i class="fas fa-check"></i>
            </button>
            <button class="action-btn warning" onclick="rejectTutor('${row._id}')" title="Từ chối">
              <i class="fas fa-times"></i>
            </button>
          ` : ''}
          <button class="action-btn ${row.isActive ? 'danger' : 'success'}" 
                  onclick="toggleUserStatus('${row._id}', ${row.isActive})" 
                  title="${row.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}">
            <i class="fas fa-${row.isActive ? 'ban' : 'check'}"></i>
          </button>
        </div>
      `
    }
  ];

  container.innerHTML = createTable(users, columns);
}

// Update pagination
function updatePagination(data) {
  const paginationContainer = document.getElementById('paginationContainer');
  if (!paginationContainer) return;

  const { page, pages, total } = data;
  currentPage = page;
  totalPages = pages;

  if (pages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  let paginationHTML = '<div class="pagination">';
  
  // Previous button
  paginationHTML += `
    <button class="pagination-btn ${page === 1 ? 'disabled' : ''}" 
            onclick="changePage(${page - 1})" 
            ${page === 1 ? 'disabled' : ''}>
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

  // Page numbers
  const maxVisible = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  let endPage = Math.min(pages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    paginationHTML += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
    if (startPage > 2) {
      paginationHTML += `<span class="pagination-ellipsis">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <button class="pagination-btn ${i === page ? 'active' : ''}" onclick="changePage(${i})">
        ${i}
      </button>
    `;
  }

  if (endPage < pages) {
    if (endPage < pages - 1) {
      paginationHTML += `<span class="pagination-ellipsis">...</span>`;
    }
    paginationHTML += `<button class="pagination-btn" onclick="changePage(${pages})">${pages}</button>`;
  }

  // Next button
  paginationHTML += `
    <button class="pagination-btn ${page === pages ? 'disabled' : ''}" 
            onclick="changePage(${page + 1})" 
            ${page === pages ? 'disabled' : ''}>
      <i class="fas fa-chevron-right"></i>
    </button>
  `;

  paginationHTML += '</div>';

  // Add info
  paginationHTML += `
    <div class="pagination-info">
      Hiển thị ${(page - 1) * 20 + 1} - ${Math.min(page * 20, total)} trong tổng số ${total} người dùng
    </div>
  `;

  paginationContainer.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
  if (page < 1 || page > totalPages || page === currentPage) return;
  currentPage = page;
  loadUsers();
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update stats
function updateStats(data) {
  const statsContainer = document.getElementById('usersStats');
  if (!statsContainer) return;

  const { total } = data;
  
  statsContainer.innerHTML = `
    <div class="stats-summary">
      <div class="stat-item">
        <div class="stat-icon white">
          <i class="fas fa-users"></i>
        </div>
        <div class="stat-content">
          <h3>${total}</h3>
          <p>Tổng người dùng</p>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon white1">
          <i class="fas fa-filter"></i>
        </div>
        <div class="stat-content">
          <h3>${data.users?.length || 0}</h3>
          <p>Hiển thị</p>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon white2">
          <i class="fas fa-file-alt"></i>
        </div>
        <div class="stat-content">
          <h3>${totalPages}</h3>
          <p>Trang</p>
        </div>
      </div>
    </div>
  `;
}

// View user detail
async function viewUserDetail(userId) {
  try {
    const response = await apiRequest(`/admin/users/${userId}`);
    
    if (response.success) {
      const user = response.data;
      showUserDetailModal(user);
    }
  } catch (error) {
    console.error('View user detail error:', error);
    showNotification('Không thể tải thông tin người dùng', 'error');
  }
}

// Show user detail modal
function showUserDetailModal(user) {
  const profile = user.profile || {};
  const userName = profile.fullName || user.email;
  const userAvatar = profile.avatar || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=667eea&color=fff`;

  const roleMap = {
    'student': 'Học sinh',
    'tutor': 'Gia sư',
    'admin': 'Admin'
  };

  const approvalStatusMap = {
    'pending': 'Chờ duyệt',
    'approved': 'Đã duyệt',
    'rejected': 'Từ chối'
  };

  const modalHTML = `
    <div class="modal active" id="userDetailModal" style="z-index: 10000;">
      <div class="modal__overlay" onclick="closeModal('userDetailModal')"></div>
      <div class="modal__content" style="max-width: 600px;">
        <div class="modal__header">
          <h3 class="modal__title">Chi Tiết Người Dùng</h3>
          <button class="modal__close" onclick="closeModal('userDetailModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal__body" style="padding: 24px; max-height: 60vh; overflow-y: auto;">
          <div class="user-detail-card">
            <div class="user-detail-avatar">
              <img src="${userAvatar}" alt="${userName}">
            </div>
            <div class="user-detail-info">
              <h2>${userName}</h2>
              <p>${user.email}</p>
              <div class="user-badges">
                <span class="badge ${user.isActive ? 'success' : 'danger'}">
                  ${user.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                </span>
                <span class="badge ${user.isEmailVerified ? 'primary' : 'warning'}">
                  ${user.isEmailVerified ? 'Email đã xác thực' : 'Email chưa xác thực'}
                </span>
              </div>
            </div>
          </div>

          <div class="user-detail-sections">
            <div class="detail-section">
              <h4><i class="fas fa-info-circle"></i> Thông Tin Cơ Bản</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <strong>Vai trò:</strong>
                  <span>${roleMap[user.role] || user.role}</span>
                </div>
                <div class="detail-item">
                  <strong>Số điện thoại:</strong>
                  <span>${profile.phone || 'Chưa cập nhật'}</span>
                </div>
                ${user.role === 'tutor' ? `
                  <div class="detail-item">
                    <strong>Trạng thái duyệt:</strong>
                    <span>${approvalStatusMap[user.approvalStatus] || user.approvalStatus}</span>
                  </div>
                ` : ''}
                <div class="detail-item">
                  <strong>Ngày đăng ký:</strong>
                  <span>${formatDate(user.createdAt)}</span>
                </div>
                <div class="detail-item">
                  <strong>Đăng nhập cuối:</strong>
                  <span>${user.lastLogin ? formatDate(user.lastLogin) : 'Chưa đăng nhập'}</span>
                </div>
              </div>
            </div>

            ${user.role === 'tutor' && profile.subjects && profile.subjects.length > 0 ? `
              <div class="detail-section">
                <h4><i class="fas fa-book"></i> Môn Dạy</h4>
                <div class="subjects-list">
                  ${profile.subjects.map(s => `
                    <span class="subject-badge">${s.subject} - ${s.level || 'Tất cả cấp'}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${user.role === 'tutor' && profile.bio ? `
              <div class="detail-section">
                <h4><i class="fas fa-user"></i> Giới Thiệu</h4>
                <p>${profile.bio}</p>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="modal__footer" style="padding: 20px 24px; border-top: 1px solid #e0e0e0; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
          <button class="btn btn-secondary" onclick="closeModal('userDetailModal')">Đóng</button>
          ${user.role === 'tutor' && user.approvalStatus === 'pending' ? `
            <button class="btn btn-success" onclick="approveTutor('${user._id}'); closeModal('userDetailModal');">
              <i class="fas fa-check"></i> Duyệt
            </button>
            <button class="btn btn-warning" onclick="rejectTutor('${user._id}'); closeModal('userDetailModal');">
              <i class="fas fa-times"></i> Từ chối
            </button>
          ` : ''}
          <button class="btn ${user.isActive ? 'btn-danger' : 'btn-success'}" 
                  onclick="toggleUserStatus('${user._id}', ${user.isActive}); closeModal('userDetailModal');">
            <i class="fas fa-${user.isActive ? 'ban' : 'check'}"></i>
            ${user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
          </button>
        </div>
      </div>
    </div>
  `;

  // Remove existing modal if any
  const existingModal = document.getElementById('userDetailModal');
  if (existingModal) {
    existingModal.remove();
  }

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Close modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  }
}

// Toggle user status
async function toggleUserStatus(userId, currentStatus) {
  const action = currentStatus ? 'vô hiệu hóa' : 'kích hoạt';
  
  if (!confirm(`Bạn có chắc chắn muốn ${action} người dùng này?`)) {
    return;
  }

  try {
    const response = await apiRequest(`/admin/users/${userId}/toggle-status`, {
      method: 'PUT',
      body: JSON.stringify({
        isActive: !currentStatus,
        reason: `Admin ${action} tài khoản`
      })
    });

    if (response.success) {
      showNotification(`${action.charAt(0).toUpperCase() + action.slice(1)} người dùng thành công`, 'success');
      loadUsers();
    }
  } catch (error) {
    console.error('Toggle user status error:', error);
    showNotification(`Không thể ${action} người dùng`, 'error');
  }
}

// Approve tutor
async function approveTutor(userId) {
  if (!confirm('Bạn có chắc chắn muốn duyệt gia sư này?')) {
    return;
  }

  try {
    const response = await apiRequest(`/admin/users/${userId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({
        isApproved: true
      })
    });

    if (response.success) {
      showNotification('Duyệt gia sư thành công', 'success');
      loadUsers();
    }
  } catch (error) {
    console.error('Approve tutor error:', error);
    showNotification('Không thể duyệt gia sư', 'error');
  }
}

// Reject tutor
async function rejectTutor(userId) {
  const reason = prompt('Vui lòng nhập lý do từ chối:');
  
  if (!reason || reason.trim() === '') {
    showNotification('Vui lòng nhập lý do từ chối', 'warning');
    return;
  }

  try {
    const response = await apiRequest(`/admin/users/${userId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({
        isApproved: false,
        reason: reason.trim()
      })
    });

    if (response.success) {
      showNotification('Từ chối gia sư thành công', 'success');
      loadUsers();
    }
  } catch (error) {
    console.error('Reject tutor error:', error);
    showNotification('Không thể từ chối gia sư', 'error');
  }
}