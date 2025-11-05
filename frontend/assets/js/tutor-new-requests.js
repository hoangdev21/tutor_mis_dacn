// Tutor New Requests Management
const API_URL = window.API_BASE_URL || 'http://localhost:5000/api';

let pendingRequests = [];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Tutor New Requests page loaded');
  
  // Check authentication
  const token = getToken();
  if (!token) {
    window.location.href = '../../index.html';
    return;
  }

  // Load pending requests
  loadPendingRequests();
});

// Get token from localStorage
function getToken() {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  
  if (!token) {
    console.warn('⚠️ No token found in localStorage');
  }
  
  return token;
}

// Load pending requests from API
async function loadPendingRequests() {
  const token = getToken();
  console.log('🔑 Loading pending requests with token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
  
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
    console.log('📤 Fetching:', `${API_URL}/bookings/pending`);
    const response = await fetch(`${API_URL}/bookings/pending`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Response status:', response.status);
    const data = await response.json();
    console.log('📋 Response data:', data);

    if (response.ok && data.success) {
      pendingRequests = data.data || [];
      displayRequests(pendingRequests);
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
        <button class="btn btn-primary" onclick="loadPendingRequests()">
          <i class="fas fa-redo"></i>
          Thử Lại
        </button>
      </div>
    `;
  }
}

// Display requests
function displayRequests(requests) {
  const container = document.getElementById('requestsContainer');
  
  if (requests.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>Chưa có yêu cầu mới</h3>
        <p>Hiện tại không có yêu cầu nào từ học sinh.</p>
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
  const student = request.student || {};
  const studentProfile = student.profile || {};
  
  return `
    <div class="request-card pending" id="request-${request._id}">
      <div class="request-header">
        <div class="tutor-info-mini">
          <img src="${studentProfile.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(studentProfile.fullName || 'S')}" 
               alt="${studentProfile.fullName || 'Student'}" 
               class="tutor-avatar-mini">
          <div>
            <h4>${studentProfile.fullName || 'Học sinh'}</h4>
            <p class="tutor-email">${student.email || ''}</p>
          </div>
        </div>
        <span class="status-badge pending">
          <i class="fas fa-clock"></i>
          Chờ xử lý
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
          <i class="fas fa-hourglass-half"></i>
          <span>Thời lượng: ${request.schedule?.duration || 0} tháng</span>
        </div>
        <div class="request-info-row">
          <i class="fas fa-map-marker-alt"></i>
          <span>${getLocationLabel(request.location?.type)}</span>
        </div>
        ${request.location?.address ? `
        <div class="request-info-row">
          <i class="fas fa-map-pin"></i>
          <span>${request.location.address}</span>
        </div>
        ` : ''}
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
          ${formatDateTime(request.createdAt)}
        </small>
        <div class="request-actions">
          <button class="btn-icon" onclick="acceptRequest('${request._id}')" title="Chấp nhận">
            <i class="fas fa-check"></i>
          </button>
          <button class="btn-icon" onclick="rejectRequest('${request._id}')" title="Từ chối">
            <i class="fas fa-times"></i>
          </button>
          <button class="btn-icon" onclick="viewRequestDetail('${request._id}')" title="Xem chi tiết">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Accept request
window.acceptRequest = async function acceptRequest(requestId) {
  const request = pendingRequests.find(r => r._id === requestId);
  if (!request) return;
  
  showAcceptModal(request);
}

// Show accept modal
function showAcceptModal(request) {
  const student = request.student || {};
  const studentProfile = student.profile || {};
  
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.id = 'acceptRequestModal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 550px;">
      <div class="modal-header">
        <h3><i class="fas fa-check-circle"></i> Chấp Nhận Yêu Cầu</h3>
        <button class="modal-close" onclick="closeAcceptModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="alert alert-success">
          <i class="fas fa-info-circle"></i>
          <span>Bạn đang chấp nhận yêu cầu từ <strong>${studentProfile.fullName || 'Học sinh'}</strong></span>
        </div>
        
        <div class="form-group">
          <label for="acceptMessage">Tin nhắn gửi đến học sinh:</label>
          <textarea id="acceptMessage" rows="4" class="form-control" 
                    placeholder="Nhập tin nhắn của bạn (tuỳ chọn)...">Cảm ơn bạn đã tin tưởng! Tôi đã chấp nhận yêu cầu và sẽ liên hệ với bạn sớm để sắp xếp lịch học cụ thể.</textarea>
        </div>

        <div class="schedule-summary">
          <h4><i class="fas fa-calendar-check"></i> Thông Tin Lịch Học</h4>
          <div class="summary-item">
            <span class="label">Môn học:</span>
            <span class="value">${request.subject?.name || 'N/A'} - ${getLevelLabel(request.subject?.level)}</span>
          </div>
          <div class="summary-item">
            <span class="label">Bắt đầu:</span>
            <span class="value">${formatDate(request.schedule?.startDate)}</span>
          </div>
          <div class="summary-item">
            <span class="label">Lịch học:</span>
            <span class="value">${request.schedule?.daysPerWeek || 0} buổi/tuần, ${request.schedule?.hoursPerSession || 0}h/buổi</span>
          </div>
          <div class="summary-item">
            <span class="label">Thời lượng:</span>
            <span class="value">${request.schedule?.duration || 0} tháng</span>
          </div>
          <div class="summary-item">
            <span class="label">Địa điểm:</span>
            <span class="value">${getLocationLabel(request.location?.type)}</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeAcceptModal()">
          <i class="fas fa-times"></i> Hủy
        </button>
        <button class="btn btn-success" onclick="confirmAcceptRequest('${request._id}')">
          <i class="fas fa-check"></i> Xác Nhận Chấp Nhận
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Close accept modal
window.closeAcceptModal = function closeAcceptModal() {
  const modal = document.getElementById('acceptRequestModal');
  if (modal) {
    modal.remove();
  }
}

// Confirm accept request
window.confirmAcceptRequest = async function confirmAcceptRequest(requestId) {
  const message = document.getElementById('acceptMessage').value.trim();
  const token = getToken();
  
  // Disable button
  const confirmBtn = event.target;
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

  try {
    const response = await fetch(`${API_URL}/bookings/${requestId}/accept`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        message: message || 'Gia sư đã chấp nhận yêu cầu của bạn' 
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      closeAcceptModal();
      showSuccessNotification('Đã chấp nhận yêu cầu thành công! Yêu cầu đã được thêm vào lịch dạy của bạn.');
      
      // Remove card from UI with animation
      const card = document.getElementById(`request-${requestId}`);
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => {
          card.remove();
          
          // Check if there are any requests left
          const remainingCards = document.querySelectorAll('.request-card');
          if (remainingCards.length === 0) {
            displayRequests([]);
          }
        }, 300);
      }
    } else {
      throw new Error(data.message || 'Không thể chấp nhận yêu cầu');
    }
  } catch (error) {
    console.error('Accept error:', error);
    alert(`Lỗi: ${error.message}`);
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<i class="fas fa-check"></i> Xác Nhận Chấp Nhận';
  }
}

// Reject request
window.rejectRequest = async function rejectRequest(requestId) {
  const request = pendingRequests.find(r => r._id === requestId);
  if (!request) return;
  
  showRejectModal(request);
}

// Show reject modal
function showRejectModal(request) {
  const student = request.student || {};
  const studentProfile = student.profile || {};
  
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.id = 'rejectRequestModal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 550px;">
      <div class="modal-header">
        <h3><i class="fas fa-times-circle"></i> Từ Chối Yêu Cầu</h3>
        <button class="modal-close" onclick="closeRejectModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i>
          <span>Bạn đang từ chối yêu cầu từ <strong>${studentProfile.fullName || 'Học sinh'}</strong></span>
        </div>
        
        <div class="form-group">
          <label for="rejectMessage">Lý do từ chối: <span class="required">*</span></label>
          <textarea id="rejectMessage" rows="4" class="form-control" 
                    placeholder="Vui lòng nhập lý do từ chối để học sinh hiểu rõ hơn..."
                    required></textarea>
          <small class="form-text">Việc giải thích rõ ràng sẽ giúp học sinh hiểu và tìm gia sư phù hợp hơn.</small>
        </div>

        <div class="request-summary">
          <h4>Thông tin yêu cầu:</h4>
          <p><strong>Môn học:</strong> ${request.subject?.name || 'N/A'} - ${getLevelLabel(request.subject?.level)}</p>
          <p><strong>Lịch học:</strong> ${request.schedule?.daysPerWeek || 0} buổi/tuần, ${request.schedule?.hoursPerSession || 0}h/buổi</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeRejectModal()">
          <i class="fas fa-arrow-left"></i> Quay Lại
        </button>
        <button class="btn btn-danger" onclick="confirmRejectRequest('${request._id}')">
          <i class="fas fa-times"></i> Xác Nhận Từ Chối
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Close reject modal
window.closeRejectModal = function closeRejectModal() {
  const modal = document.getElementById('rejectRequestModal');
  if (modal) {
    modal.remove();
  }
}

// Confirm reject request
window.confirmRejectRequest = async function confirmRejectRequest(requestId) {
  const message = document.getElementById('rejectMessage').value.trim();
  
  if (!message) {
    alert('Vui lòng nhập lý do từ chối');
    return;
  }
  
  const token = getToken();
  
  // Disable button
  const confirmBtn = event.target;
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

  try {
    const response = await fetch(`${API_URL}/bookings/${requestId}/reject`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        message: message
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      closeRejectModal();
      showSuccessNotification('Đã từ chối yêu cầu. Lý do của bạn đã được gửi đến học sinh.');
      
      // Remove card from UI with animation
      const card = document.getElementById(`request-${requestId}`);
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => {
          card.remove();
          
          // Check if there are any requests left
          const remainingCards = document.querySelectorAll('.request-card');
          if (remainingCards.length === 0) {
            displayRequests([]);
          }
        }, 300);
      }
    } else {
      throw new Error(data.message || 'Không thể từ chối yêu cầu');
    }
  } catch (error) {
    console.error('Reject error:', error);
    alert(`Lỗi: ${error.message}`);
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<i class="fas fa-times"></i> Xác Nhận Từ Chối';
  }
}

// View request detail
window.viewRequestDetail = function viewRequestDetail(requestId) {
  const request = pendingRequests.find(r => r._id === requestId);
  if (!request) return;
  
  showRequestDetailModal(request);
}

// Show request detail modal
function showRequestDetailModal(request) {
  const student = request.student || {};
  const studentProfile = student.profile || {};
  
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.id = 'requestDetailModal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h3>Chi Tiết Yêu Cầu</h3>
        <button class="modal-close" onclick="closeRequestDetailModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <!-- Student Info -->
        <div class="detail-section">
          <h4><i class="fas fa-user"></i> Thông Tin Học Sinh</h4>
          <div class="tutor-info-card">
            <img src="${studentProfile.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(studentProfile.fullName || 'S')}" 
                 alt="${studentProfile.fullName || 'Student'}" 
                 class="tutor-avatar">
            <div class="tutor-details">
              <h4>${studentProfile.fullName || 'Học sinh'}</h4>
              <p><i class="fas fa-envelope"></i> ${student.email || 'N/A'}</p>
              ${studentProfile.phone ? `<p><i class="fas fa-phone"></i> ${studentProfile.phone}</p>` : ''}
            </div>
          </div>
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
          <h4><i class="fas fa-sticky-note"></i> Ghi Chú</h4>
          <p>${request.studentNote}</p>
        </div>
        ` : ''}

        <!-- Pricing -->
        ${request.pricing?.hourlyRate ? `
        <div class="detail-section">
          <h4><i class="fas fa-money-bill-wave"></i> Học Phí</h4>
          <p><strong>Học phí/giờ:</strong> ${formatCurrency(request.pricing.hourlyRate)}</p>
        </div>
        ` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeRequestDetailModal()">Đóng</button>
        <button class="btn btn-danger" onclick="closeRequestDetailModal(); rejectRequest('${request._id}')">
          <i class="fas fa-times"></i> Từ Chối
        </button>
        <button class="btn btn-success" onclick="closeRequestDetailModal(); acceptRequest('${request._id}')">
          <i class="fas fa-check"></i> Chấp Nhận
        </button>
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

// Show success notification
function showSuccessNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'success-notification show';
  notification.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Utility functions
function getLevelLabel(level) {
  const levels = {
    'Tiểu học': 'Tiểu học',
    'THCS': 'THCS',
    'THPT': 'THPT',
    'Đại học': 'Đại học',
    'Người đi làm': 'Người đi làm',
    'Khác': 'Khác',
    'primary_school': 'Tiểu học',
    'middle_school': 'THCS',
    'high_school': 'THPT',
    'university': 'Đại học'
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