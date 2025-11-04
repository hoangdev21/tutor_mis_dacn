// ===== REQUESTS PAGE JAVASCRIPT =====

let currentPage = 1;
let totalPages = 1;
const itemsPerPage = 10;
let allRequests = [];
let filteredRequests = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadRequests();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Filter checkboxes
  document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(input => {
    input.addEventListener('change', applyFilters);
  });

  // Budget inputs
  document.getElementById('minBudget')?.addEventListener('change', applyFilters);
  document.getElementById('maxBudget')?.addEventListener('change', applyFilters);
  document.getElementById('cityFilter')?.addEventListener('change', applyFilters);
}

// Load requests from API
async function loadRequests() {
  try {
    showLoading(true);

    const response = await fetch(`${API_BASE_URL}/requests`);
    const data = await response.json();

    if (data.success) {
      allRequests = data.data.requests || [];
      filteredRequests = [...allRequests];
      updateResultCount();
      renderRequests();
    } else {
      showEmptyState('Không thể tải danh sách yêu cầu');
    }
  } catch (error) {
    console.error('Load requests error:', error);
    showEmptyState('Đã xảy ra lỗi khi tải dữ liệu');
  } finally {
    showLoading(false);
  }
}

// Apply filters
function applyFilters() {
  const subjects = getSelectedValues('subject');
  const levels = getSelectedValues('level');
  const method = document.querySelector('input[name="method"]:checked')?.value;
  const city = document.getElementById('cityFilter')?.value;
  const minBudget = parseInt(document.getElementById('minBudget')?.value) || 0;
  const maxBudget = parseInt(document.getElementById('maxBudget')?.value) || Infinity;

  filteredRequests = allRequests.filter(request => {
    // Subject filter
    if (subjects.length > 0 && !subjects.includes(request.subject)) {
      return false;
    }

    // Level filter
    if (levels.length > 0 && !levels.includes(request.level)) {
      return false;
    }

    // Budget filter
    const reqBudget = request.budget?.max || 0;
    if (reqBudget < minBudget || reqBudget > maxBudget) {
      return false;
    }

    // Method filter
    if (method && method !== 'all' && request.location?.method !== method) {
      return false;
    }

    // City filter
    if (city && request.location?.city !== city) {
      return false;
    }

    return true;
  });

  currentPage = 1;
  updateResultCount();
  renderRequests();
}

// Clear all filters
function clearAllFilters() {
  document.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = false;
  });

  document.querySelectorAll('input[type="radio"][value="all"]').forEach(input => {
    input.checked = true;
  });

  document.getElementById('minBudget').value = '';
  document.getElementById('maxBudget').value = '';
  document.getElementById('cityFilter').value = '';

  filteredRequests = [...allRequests];
  currentPage = 1;
  updateResultCount();
  renderRequests();
}

// Apply sorting
function applySorting() {
  const sortBy = document.getElementById('sortBy').value;

  filteredRequests.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'budget-high':
        return (b.budget?.max || 0) - (a.budget?.max || 0);
      case 'budget-low':
        return (a.budget?.max || 0) - (b.budget?.max || 0);
      default:
        return 0;
    }
  });

  renderRequests();
}

// Render requests
function renderRequests() {
  const grid = document.getElementById('requestsGrid');
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const requestsToShow = filteredRequests.slice(startIndex, endIndex);

  if (requestsToShow.length === 0) {
    showEmptyState('Không tìm thấy yêu cầu phù hợp');
    return;
  }

  grid.innerHTML = requestsToShow.map(request => createRequestCard(request)).join('');
  updatePagination();
}

// Create request card
function createRequestCard(request) {
  const student = request.student || {};
  const studentName = student.name || 'Học sinh';
  const studentAvatar = student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=667eea&color=fff`;
  
  const budget = request.budget || {};
  const budgetDisplay = budget.max ? formatCurrency(budget.max) : 'Thỏa thuận';
  
  const location = request.location || {};
  const methodMap = {
    'home': 'Tại nhà',
    'online': 'Online',
    'flexible': 'Linh hoạt'
  };
  const methodText = methodMap[location.method] || location.method;
  
  const schedule = request.schedule || {};
  const levelMap = {
    'elementary': 'Tiểu học',
    'middle': 'THCS',
    'high': 'THPT',
    'university': 'Đại học'
  };
  const levelText = levelMap[request.level] || request.level;

  return `
    <div class="request-card" onclick="viewRequestDetail('${request._id}')">
      <div class="request-header">
        <div class="request-title">
          <h3>${request.subject} - ${levelText}</h3>
          <div class="request-meta">
            <div class="meta-item">
              <i class="fas fa-map-marker-alt"></i>
              <span>${location.city || 'Chưa rõ'}</span>
            </div>
            <div class="meta-item">
              <i class="fas fa-chalkboard"></i>
              <span>${methodText}</span>
            </div>
            <div class="meta-item">
              <i class="fas fa-calendar"></i>
              <span>${schedule.sessionsPerWeek || 0} buổi/tuần</span>
            </div>
            <div class="meta-item">
              <i class="fas fa-clock"></i>
              <span>${formatTimeAgo(request.createdAt)}</span>
            </div>
          </div>
        </div>
        <div class="request-budget">
          <span class="budget-label">Học phí</span>
          <div class="budget-amount">
            ${budgetDisplay}
            <small>/giờ</small>
          </div>
        </div>
      </div>

      <div class="request-body">
        <p class="request-description">${request.description || 'Không có mô tả'}</p>
        
        <div class="request-tags">
          <span class="tag">${request.subject}</span>
          <span class="tag">${levelText}</span>
          ${schedule.duration ? `<span class="tag">${schedule.duration}h/buổi</span>` : ''}
        </div>
      </div>

      <div class="request-footer">
        <div class="request-student">
          <img src="${studentAvatar}" alt="${studentName}" class="student-avatar">
          <div class="student-info">
            <h5>${studentName}</h5>
            <span>Lớp ${student.grade || 'N/A'}</span>
          </div>
        </div>
        <div class="request-actions">
          <button class="btn btn--outline btn-small" onclick="event.stopPropagation(); viewRequestDetail('${request._id}')">
            <i class="fas fa-eye"></i> Chi tiết
          </button>
          <button class="btn btn--primary btn-small" onclick="event.stopPropagation(); applyToRequest('${request._id}')">
            <i class="fas fa-paper-plane"></i> Ứng tuyển
          </button>
        </div>
      </div>
    </div>
  `;
}

// View request detail
function viewRequestDetail(requestId) {
  const request = allRequests.find(r => r._id === requestId);
  if (!request) return;

  const modal = document.getElementById('requestModal');
  const modalBody = document.getElementById('modalBody');

  const student = request.student || {};
  const budget = request.budget || {};
  const location = request.location || {};
  const schedule = request.schedule || {};
  const requirements = request.requirements || {};

  const methodMap = {
    'home': 'Tại nhà',
    'online': 'Online',
    'flexible': 'Linh hoạt'
  };

  modalBody.innerHTML = `
    <div style="line-height: 1.8;">
      <h3 style="margin-bottom: 20px;">${request.subject} - ${request.level}</h3>
      
      <div style="margin-bottom: 25px;">
        <h4 style="color: #667eea; margin-bottom: 10px;">📝 Mô tả</h4>
        <p style="color: #555;">${request.description || 'Không có mô tả'}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h4 style="color: #667eea; margin-bottom: 10px;">👨‍🎓 Thông tin học sinh</h4>
        <p><strong>Tên:</strong> ${student.name || 'N/A'}</p>
        <p><strong>Lớp:</strong> ${student.grade || 'N/A'}</p>
        <p><strong>Giới tính:</strong> ${student.gender || 'N/A'}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h4 style="color: #667eea; margin-bottom: 10px;">📅 Lịch học</h4>
        <p><strong>Số buổi/tuần:</strong> ${schedule.sessionsPerWeek || 0} buổi</p>
        <p><strong>Thời lượng:</strong> ${schedule.duration || 0} giờ/buổi</p>
        <p><strong>Khung giờ:</strong> ${schedule.timeSlots?.join(', ') || 'Linh hoạt'}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h4 style="color: #667eea; margin-bottom: 10px;">📍 Địa điểm</h4>
        <p><strong>Hình thức:</strong> ${methodMap[location.method] || location.method}</p>
        <p><strong>Tỉnh/Thành:</strong> ${location.city || 'N/A'}</p>
        ${location.district ? `<p><strong>Quận/Huyện:</strong> ${location.district}</p>` : ''}
        ${location.address ? `<p><strong>Địa chỉ:</strong> ${location.address}</p>` : ''}
      </div>

      <div style="margin-bottom: 25px;">
        <h4 style="color: #667eea; margin-bottom: 10px;">💰 Học phí</h4>
        <p><strong>Mức:</strong> ${formatCurrency(budget.min || 0)} - ${formatCurrency(budget.max || 0)} /giờ</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h4 style="color: #667eea; margin-bottom: 10px;">✅ Yêu cầu về gia sư</h4>
        <p><strong>Giới tính:</strong> ${requirements.tutorGender === 'any' ? 'Không yêu cầu' : requirements.tutorGender}</p>
        <p><strong>Kinh nghiệm:</strong> ${requirements.experience === 'any' ? 'Không yêu cầu' : requirements.experience}</p>
        ${requirements.additional ? `<p><strong>Yêu cầu khác:</strong> ${requirements.additional}</p>` : ''}
      </div>

      <div style="text-align: center; padding-top: 20px; border-top: 2px solid #f0f2f5;">
        <button class="btn btn--primary" onclick="applyToRequest('${request._id}')">
          <i class="fas fa-paper-plane"></i> Ứng tuyển ngay
        </button>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

// Close request modal
function closeRequestModal() {
  document.getElementById('requestModal').classList.remove('active');
}

// Apply to request
async function applyToRequest(requestId) {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Vui lòng đăng nhập để ứng tuyển');
    return;
  }

  const coverLetter = prompt('Nhập thư giới thiệu ngắn:');
  if (!coverLetter) return;

  try {
    const response = await fetch(`${API_BASE_URL}/tutor/requests/${requestId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ coverLetter })
    });

    const data = await response.json();

    if (data.success) {
      alert('Ứng tuyển thành công! Học sinh sẽ liên hệ với bạn sớm.');
      closeRequestModal();
    } else {
      alert(data.message || 'Ứng tuyển thất bại');
    }
  } catch (error) {
    console.error('Apply error:', error);
    alert('Đã xảy ra lỗi khi ứng tuyển');
  }
}

// Toggle filters (mobile)
function toggleFilters() {
  const sidebar = document.getElementById('filtersSidebar');
  sidebar.classList.toggle('active');
}

// Pagination functions
function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    renderRequests();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    renderRequests();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function goToPage(page) {
  currentPage = page;
  renderRequests();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update pagination
function updatePagination() {
  totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const pagination = document.getElementById('pagination');
  const numbersContainer = document.getElementById('paginationNumbers');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (totalPages <= 1) {
    pagination.style.display = 'none';
    return;
  }

  pagination.style.display = 'flex';
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;

  // Generate page numbers
  let html = '';
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <button class="page-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
        ${i}
      </button>
    `;
  }

  numbersContainer.innerHTML = html;
}

// Update result count
function updateResultCount() {
  const countEl = document.getElementById('resultCount');
  if (countEl) {
    countEl.textContent = filteredRequests.length;
  }
}

// Helper functions
function getSelectedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
    .map(input => input.value);
}

function showLoading(show) {
  const grid = document.getElementById('requestsGrid');
  
  if (show) {
    grid.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Đang tải...</p>
      </div>
    `;
  }
}

function showEmptyState(message) {
  const grid = document.getElementById('requestsGrid');
  grid.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-clipboard-list"></i>
      <h3>Không tìm thấy yêu cầu</h3>
      <p>${message}</p>
      <button class="btn btn--primary" onclick="clearAllFilters()">Xóa bộ lọc</button>
    </div>
  `;
  document.getElementById('pagination').style.display = 'none';
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  
  return date.toLocaleDateString('vi-VN');
}

console.log('📋 Requests page initialized');