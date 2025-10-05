// Tutor Schedule Management
const API_URL = window.API_BASE_URL || 'http://localhost:5000/api';

let acceptedBookings = [];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Tutor Schedule page loaded');
  
  // Check authentication
  const token = getToken();
  if (!token) {
    window.location.href = '../../index.html';
    return;
  }

  // Load accepted bookings
  loadSchedule();
});

// Get token from localStorage
function getToken() {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  
  if (!token) {
    console.warn('⚠️ No token found in localStorage');
  }
  
  return token;
}

// Load schedule (accepted bookings)
async function loadSchedule() {
  const token = getToken();
  console.log('🔑 Loading schedule with token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
  
  if (!token) {
    console.error('❌ No token found, redirecting to login');
    alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    window.location.href = '../../index.html';
    return;
  }

  const container = document.getElementById('scheduleContainer');
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Đang tải lịch dạy...</p>
    </div>
  `;

  try {
    console.log('📤 Fetching:', `${API_URL}/bookings?status=accepted`);
    const response = await fetch(`${API_URL}/bookings?status=accepted`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Response status:', response.status);
    const data = await response.json();
    console.log('📋 Response data:', data);

    if (response.ok && data.success) {
      acceptedBookings = data.data || [];
      
      // Sort by start date
      acceptedBookings.sort((a, b) => {
        const dateA = new Date(a.schedule?.startDate);
        const dateB = new Date(b.schedule?.startDate);
        return dateA - dateB;
      });
      
      displaySchedule(acceptedBookings);
    } else {
      throw new Error(data.message || 'Không thể tải lịch dạy');
    }
  } catch (error) {
    console.error('Load schedule error:', error);
    container.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Lỗi tải dữ liệu</h3>
        <p>${error.message}</p>
        <button class="btn btn-primary" onclick="loadSchedule()">
          <i class="fas fa-redo"></i>
          Thử Lại
        </button>
      </div>
    `;
  }
}

// Display schedule
function displaySchedule(bookings) {
  const container = document.getElementById('scheduleContainer');
  
  if (bookings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-times"></i>
        <h3>Chưa có lịch dạy</h3>
        <p>Bạn chưa chấp nhận yêu cầu nào. Vào mục "Yêu Cầu Mới" để xem và chấp nhận yêu cầu từ học sinh.</p>
        <button class="btn btn-primary" onclick="window.location.href='./new_request.html'">
          <i class="fas fa-clipboard-list"></i>
          Xem Yêu Cầu Mới
        </button>
      </div>
    `;
    return;
  }

  // Group bookings by status
  const upcoming = bookings.filter(b => new Date(b.schedule?.startDate) > new Date());
  const ongoing = bookings.filter(b => {
    const startDate = new Date(b.schedule?.startDate);
    const now = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + (b.schedule?.duration || 0));
    return startDate <= now && now <= endDate;
  });
  const past = bookings.filter(b => {
    const startDate = new Date(b.schedule?.startDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + (b.schedule?.duration || 0));
    return endDate < new Date();
  });

  container.innerHTML = `
    <div class="schedule-tabs">
      <button class="schedule-tab active" data-tab="upcoming">
        <i class="fas fa-clock"></i>
        Sắp tới (${upcoming.length})
      </button>
      <button class="schedule-tab" data-tab="ongoing">
        <i class="fas fa-play-circle"></i>
        Đang dạy (${ongoing.length})
      </button>
      <button class="schedule-tab" data-tab="past">
        <i class="fas fa-check-circle"></i>
        Đã kết thúc (${past.length})
      </button>
    </div>

    <div class="schedule-content">
      <div class="schedule-panel active" id="upcomingPanel">
        ${upcoming.length > 0 ? createScheduleGrid(upcoming) : '<div class="empty-panel">Không có lịch sắp tới</div>'}
      </div>
      <div class="schedule-panel" id="ongoingPanel">
        ${ongoing.length > 0 ? createScheduleGrid(ongoing) : '<div class="empty-panel">Không có lịch đang dạy</div>'}
      </div>
      <div class="schedule-panel" id="pastPanel">
        ${past.length > 0 ? createScheduleGrid(past) : '<div class="empty-panel">Không có lịch đã kết thúc</div>'}
      </div>
    </div>
  `;

  // Set up tab switching
  const tabs = document.querySelectorAll('.schedule-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabName = tab.dataset.tab;
      document.querySelectorAll('.schedule-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`${tabName}Panel`).classList.add('active');
    });
  });
}

// Create schedule grid
function createScheduleGrid(bookings) {
  return `
    <div class="schedule-grid">
      ${bookings.map(booking => createScheduleCard(booking)).join('')}
    </div>
  `;
}

// Create schedule card
function createScheduleCard(booking) {
  const student = booking.student || {};
  const studentProfile = student.profile || {};
  const startDate = new Date(booking.schedule?.startDate);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + (booking.schedule?.duration || 0));
  const now = new Date();
  
  const isUpcoming = startDate > now;
  const isOngoing = startDate <= now && now <= endDate;
  const isPast = endDate < now;
  
  let statusClass = 'upcoming';
  let statusLabel = 'Sắp bắt đầu';
  let statusIcon = 'fa-clock';
  
  if (isOngoing) {
    statusClass = 'ongoing';
    statusLabel = 'Đang dạy';
    statusIcon = 'fa-play-circle';
  } else if (isPast) {
    statusClass = 'past';
    statusLabel = 'Đã kết thúc';
    statusIcon = 'fa-check-circle';
  }
  
  return `
    <div class="schedule-card ${statusClass}">
      <div class="schedule-card-header">
        <div class="student-info-mini">
          <img src="${studentProfile.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(studentProfile.fullName || 'S')}" 
               alt="${studentProfile.fullName || 'Student'}" 
               class="student-avatar-mini">
          <div>
            <h4>${studentProfile.fullName || 'Học sinh'}</h4>
            <p class="student-email">${student.email || ''}</p>
          </div>
        </div>
        <span class="schedule-status ${statusClass}">
          <i class="fas ${statusIcon}"></i>
          ${statusLabel}
        </span>
      </div>

      <div class="schedule-card-body">
        <div class="schedule-subject">
          <i class="fas fa-book"></i>
          <span>${booking.subject?.name || 'N/A'} - ${getLevelLabel(booking.subject?.level)}</span>
        </div>
        
        <div class="schedule-info-grid">
          <div class="schedule-info-item">
            <i class="fas fa-calendar-day"></i>
            <div>
              <small>Ngày bắt đầu</small>
              <strong>${formatDate(booking.schedule?.startDate)}</strong>
            </div>
          </div>
          <div class="schedule-info-item">
            <i class="fas fa-calendar-check"></i>
            <div>
              <small>Kết thúc dự kiến</small>
              <strong>${formatDate(endDate)}</strong>
            </div>
          </div>
          <div class="schedule-info-item">
            <i class="fas fa-clock"></i>
            <div>
              <small>Lịch học</small>
              <strong>${booking.schedule?.daysPerWeek || 0} buổi/tuần</strong>
            </div>
          </div>
          <div class="schedule-info-item">
            <i class="fas fa-hourglass-half"></i>
            <div>
              <small>Thời lượng</small>
              <strong>${booking.schedule?.hoursPerSession || 0}h/buổi</strong>
            </div>
          </div>
        </div>

        <div class="schedule-time">
          <i class="fas fa-business-time"></i>
          <span>${booking.schedule?.preferredTime || 'Linh hoạt'}</span>
        </div>

        <div class="schedule-location">
          <i class="fas fa-map-marker-alt"></i>
          <span>${getLocationLabel(booking.location?.type)}</span>
        </div>
      </div>

      <div class="schedule-card-footer">
        <div class="schedule-actions">
          <button class="btn-icon" onclick="viewScheduleDetail('${booking._id}')" title="Xem chi tiết">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn-icon" onclick="contactStudent('${booking.student?._id}')" title="Liên hệ học sinh">
            <i class="fas fa-comment"></i>
          </button>
          ${isOngoing ? `
            <button class="btn-icon btn-success" onclick="completeSchedule('${booking._id}')" title="Hoàn thành">
              <i class="fas fa-check"></i>
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// View schedule detail
window.viewScheduleDetail = function viewScheduleDetail(bookingId) {
  const booking = acceptedBookings.find(b => b._id === bookingId);
  if (!booking) return;
  
  const student = booking.student || {};
  const studentProfile = student.profile || {};
  const startDate = new Date(booking.schedule?.startDate);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + (booking.schedule?.duration || 0));
  
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.id = 'scheduleDetailModal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h3><i class="fas fa-info-circle"></i> Chi Tiết Lịch Dạy</h3>
        <button class="modal-close" onclick="closeScheduleDetailModal()">
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
          <p><strong>Môn:</strong> ${booking.subject?.name || 'N/A'}</p>
          <p><strong>Cấp học:</strong> ${getLevelLabel(booking.subject?.level)}</p>
        </div>

        <!-- Schedule -->
        <div class="detail-section">
          <h4><i class="fas fa-calendar-alt"></i> Lịch Học</h4>
          <p><strong>Ngày bắt đầu:</strong> ${formatDate(booking.schedule?.startDate)}</p>
          <p><strong>Kết thúc dự kiến:</strong> ${formatDate(endDate)}</p>
          <p><strong>Thời gian mong muốn:</strong> ${booking.schedule?.preferredTime || 'Linh hoạt'}</p>
          <p><strong>Số buổi/tuần:</strong> ${booking.schedule?.daysPerWeek || 0} buổi</p>
          <p><strong>Số giờ/buổi:</strong> ${booking.schedule?.hoursPerSession || 0} giờ</p>
          <p><strong>Thời lượng:</strong> ${booking.schedule?.duration || 0} tháng</p>
        </div>

        <!-- Location -->
        <div class="detail-section">
          <h4><i class="fas fa-map-marker-alt"></i> Địa Điểm</h4>
          <p><strong>Hình thức:</strong> ${getLocationLabel(booking.location?.type)}</p>
          ${booking.location?.address ? `<p><strong>Địa chỉ:</strong> ${booking.location.address}</p>` : ''}
        </div>

        <!-- Notes -->
        ${booking.studentNote ? `
        <div class="detail-section">
          <h4><i class="fas fa-sticky-note"></i> Ghi Chú Từ Học Sinh</h4>
          <p>${booking.studentNote}</p>
        </div>
        ` : ''}

        <!-- Your Response -->
        ${booking.tutorResponse?.message ? `
        <div class="detail-section">
          <h4><i class="fas fa-comment"></i> Tin Nhắn Của Bạn</h4>
          <div class="response-box">
            <p>${booking.tutorResponse.message}</p>
            <small><i class="fas fa-clock"></i> ${formatDateTime(booking.tutorResponse.respondedAt)}</small>
          </div>
        </div>
        ` : ''}

        <!-- Pricing -->
        ${booking.pricing?.hourlyRate ? `
        <div class="detail-section">
          <h4><i class="fas fa-money-bill-wave"></i> Học Phí</h4>
          <p><strong>Học phí/giờ:</strong> ${formatCurrency(booking.pricing.hourlyRate)}</p>
          <p><strong>Tổng số giờ:</strong> ${booking.pricing.totalHours || 0} giờ</p>
          <p><strong>Tổng thu nhập dự kiến:</strong> ${formatCurrency(booking.pricing.totalAmount || 0)}</p>
        </div>
        ` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeScheduleDetailModal()">Đóng</button>
        <button class="btn btn-primary" onclick="closeScheduleDetailModal(); contactStudent('${booking.student?._id}')">
          <i class="fas fa-comment"></i> Nhắn Tin
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Close schedule detail modal
window.closeScheduleDetailModal = function closeScheduleDetailModal() {
  const modal = document.getElementById('scheduleDetailModal');
  if (modal) {
    modal.remove();
  }
}

// Contact student
window.contactStudent = function contactStudent(studentId) {
  // Navigate to messages page with student selected
  window.location.href = `./messages.html?recipientId=${studentId}`;
}

// Complete schedule
window.completeSchedule = async function completeSchedule(bookingId) {
  if (!confirm('Xác nhận hoàn thành lịch dạy này?')) {
    return;
  }

  const token = getToken();

  try {
    const response = await fetch(`${API_URL}/bookings/${bookingId}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert('Đã hoàn thành lịch dạy!');
      loadSchedule();
    } else {
      throw new Error(data.message || 'Không thể hoàn thành lịch dạy');
    }
  } catch (error) {
    console.error('Complete error:', error);
    alert(`Lỗi: ${error.message}`);
  }
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
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN');
}
