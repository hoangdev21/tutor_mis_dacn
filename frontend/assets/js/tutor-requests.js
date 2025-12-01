// Tutor Requests Management
// Use existing API_BASE_URL from main.js if available
const API_URL = window.API_BASE_URL || 'http://localhost:5000/api';

let currentRequests = [];
let selectedTutorId = null;
let selectedTutorData = null;
let currentFilter = 'all';

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Tutor Requests page loaded');
  
  // Check authentication
  const token = getToken();
  if (!token) {
    window.location.href = '../../index.html';
    return;
  }

  // Check if coming from tutor profile
  const urlParams = new URLSearchParams(window.location.search);
  const tutorId = urlParams.get('tutorId');
  
  if (tutorId) {
    console.log('📌 TutorId from URL:', tutorId);
    selectedTutorId = tutorId;
    
    // Try to get tutor data from localStorage
    const tutorDataStr = localStorage.getItem('selectedTutorData');
    if (tutorDataStr) {
      try {
        selectedTutorData = JSON.parse(tutorDataStr);
        console.log('💾 Loaded tutor data:', selectedTutorData);
      } catch (e) {
        console.error('Failed to parse tutor data:', e);
      }
    }
    
    // Show create form directly
    showCreateForm();
  } else {
    // Load requests list
    loadRequests();
  }

  // Set up form submission
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', handleSubmit);
  }

  // Set up filter tabs
  const filterTabs = document.querySelectorAll('.filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.status;
      filterRequests(currentFilter);
    });
  });

  // Set minimum date to tomorrow
  const startDateInput = document.getElementById('startDate');
  if (startDateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    startDateInput.min = tomorrow.toISOString().split('T')[0];
  }
});

// Get token from localStorage
function getToken() {
  // Try both possible token keys
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  
  if (!token) {
    console.warn('⚠️ No token found in localStorage');
    console.log('Keys in localStorage:', Object.keys(localStorage));
  }
  
  return token;
}

// Show create form
window.showCreateForm = function showCreateForm() {
  console.log('📝 Showing create form');
  document.getElementById('requestsListSection').style.display = 'none';
  document.getElementById('createRequestSection').style.display = 'block';
  
  // Display tutor info if available
  if (selectedTutorData) {
    displayTutorInfo(selectedTutorData);
  } else if (selectedTutorId) {
    // Fetch tutor data
    fetchTutorData(selectedTutorId);
  }
}

// Show requests list
window.showRequestsList = function showRequestsList() {
  console.log('📋 Showing requests list');
  document.getElementById('createRequestSection').style.display = 'none';
  document.getElementById('requestsListSection').style.display = 'block';
  
  // Clear form
  document.getElementById('bookingForm').reset();
  
  // Clear URL parameters
  window.history.replaceState({}, document.title, window.location.pathname);
  
  // Reload requests
  loadRequests();
}

// Fetch tutor data
async function fetchTutorData(tutorId) {
  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/tutor/profile/${tutorId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      selectedTutorData = data.data;
      displayTutorInfo(selectedTutorData);
    }
  } catch (error) {
    console.error('Error fetching tutor data:', error);
  }
}

// Display tutor info in form
function displayTutorInfo(tutor) {
  const container = document.getElementById('tutorInfoDisplay');
  if (!container) return;

  const profile = tutor.profile || {};
  
  // ✅ FIX: Get hourly rate with correct priority
  // Priority: 1. profile.hourlyRate, 2. tutor.hourlyRate, 3. default 150000
  let hourlyRate = 150000; // Default
  
  if (profile.hourlyRate && profile.hourlyRate > 0) {
    hourlyRate = profile.hourlyRate;
    console.log('💰 Using profile hourlyRate:', hourlyRate);
  } else if (tutor.hourlyRate && tutor.hourlyRate > 0) {
    hourlyRate = tutor.hourlyRate;
    console.log('💰 Using tutor hourlyRate:', hourlyRate);
  } else {
    console.warn('⚠️ No hourly rate found, using default:', hourlyRate);
  }

  // Get subjects list
  let subjectsDisplay = 'Chưa cập nhật';
  if (profile.subjects && profile.subjects.length > 0) {
    // Extract subject names (handle both subject.subject and subject.name)
    subjectsDisplay = profile.subjects.map(s => s.subject || s.name || 'Môn học').join(', ');
  } else if (tutor.subjects && tutor.subjects.length > 0) {
    subjectsDisplay = tutor.subjects.map(s => s.name || s.subject || 'Môn học').join(', ');
  }

  container.innerHTML = `
    <div class="tutor-info-card">
      <img src="${profile.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.fullName || 'Tutor')}" 
           alt="${profile.fullName}" 
           class="tutor-avatar">
      <div class="tutor-details">
        <h4>${profile.fullName || 'Gia sư'}</h4>
        <p class="tutor-subjects">
          <i class="fas fa-book"></i>
          ${subjectsDisplay}
        </p>
        <p class="tutor-rate">
          <i class="fas fa-money-bill-wave"></i>
          <strong>${formatCurrency(hourlyRate)}/giờ</strong>
        </p>
      </div>
    </div>
  `;
}

// Handle form submission
async function handleSubmit(e) {
  e.preventDefault();
  console.log('📤 Submitting booking request...');

  const token = getToken();
  if (!token) {
    alert('Vui lòng đăng nhập để gửi yêu cầu');
    window.location.href = '../../index.html';
    return;
  }

  if (!selectedTutorId) {
    alert('Không tìm thấy thông tin gia sư');
    return;
  }

  // Collect form data
  const formData = {
    tutorId: selectedTutorId,
    subject: {
      name: document.getElementById('subjectName').value,
      level: document.getElementById('subjectLevel').value
    },
    schedule: {
      startDate: document.getElementById('startDate').value,
      preferredTime: document.getElementById('preferredTime').value || 'Linh hoạt',
      daysPerWeek: parseInt(document.getElementById('daysPerWeek').value) || 2,
      hoursPerSession: parseFloat(document.getElementById('hoursPerSession').value) || 1.5,
      duration: parseInt(document.getElementById('duration').value) || 4
    },
    location: {
      type: document.getElementById('locationType').value,
      address: document.getElementById('address').value || ''
    },
    studentNote: document.getElementById('studentNote').value || ''
  };

  // Validate
  if (!formData.subject.name || !formData.subject.level) {
    alert('Vui lòng chọn môn học và cấp học');
    return;
  }

  if (!formData.schedule.startDate) {
    alert('Vui lòng chọn ngày bắt đầu');
    return;
  }

  if (!formData.location.type) {
    alert('Vui lòng chọn hình thức dạy học');
    return;
  }

  // Disable submit button
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';

  try {
    console.log('📦 Request data:', formData);
    console.log('🔑 Using token:', token.substring(0, 20) + '...');
    
    const response = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();
    console.log('📨 Response:', data);

    if (response.ok && data.success) {
      // Show success modal
      showSuccessModal();
      
      // Clear form
      document.getElementById('bookingForm').reset();
      
      // Clear tutor data
      selectedTutorId = null;
      selectedTutorData = null;
      localStorage.removeItem('selectedTutorId');
      localStorage.removeItem('selectedTutorData');
    } else {
      throw new Error(data.message || 'Không thể gửi yêu cầu');
    }
  } catch (error) {
    console.error('Submit error:', error);
    alert(`Lỗi: ${error.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi Yêu Cầu';
  }
}

// Load requests from API
async function loadRequests() {
  const token = getToken();
  console.log('🔑 Loading requests with token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
  
  if (!token) {
    console.error('❌ No token found, redirecting to login');
    alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    window.location.href = '../../index.html';
    return;
  }

  const container = document.getElementById('requestsContainer');
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Đang tải yêu cầu...</p>
    </div>
  `;

  try {
    console.log('📤 Fetching:', `${API_URL}/bookings`);
    const response = await fetch(`${API_URL}/bookings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Response status:', response.status);
    const data = await response.json();
    console.log('📋 Response data:', data);

    if (response.ok && data.success) {
      currentRequests = data.data || [];
      updateRequestCounts();
      filterRequests(currentFilter);
    } else {
      throw new Error(data.message || 'Không thể tải yêu cầu');
    }
  } catch (error) {
    console.error('Load requests error:', error);
    container.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Lỗi tải dữ liệu</h3>
        <p>${error.message}</p>
        <button class="btn btn-primary" onclick="loadRequests()">
          <i class="fas fa-redo"></i>
          Thử Lại
        </button>
      </div>
    `;
  }
}

// Update request counts in tabs
function updateRequestCounts() {
  document.getElementById('countAll').textContent = currentRequests.length;
  document.getElementById('countPending').textContent = 
    currentRequests.filter(r => r.status === 'pending').length;
  document.getElementById('countAccepted').textContent = 
    currentRequests.filter(r => r.status === 'accepted').length;
  document.getElementById('countRejected').textContent = 
    currentRequests.filter(r => r.status === 'rejected').length;
  document.getElementById('countCancelled').textContent = 
    currentRequests.filter(r => r.status === 'cancelled').length;
}

// Filter requests by status
function filterRequests(status) {
  const filtered = status === 'all' 
    ? currentRequests 
    : currentRequests.filter(r => r.status === status);
  
  displayRequests(filtered);
}

// Display requests
function displayRequests(requests) {
  const container = document.getElementById('requestsContainer');
  
  if (requests.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-clipboard-list"></i>
        <h3>Không có yêu cầu</h3>
        <p>${currentFilter === 'all' ? 'Bạn chưa tạo yêu cầu nào.' : `Không có yêu cầu ở trạng thái "${getStatusLabel(currentFilter)}"`}</p>
        <button class="btn btn-primary" onclick="showCreateForm()">
          <i class="fas fa-plus"></i>
          Tạo Yêu Cầu Đầu Tiên
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="requests-grid">
      ${requests.map(request => createRequestCard(request)).join('')}
    </div>
  `;
}

// Create request card HTML
function createRequestCard(request) {
  const tutor = request.tutor || {};
  const tutorProfile = tutor.profile || {};
  const statusInfo = getStatusInfo(request.status);
  
  return `
    <div class="request-card ${request.status}">
      <div class="request-header">
        <div class="tutor-info-mini">
          <img src="${tutorProfile.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(tutorProfile.fullName || 'T')}" 
               alt="${tutorProfile.fullName || 'Tutor'}" 
               class="tutor-avatar-mini">
          <div>
            <h4>${tutorProfile.fullName || 'Gia sư'}</h4>
            <p class="tutor-email">${tutor.email || ''}</p>
          </div>
        </div>
        <span class="status-badge ${request.status}">
          <i class="${statusInfo.icon}"></i>
          ${statusInfo.label}
        </span>
      </div>

      <div class="request-body">
        <div class="request-info-row">
          <i class="fas fa-book"></i>
          <span>${request.subject?.name || 'N/A'} - ${getLevelLabel(request.subject?.level)}</span>
        </div>
        <div class="request-info-row">
          <i class="fas fa-calendar"></i>
          <span>Bắt đầu: ${formatDate(request.schedule?.startDate)}</span>
        </div>
        <div class="request-info-row">
          <i class="fas fa-clock"></i>
          <span>${request.schedule?.daysPerWeek || 0} buổi/tuần, ${request.schedule?.hoursPerSession || 0}h/buổi</span>
        </div>
        <div class="request-info-row">
          <i class="fas fa-map-marker-alt"></i>
          <span>${getLocationLabel(request.location?.type)}</span>
        </div>
        ${request.studentNote ? `
        <div class="request-note">
          <i class="fas fa-sticky-note"></i>
          <p>${request.studentNote}</p>
        </div>
        ` : ''}
      </div>

      <div class="request-footer">
        <small class="request-date">
          <i class="fas fa-clock"></i>
          Tạo: ${formatDateTime(request.createdAt)}
        </small>
        <div class="request-actions">
          ${request.status === 'pending' ? `
            <button class="btn-icon" onclick="cancelRequest('${request._id}')" title="Hủy yêu cầu">
              <i class="fas fa-times"></i>
            </button>
          ` : ''}
          ${request.status === 'accepted' ? `
            <button class="btn-icon" onclick="contactTutor('${tutor._id}')" title="Liên hệ gia sư">
              <i class="fas fa-comment"></i>
            </button>
          ` : ''}
          <button class="btn-icon" onclick="viewRequestDetail('${request._id}')" title="Xem chi tiết">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Cancel request
window.cancelRequest = async function cancelRequest(requestId) {
  if (!confirm('Bạn có chắc muốn hủy yêu cầu này?')) {
    return;
  }

  const token = getToken();
  const reason = prompt('Lý do hủy (tuỳ chọn):');

  try {
    const response = await fetch(`${API_URL}/bookings/${requestId}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason: reason || 'Không có lý do' })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert('Đã hủy yêu cầu thành công');
      loadRequests();
    } else {
      throw new Error(data.message || 'Không thể hủy yêu cầu');
    }
  } catch (error) {
    console.error('Cancel error:', error);
    alert(`Lỗi: ${error.message}`);
  }
}

// View request detail
window.viewRequestDetail = function viewRequestDetail(requestId) {
  const request = currentRequests.find(r => r._id === requestId);
  if (!request) return;
  
  showRequestDetailModal(request);
}

// Show request detail modal
function showRequestDetailModal(request) {
  const tutor = request.tutor || {};
  const tutorProfile = tutor.profile || {};
  const statusInfo = getStatusInfo(request.status);
  
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.id = 'requestDetailModal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Chi Tiết Yêu Cầu</h3>
        <button class="modal-close" onclick="closeRequestDetailModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <!-- Tutor Info -->
        <div class="detail-section">
          <h4><i class="fas fa-user-tie"></i> Thông Tin Gia Sư</h4>
          <div class="tutor-info-card">
            <img src="${tutorProfile.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(tutorProfile.fullName || 'T')}" 
                 alt="${tutorProfile.fullName || 'Tutor'}" 
                 class="tutor-avatar">
            <div class="tutor-details">
              <h4>${tutorProfile.fullName || 'Gia sư'}</h4>
              <p><i class="fas fa-envelope"></i> ${tutor.email || 'N/A'}</p>
              ${tutorProfile.phone ? `<p><i class="fas fa-phone"></i> ${tutorProfile.phone}</p>` : ''}
            </div>
          </div>
        </div>

        <!-- Status -->
        <div class="detail-section">
          <h4><i class="fas fa-info-circle"></i> Trạng Thái</h4>
          <span class="status-badge ${request.status}">
            <i class="${statusInfo.icon}"></i>
            ${statusInfo.label}
          </span>
        </div>

        <!-- Subject Info -->
        <div class="detail-section">
          <h4><i class="fas fa-book"></i> Môn Học</h4>
          <p><strong>Môn:</strong> ${request.subject?.name || 'N/A'}</p>
          <p><strong>Cấp học:</strong> ${getLevelLabel(request.subject?.level)}</p>
        </div>

        <!-- Schedule -->
        <div class="detail-section">
          <h4><i class="fas fa-calendar-alt"></i> Lịch Học</h4>
          <p><strong>Ngày bắt đầu:</strong> ${formatDate(request.schedule?.startDate)}</p>
          <p><strong>Thời gian mong muốn:</strong> ${request.schedule?.preferredTime || 'Linh hoạt'}</p>
          <p><strong>Số buổi/tuần:</strong> ${request.schedule?.daysPerWeek || 0} buổi</p>
          <p><strong>Số giờ/buổi:</strong> ${request.schedule?.hoursPerSession || 0} giờ</p>
          <p><strong>Thời lượng:</strong> ${request.schedule?.duration || 0} tháng</p>
        </div>

        <!-- Location -->
        <div class="detail-section">
          <h4><i class="fas fa-map-marker-alt"></i> Địa Điểm</h4>
          <p><strong>Hình thức:</strong> ${getLocationLabel(request.location?.type)}</p>
          ${request.location?.address ? `<p><strong>Địa chỉ:</strong> ${request.location.address}</p>` : ''}
        </div>

        <!-- Notes -->
        ${request.studentNote ? `
        <div class="detail-section">
          <h4><i class="fas fa-sticky-note"></i> Ghi Chú Của Bạn</h4>
          <p>${request.studentNote}</p>
        </div>
        ` : ''}

        <!-- Response -->
        ${request.tutorResponse?.message ? `
        <div class="detail-section">
          <h4><i class="fas fa-comment"></i> Phản Hồi Từ Gia Sư</h4>
          <div class="response-box">
            <p>${request.tutorResponse.message}</p>
            <small><i class="fas fa-clock"></i> ${formatDateTime(request.tutorResponse.respondedAt)}</small>
          </div>
        </div>
        ` : ''}

        <!-- Pricing -->
        ${request.pricing?.hourlyRate ? `
        <div class="detail-section">
          <h4><i class="fas fa-money-bill-wave"></i> Học Phí</h4>
          <p><strong>Học phí/giờ:</strong> ${formatCurrency(request.pricing.hourlyRate)}</p>
        </div>
        ` : ''}

        <!-- Timestamps -->
        <div class="detail-section">
          <h4><i class="fas fa-clock"></i> Thời Gian</h4>
          <p><strong>Tạo:</strong> ${formatDateTime(request.createdAt)}</p>
          ${request.updatedAt !== request.createdAt ? `<p><strong>Cập nhật:</strong> ${formatDateTime(request.updatedAt)}</p>` : ''}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeRequestDetailModal()">Đóng</button>
        ${request.status === 'pending' ? `
          <button class="btn btn-danger" onclick="closeRequestDetailModal(); cancelRequest('${request._id}')">
            <i class="fas fa-times"></i> Hủy Yêu Cầu
          </button>
        ` : ''}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Close request detail modal
window.closeRequestDetailModal = function closeRequestDetailModal() {
  const modal = document.getElementById('requestDetailModal');
  if (modal) {
    modal.remove();
  }
}

// Contact tutor
window.contactTutor = function contactTutor(tutorId) {
  // Navigate to messages page with tutor selected
  window.location.href = `./messages.html?recipientId=${tutorId}`;
}

// Success modal
window.showSuccessModal = function showSuccessModal() {
  document.getElementById('successModal').classList.add('show');
}

window.closeSuccessModal = function closeSuccessModal() {
  document.getElementById('successModal').classList.remove('show');
  showRequestsList();
}

// Utility functions
function getStatusInfo(status) {
  const statuses = {
    pending: { label: 'Chờ xử lý', icon: 'fas fa-clock' },
    accepted: { label: 'Đã chấp nhận', icon: 'fas fa-check-circle' },
    rejected: { label: 'Bị từ chối', icon: 'fas fa-times-circle' },
    cancelled: { label: 'Đã hủy', icon: 'fas fa-ban' },
    completed: { label: 'Hoàn thành', icon: 'fas fa-check-double' }
  };
  return statuses[status] || { label: status, icon: 'fas fa-question' };
}

function getStatusLabel(status) {
  const labels = {
    all: 'Tất cả',
    pending: 'Chờ xử lý',
    accepted: 'Đã chấp nhận',
    rejected: 'Bị từ chối',
    cancelled: 'Đã hủy'
  };
  return labels[status] || status;
}

function getLevelLabel(level) {
  const levels = {
    primary_school: 'Tiểu học',
    middle_school: 'THCS',
    high_school: 'THPT',
    university: 'Đại học'
  };
  return levels[level] || level;
}

function getLocationLabel(type) {
  const types = {
    online: 'Online',
    student_home: 'Tại nhà học sinh',
    tutor_home: 'Tại nhà gia sư',
    other: 'Địa điểm khác'
  };
  return types[type] || type;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN');
}

function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN');
}