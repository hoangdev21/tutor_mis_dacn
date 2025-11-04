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

// Load schedule (accepted and completed bookings)
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
    // Get all bookings (no status filter - we'll filter on frontend)
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
      // Filter to only show accepted and completed bookings
      const allBookings = data.data || [];
      acceptedBookings = allBookings.filter(b => b.status === 'accepted' || b.status === 'completed');
      
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

  // Group bookings by status and date
  const upcoming = bookings.filter(b => {
    // Only consider accepted bookings that haven't started yet
    if (b.status !== 'accepted') return false;
    return new Date(b.schedule?.startDate) > new Date();
  });
  
  const ongoing = bookings.filter(b => {
    // Only consider accepted bookings that are currently running
    if (b.status !== 'accepted') return false;
    const startDate = new Date(b.schedule?.startDate);
    const now = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + (b.schedule?.duration || 0));
    return startDate <= now && now <= endDate;
  });
  
  const past = bookings.filter(b => {
    // Include both completed bookings AND accepted bookings that have ended by date
    const startDate = new Date(b.schedule?.startDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + (b.schedule?.duration || 0));
    
    // If status is completed, always show in past
    if (b.status === 'completed') return true;
    
    // If status is accepted but end date has passed, show in past
    if (b.status === 'accepted' && endDate < new Date()) return true;
    
    return false;
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
  
  let statusClass = 'upcoming';
  let statusLabel = 'Sắp bắt đầu';
  let statusIcon = 'fa-clock';
  
  // Check booking status first
  if (booking.status === 'completed') {
    statusClass = 'past';
    statusLabel = 'Đã kết thúc';
    statusIcon = 'fa-check-circle';
  } else if (startDate <= now && now <= endDate) {
    statusClass = 'ongoing';
    statusLabel = 'Đang dạy';
    statusIcon = 'fa-play-circle';
  } else if (endDate < now) {
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
            <i class="fas fa-calendar-week"></i>
            <div>
              <small>Lịch học</small>
              <strong>${booking.schedule?.daysPerWeek || 0} buổi/tuần</strong>
            </div>
          </div>
          <div class="schedule-info-item">
            <i class="fas fa-hourglass-end"></i>
            <div>
              <small>Thời lượng buổi</small>
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

        <!-- Progress Bar -->
        <div class="schedule-progress">
          <div class="progress-info">
            <span class="progress-label">Tiến độ khóa học</span>
            <span class="progress-percentage">${calculateProgressPercentage(booking)}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${calculateProgressPercentage(booking)}%"></div>
          </div>
          <div class="progress-stats">
            <span><i class="fas fa-graduation-cap"></i> ${calculateCompletedSessions(booking)} / ${calculateTotalSessionsTutorSchedule(booking)} buổi</span>
            <span><i class="fas fa-clock"></i> ${calculateCompletedHours(booking)} / ${calculateTotalHoursTutorSchedule(booking)} giờ</span>
          </div>
        </div>

        <!-- Pricing Info -->
        <div class="schedule-pricing">
          <div class="pricing-item">
            <i class="fas fa-dollar-sign"></i>
            <div>
              <small>Học phí/giờ</small>
              <strong>${formatCurrency(booking.pricing?.hourlyRate || 0)}</strong>
            </div>
          </div>
          <div class="pricing-item">
            <i class="fas fa-chart-line"></i>
            <div>
              <small>Học phí/tháng</small>
              <strong>${formatCurrency(calculateMonthlyPriceTutorSchedule(booking))}</strong>
            </div>
          </div>
          <div class="pricing-item">
            <i class="fas fa-money-bill-wave"></i>
            <div>
              <small>Tổng học phí</small>
              <strong class="total-price">${formatCurrency(calculateTotalPriceTutorSchedule(booking))}</strong>
            </div>
          </div>
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
          ${booking.status === 'accepted' && startDate <= now && now <= endDate ? `
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
          <p><strong>Tổng số giờ:</strong> ${calculateTotalHoursTutorSchedule(booking)} giờ</p>
          <p><strong>Tổng thu nhập dự kiến:</strong> ${formatCurrency(calculateTotalPriceTutorSchedule(booking))}</p>
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

// Show success popup
window.showSuccessPopup = function showSuccessPopup(message, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'success-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;

  const popup = document.createElement('div');
  popup.style.cssText = `
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    border-radius: 15px;
    padding: 40px;
    max-width: 450px;
    width: 90%;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease-out;
    text-align: center;
  `;

  popup.innerHTML = `
    <div class="confirmation-popup-content">
      <div class="confirmation-popup-icon">
        <i class="fas fa-check-circle"></i>
      </div>
      <h3 class="confirmation-popup-title">Thành Công</h3>
      <p class="confirmation-popup-message">${message}</p>
      <div class="confirmation-popup-actions" style="justify-content: center;">
        <button class="btn-confirm" onclick="this.closest('.success-overlay').remove()">
          <i class="fas fa-check"></i> Đóng
        </button>
      </div>
    </div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  const closeBtn = popup.querySelector('.btn-confirm');
  closeBtn.addEventListener('click', () => {
    popup.style.animation = 'fadeOut 0.3s ease-out';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease-out';
    
    setTimeout(() => {
      overlay.remove();
      if (onClose) onClose();
    }, 300);
  });
};

// Show error popup
window.showErrorPopup = function showErrorPopup(message, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'error-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;

  const popup = document.createElement('div');
  popup.style.cssText = `
    background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
    border-radius: 15px;
    padding: 40px;
    max-width: 450px;
    width: 90%;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease-out;
    text-align: center;
  `;

  popup.innerHTML = `
    <div class="confirmation-popup-content">
      <div class="confirmation-popup-icon">
        <i class="fas fa-exclamation-circle"></i>
      </div>
      <h3 class="confirmation-popup-title">Lỗi</h3>
      <p class="confirmation-popup-message">${message}</p>
      <div class="confirmation-popup-actions" style="justify-content: center;">
        <button class="btn-confirm" onclick="this.closest('.error-overlay').remove()" style="background: white; color: #eb3349;">
          <i class="fas fa-times"></i> Đóng
        </button>
      </div>
    </div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  const closeBtn = popup.querySelector('.btn-confirm');
  closeBtn.addEventListener('click', () => {
    popup.style.animation = 'fadeOut 0.3s ease-out';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease-out';
    
    setTimeout(() => {
      overlay.remove();
      if (onClose) onClose();
    }, 300);
  });
};

// Show confirmation popup
window.showConfirmationPopup = function showConfirmationPopup(message, onConfirm, onCancel) {
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.className = 'confirmation-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;

  // Create popup container
  const popup = document.createElement('div');
  popup.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 15px;
    padding: 40px;
    max-width: 450px;
    width: 90%;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease-out;
  `;

  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    @keyframes fadeOut {
      from {
        opacity: 1;
        transform: scale(1);
      }
      to {
        opacity: 0;
        transform: scale(0.9);
      }
    }

    .confirmation-popup-content {
      text-align: center;
    }

    .confirmation-popup-icon {
      font-size: 60px;
      color: white;
      margin-bottom: 20px;
    }

    .confirmation-popup-title {
      font-size: 24px;
      font-weight: 600;
      color: white;
      margin-bottom: 15px;
    }

    .confirmation-popup-message {
      font-size: 16px;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 30px;
      line-height: 1.5;
    }

    .confirmation-popup-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .confirmation-popup-actions button {
      padding: 12px 30px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      min-width: 120px;
    }

    .btn-confirm {
      background: white;
      color: #667eea;
    }

    .btn-confirm:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }

    .btn-cancel {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }

    .btn-cancel:hover {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.5);
    }
  `;
  document.head.appendChild(style);

  // Create popup content
  popup.innerHTML = `
    <div class="confirmation-popup-content">
      <div class="confirmation-popup-icon">
        <i class="fas fa-exclamation-circle"></i>
      </div>
      <h3 class="confirmation-popup-title">Xác Nhận</h3>
      <p class="confirmation-popup-message">${message}</p>
      <div class="confirmation-popup-actions">
        <button class="btn-cancel" onclick="this.closest('.confirmation-overlay').remove()">
          <i class="fas fa-times"></i> Hủy
        </button>
        <button class="btn-confirm">
          <i class="fas fa-check"></i> Xác Nhận
        </button>
      </div>
    </div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Handle button clicks
  const confirmBtn = popup.querySelector('.btn-confirm');
  const cancelBtn = popup.querySelector('.btn-cancel');

  confirmBtn.addEventListener('click', () => {
    // Add fade out animation
    popup.style.animation = 'fadeOut 0.3s ease-out';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease-out';
    
    setTimeout(() => {
      overlay.remove();
      if (onConfirm) onConfirm();
    }, 300);
  });

  cancelBtn.addEventListener('click', () => {
    // Add fade out animation
    popup.style.animation = 'fadeOut 0.3s ease-out';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease-out';
    
    setTimeout(() => {
      overlay.remove();
      if (onCancel) onCancel();
    }, 300);
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      cancelBtn.click();
    }
  });
};

// Complete schedule
window.completeSchedule = async function completeSchedule(bookingId) {
  showConfirmationPopup(
    'Bạn có chắc chắn muốn hoàn thành lịch dạy này?',
    async () => {
      // On confirm
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
          showSuccessPopup('Đã hoàn thành lịch dạy thành công!', () => {
            loadSchedule();
          });
        } else {
          throw new Error(data.message || 'Không thể hoàn thành lịch dạy');
        }
      } catch (error) {
        console.error('Complete error:', error);
        showErrorPopup(`Lỗi: ${error.message}`);
      }
    },
    () => {
      // On cancel
      console.log('Cancelled completing schedule');
    }
  );
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

// Calculate total hours for tutor schedule
function calculateTotalHoursTutorSchedule(booking) {
  const schedule = booking.schedule || {};
  
  // Get days per week
  const daysPerWeek = schedule.daysPerWeek || 0;
  
  // Get hours per session
  const hoursPerSession = schedule.hoursPerSession || 0;
  
  // Get duration in months
  const duration = schedule.duration || 0;
  
  // Calculate: (days per week) × (4 weeks per month) × (hours per session) × (duration in months)
  const totalHours = daysPerWeek * 4 * hoursPerSession * duration;
  
  return totalHours;
}

// Calculate total price for tutor schedule
function calculateTotalPriceTutorSchedule(booking) {
  const pricing = booking.pricing || {};
  const schedule = booking.schedule || {};
  
  // Get hourly rate
  const hourlyRate = pricing.hourlyRate || 0;
  
  // Get days per week
  const daysPerWeek = schedule.daysPerWeek || 0;
  
  // Get hours per session
  const hoursPerSession = schedule.hoursPerSession || 0;
  
  // Get duration in months
  const duration = schedule.duration || 0;
  
  // Calculate: (days per week) × (4 weeks per month) × (hours per session) × (hourly rate) × (duration in months)
  const totalPrice = daysPerWeek * 4 * hoursPerSession * hourlyRate * duration;
  
  return totalPrice;
}

// Calculate monthly price for tutor schedule
function calculateMonthlyPriceTutorSchedule(booking) {
  const pricing = booking.pricing || {};
  const schedule = booking.schedule || {};
  
  const hourlyRate = pricing.hourlyRate || 0;
  const hoursPerSession = schedule.hoursPerSession || 0;
  const daysPerWeek = schedule.daysPerWeek || 0;
  
  // Calculate: hourly rate × hours per session × days per week × 4 weeks per month
  const monthlyPrice = hourlyRate * hoursPerSession * daysPerWeek * 4;
  
  return monthlyPrice;
}

// Calculate total sessions for tutor schedule
function calculateTotalSessionsTutorSchedule(booking) {
  const schedule = booking.schedule || {};
  
  const daysPerWeek = schedule.daysPerWeek || 0;
  const duration = schedule.duration || 0;
  
  // Calculate: (days per week) × (4 weeks per month) × (duration in months)
  const totalSessions = daysPerWeek * 4 * duration;
  
  return totalSessions;
}

// Calculate completed sessions (based on elapsed time from start date)
function calculateCompletedSessions(booking) {
  const schedule = booking.schedule || {};
  const startDate = new Date(schedule.startDate);
  const now = new Date();
  const daysPerWeek = schedule.daysPerWeek || 0;
  
  if (now < startDate) return 0;
  
  // Calculate weeks elapsed
  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksElapsed = Math.floor((now - startDate) / millisecondsPerWeek);
  
  // Calculate completed sessions
  const completedSessions = Math.floor(weeksElapsed * daysPerWeek);
  
  return completedSessions;
}

// Calculate completed hours (sessions × hours per session)
function calculateCompletedHours(booking) {
  const schedule = booking.schedule || {};
  const completedSessions = calculateCompletedSessions(booking);
  const hoursPerSession = schedule.hoursPerSession || 0;
  
  const completedHours = completedSessions * hoursPerSession;
  
  return completedHours;
}

// Calculate progress percentage
function calculateProgressPercentage(booking) {
  const schedule = booking.schedule || {};
  const startDate = new Date(schedule.startDate);
  const duration = schedule.duration || 0;
  const now = new Date();
  
  // Calculate end date
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + duration);
  
  if (now < startDate) return 0;
  if (now > endDate) return 100;
  
  const totalDays = endDate - startDate;
  const elapsedDays = now - startDate;
  
  const percentage = Math.round((elapsedDays / totalDays) * 100);
  
  return Math.min(percentage, 100);
}