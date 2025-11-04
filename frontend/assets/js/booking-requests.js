// ===== BOOKING REQUESTS MANAGEMENT JAVASCRIPT =====

// API_BASE_URL is already defined in main.js
// const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;
let currentFilter = 'all';
let allBookings = [];
let currentBookingId = null;
let currentAction = null;
let selectedRating = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupEventListeners();
  loadBookings();
  loadStats();
  updateDate();
});

// Check authentication
function checkAuth() {
  const token = localStorage.getItem('token');
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  if (!token || !userData.id) {
    window.location.href = '../../index.html';
    return;
  }
  
  currentUser = userData;
  
  // Show student-specific actions
  if (userData.role === 'student') {
    document.getElementById('studentActions').style.display = 'block';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Filter tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.closest('.tab-btn').classList.add('active');
      
      currentFilter = e.target.closest('.tab-btn').dataset.status;
      filterBookings(currentFilter);
    });
  });
  
  // Rating stars
  document.querySelectorAll('#ratingStars i').forEach(star => {
    star.addEventListener('click', (e) => {
      const rating = parseInt(e.target.dataset.rating);
      selectRating(rating);
    });
  });
}

// Load bookings
async function loadBookings() {
  const token = localStorage.getItem('token');
  const container = document.getElementById('bookingsContainer');
  
  try {
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load bookings');
    }
    
    const data = await response.json();
    
    if (data.success && data.data) {
      allBookings = data.data;
      displayBookings(allBookings);
    } else {
      throw new Error('Invalid response');
    }
  } catch (error) {
    console.error('Load bookings error:', error);
    container.innerHTML = `
      <div class="alert alert-error">
        <i class="fas fa-exclamation-circle"></i>
        <p>Không thể tải danh sách lịch học</p>
      </div>
    `;
  }
}

// Display bookings
function displayBookings(bookings) {
  const container = document.getElementById('bookingsContainer');
  
  if (!bookings || bookings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-alt"></i>
        <h3>Chưa có yêu cầu nào</h3>
        <p>Bạn chưa có yêu cầu đặt lịch nào.</p>
        ${currentUser.role === 'student' ? `
          <button class="btn btn-primary" onclick="createNewBooking()">
            <i class="fas fa-plus"></i>
            Tạo yêu cầu mới
          </button>
        ` : ''}
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="bookings-list">
      ${bookings.map(booking => renderBookingCard(booking)).join('')}
    </div>
  `;
}

// Render booking card
function renderBookingCard(booking) {
  const isStudent = currentUser.role === 'student';
  const otherUser = isStudent ? booking.tutor : booking.student;
  const otherUserProfile = otherUser?.profile || {};
  const otherUserName = otherUserProfile.fullName || otherUser?.email || 'Người dùng';
  const otherUserAvatar = otherUserProfile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUserName)}&background=667eea&color=fff`;
  
  const statusClass = {
    'pending': 'warning',
    'accepted': 'success',
    'rejected': 'error',
    'cancelled': 'secondary',
    'completed': 'info'
  }[booking.status] || 'secondary';
  
  const statusText = {
    'pending': 'Chờ xử lý',
    'accepted': 'Đã chấp nhận',
    'rejected': 'Đã từ chối',
    'cancelled': 'Đã hủy',
    'completed': 'Hoàn thành'
  }[booking.status] || booking.status;
  
  const startDate = new Date(booking.schedule.startDate).toLocaleDateString('vi-VN');
  const totalAmount = booking.pricing.totalAmount || 0;
  
  // Action buttons based on role and status
  let actionButtons = '';
  
  if (booking.status === 'pending') {
    if (!isStudent) {
      // Tutor can accept/reject
      actionButtons = `
        <button class="btn btn-sm btn-success" onclick="openActionModal('${booking._id}', 'accept')">
          <i class="fas fa-check"></i> Chấp nhận
        </button>
        <button class="btn btn-sm btn-error" onclick="openActionModal('${booking._id}', 'reject')">
          <i class="fas fa-times"></i> Từ chối
        </button>
      `;
    } else {
      // Student can cancel
      actionButtons = `
        <button class="btn btn-sm btn-outline" onclick="cancelBooking('${booking._id}')">
          <i class="fas fa-ban"></i> Hủy yêu cầu
        </button>
      `;
    }
  } else if (booking.status === 'accepted') {
    if (!isStudent) {
      // Tutor can complete
      actionButtons = `
        <button class="btn btn-sm btn-primary" onclick="completeBooking('${booking._id}')">
          <i class="fas fa-check-circle"></i> Hoàn thành
        </button>
      `;
    }
    // Both can cancel
    actionButtons += `
      <button class="btn btn-sm btn-outline" onclick="cancelBooking('${booking._id}')">
        <i class="fas fa-ban"></i> Hủy
      </button>
    `;
  } else if (booking.status === 'completed' && isStudent && !booking.rating?.score) {
    // Student can rate completed booking
    actionButtons = `
      <button class="btn btn-sm btn-primary" onclick="openRatingModal('${booking._id}')">
        <i class="fas fa-star"></i> Đánh giá
      </button>
    `;
  }
  
  return `
    <div class="booking-card" data-booking-id="${booking._id}">
      <div class="booking-card-header">
        <div class="user-info">
          <img src="${otherUserAvatar}" alt="${otherUserName}" class="user-avatar-sm">
          <div>
            <h4>${otherUserName}</h4>
            <span class="role-badge">${isStudent ? 'Gia sư' : 'Học sinh'}</span>
          </div>
        </div>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
      
      <div class="booking-card-body">
        <div class="booking-info-grid">
          <div class="info-item">
            <i class="fas fa-book"></i>
            <div>
              <span class="label">Môn học</span>
              <span class="value">${booking.subject.name} - ${booking.subject.level}</span>
            </div>
          </div>
          <div class="info-item">
            <i class="fas fa-calendar"></i>
            <div>
              <span class="label">Ngày bắt đầu</span>
              <span class="value">${startDate}</span>
            </div>
          </div>
          <div class="info-item">
            <i class="fas fa-clock"></i>
            <div>
              <span class="label">Lịch học</span>
              <span class="value">${booking.schedule.daysPerWeek} buổi/tuần, ${booking.schedule.hoursPerSession}h/buổi</span>
            </div>
          </div>
          <div class="info-item">
            <i class="fas fa-money-bill-wave"></i>
            <div>
              <span class="label">Chi phí</span>
              <span class="value">${formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
        
        ${booking.rating?.score ? `
        <div class="booking-rating">
          <div class="stars">${generateStars(booking.rating.score)}</div>
          ${booking.rating.comment ? `<p class="rating-comment">${booking.rating.comment}</p>` : ''}
        </div>
        ` : ''}
      </div>
      
      <div class="booking-card-footer">
        <button class="btn btn-sm btn-outline" onclick="viewBookingDetail('${booking._id}')">
          <i class="fas fa-eye"></i> Chi tiết
        </button>
        ${actionButtons}
      </div>
    </div>
  `;
}

// Filter bookings
function filterBookings(status) {
  const filtered = status === 'all' 
    ? allBookings 
    : allBookings.filter(b => b.status === status);
  
  const titleMap = {
    'all': 'Tất cả yêu cầu',
    'pending': 'Yêu cầu chờ xử lý',
    'accepted': 'Yêu cầu đã chấp nhận',
    'rejected': 'Yêu cầu bị từ chối',
    'completed': 'Yêu cầu hoàn thành'
  };
  
  document.getElementById('listTitle').textContent = titleMap[status] || 'Tất cả yêu cầu';
  displayBookings(filtered);
}

// Load statistics
async function loadStats() {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) return;
    
    const data = await response.json();
    
    if (data.success && data.data) {
      document.getElementById('pendingCount').textContent = data.data.pending || 0;
      document.getElementById('acceptedCount').textContent = data.data.accepted || 0;
      document.getElementById('completedCount').textContent = data.data.completed || 0;
      document.getElementById('totalRevenue').textContent = formatCurrency(data.data.totalRevenue || 0);
    }
  } catch (error) {
    console.error('Load stats error:', error);
  }
}

// View booking detail
async function viewBookingDetail(bookingId) {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load booking');
    }
    
    const data = await response.json();
    
    if (data.success && data.data) {
      displayBookingDetail(data.data);
      document.getElementById('detailModal').classList.add('show');
    }
  } catch (error) {
    console.error('Load booking detail error:', error);
    alert('Không thể tải chi tiết yêu cầu');
  }
}

// Display booking detail
function displayBookingDetail(booking) {
  const isStudent = currentUser.role === 'student';
  const otherUser = isStudent ? booking.tutor : booking.student;
  const otherUserProfile = otherUser?.profile || {};
  const otherUserName = otherUserProfile.fullName || otherUser?.email || 'Người dùng';
  
  const modalBody = document.getElementById('detailModalBody');
  
  modalBody.innerHTML = `
    <div class="booking-detail">
      <div class="detail-section">
        <h3><i class="fas fa-user"></i> ${isStudent ? 'Gia sư' : 'Học sinh'}</h3>
        <p><strong>Tên:</strong> ${otherUserName}</p>
        <p><strong>Email:</strong> ${otherUser?.email || 'N/A'}</p>
      </div>
      
      <div class="detail-section">
        <h3><i class="fas fa-book"></i> Môn học</h3>
        <p><strong>Môn:</strong> ${booking.subject.name}</p>
        <p><strong>Trình độ:</strong> ${booking.subject.level}</p>
      </div>
      
      <div class="detail-section">
        <h3><i class="fas fa-calendar-alt"></i> Lịch học</h3>
        <p><strong>Ngày bắt đầu:</strong> ${new Date(booking.schedule.startDate).toLocaleDateString('vi-VN')}</p>
        <p><strong>Giờ học:</strong> ${booking.schedule.preferredTime}</p>
        <p><strong>Số buổi/tuần:</strong> ${booking.schedule.daysPerWeek} buổi</p>
        <p><strong>Số giờ/buổi:</strong> ${booking.schedule.hoursPerSession} giờ</p>
        <p><strong>Thời lượng:</strong> ${booking.schedule.duration} tuần</p>
      </div>
      
      <div class="detail-section">
        <h3><i class="fas fa-map-marker-alt"></i> Địa điểm</h3>
        <p><strong>Hình thức:</strong> ${getLocationTypeName(booking.location.type)}</p>
        ${booking.location.address ? `<p><strong>Địa chỉ:</strong> ${booking.location.address}</p>` : ''}
        ${booking.location.district ? `<p><strong>Quận/Huyện:</strong> ${booking.location.district}</p>` : ''}
        ${booking.location.city ? `<p><strong>Thành phố:</strong> ${booking.location.city}</p>` : ''}
      </div>
      
      <div class="detail-section">
        <h3><i class="fas fa-money-bill-wave"></i> Chi phí</h3>
        <p><strong>Học phí:</strong> ${formatCurrency(booking.pricing.hourlyRate)}/giờ</p>
        <p><strong>Tổng số giờ:</strong> ${calculateTotalHoursBooking(booking)} giờ</p>
        <p><strong>Tổng chi phí:</strong> ${formatCurrency(calculateTotalPriceBooking(booking))}</p>
      </div>
      
      ${booking.description ? `
      <div class="detail-section">
        <h3><i class="fas fa-align-left"></i> Mô tả</h3>
        <p>${booking.description}</p>
      </div>
      ` : ''}
      
      ${booking.studentNote ? `
      <div class="detail-section">
        <h3><i class="fas fa-sticky-note"></i> Ghi chú</h3>
        <p>${booking.studentNote}</p>
      </div>
      ` : ''}
      
      ${booking.tutorResponse?.message ? `
      <div class="detail-section">
        <h3><i class="fas fa-comment"></i> Phản hồi từ gia sư</h3>
        <p>${booking.tutorResponse.message}</p>
        <p class="text-muted"><small>${new Date(booking.tutorResponse.respondedAt).toLocaleString('vi-VN')}</small></p>
      </div>
      ` : ''}
    </div>
  `;
}

// Open action modal (accept/reject)
function openActionModal(bookingId, action) {
  currentBookingId = bookingId;
  currentAction = action;
  
  const modal = document.getElementById('actionModal');
  const title = document.getElementById('actionModalTitle');
  const recipientLabel = document.getElementById('actionRecipient');
  const confirmBtn = document.getElementById('confirmActionBtn');
  
  if (action === 'accept') {
    title.textContent = 'Chấp nhận yêu cầu';
    recipientLabel.textContent = 'học sinh';
    confirmBtn.className = 'btn btn-success';
    confirmBtn.innerHTML = '<i class="fas fa-check"></i> Chấp nhận';
  } else {
    title.textContent = 'Từ chối yêu cầu';
    recipientLabel.textContent = 'học sinh';
    confirmBtn.className = 'btn btn-error';
    confirmBtn.innerHTML = '<i class="fas fa-times"></i> Từ chối';
  }
  
  modal.classList.add('show');
}

// Close action modal
function closeActionModal() {
  document.getElementById('actionModal').classList.remove('show');
  document.getElementById('actionMessage').value = '';
  currentBookingId = null;
  currentAction = null;
}

// Confirm action
async function confirmAction() {
  if (!currentBookingId || !currentAction) return;
  
  const token = localStorage.getItem('token');
  const message = document.getElementById('actionMessage').value.trim();
  
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${currentBookingId}/${currentAction}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ message })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      alert(data.message || 'Thành công');
      closeActionModal();
      loadBookings();
      loadStats();
    } else {
      throw new Error(data.message || 'Thất bại');
    }
  } catch (error) {
    console.error('Action error:', error);
    alert(`Lỗi: ${error.message}`);
  }
}

// Cancel booking
async function cancelBooking(bookingId) {
  const reason = prompt('Lý do hủy:');
  if (!reason) return;
  
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      alert('Đã hủy yêu cầu');
      loadBookings();
      loadStats();
    } else {
      throw new Error(data.message || 'Không thể hủy');
    }
  } catch (error) {
    console.error('Cancel error:', error);
    alert(`Lỗi: ${error.message}`);
  }
}

// Complete booking
async function completeBooking(bookingId) {
  if (!confirm('Xác nhận hoàn thành lịch học này?')) return;
  
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/complete`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      alert('Đã hoàn thành');
      loadBookings();
      loadStats();
    } else {
      throw new Error(data.message || 'Không thể hoàn thành');
    }
  } catch (error) {
    console.error('Complete error:', error);
    alert(`Lỗi: ${error.message}`);
  }
}

// Open rating modal
function openRatingModal(bookingId) {
  currentBookingId = bookingId;
  selectedRating = 0;
  document.querySelectorAll('#ratingStars i').forEach(star => {
    star.className = 'far fa-star';
  });
  document.getElementById('ratingComment').value = '';
  document.getElementById('ratingModal').classList.add('show');
}

// Close rating modal
function closeRatingModal() {
  document.getElementById('ratingModal').classList.remove('show');
  currentBookingId = null;
  selectedRating = 0;
}

// Select rating
function selectRating(rating) {
  selectedRating = rating;
  document.querySelectorAll('#ratingStars i').forEach((star, index) => {
    if (index < rating) {
      star.className = 'fas fa-star';
    } else {
      star.className = 'far fa-star';
    }
  });
}

// Submit rating
async function submitRating() {
  if (!currentBookingId || selectedRating === 0) {
    alert('Vui lòng chọn số sao đánh giá');
    return;
  }
  
  const token = localStorage.getItem('token');
  const comment = document.getElementById('ratingComment').value.trim();
  
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${currentBookingId}/rating`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        score: selectedRating,
        comment
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      alert('Đã gửi đánh giá');
      closeRatingModal();
      loadBookings();
    } else {
      throw new Error(data.message || 'Không thể gửi đánh giá');
    }
  } catch (error) {
    console.error('Rating error:', error);
    alert(`Lỗi: ${error.message}`);
  }
}

// Close detail modal
function closeDetailModal() {
  document.getElementById('detailModal').classList.remove('show');
}

// Create new booking
function createNewBooking() {
  window.location.href = 'find_tutor.html';
}

// Helper functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

function generateStars(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  return `
    ${'<i class="fas fa-star"></i>'.repeat(fullStars)}
    ${halfStar ? '<i class="fas fa-star-half-alt"></i>' : ''}
    ${'<i class="far fa-star"></i>'.repeat(emptyStars)}
  `;
}

function getLocationTypeName(type) {
  const map = {
    'online': 'Dạy online',
    'student_home': 'Dạy tại nhà học sinh',
    'tutor_home': 'Dạy tại nhà gia sư',
    'other': 'Khác'
  };
  return map[type] || type;
}

function updateDate() {
  const dateElement = document.getElementById('currentDate');
  if (dateElement) {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = now.toLocaleDateString('vi-VN', options);
  }
}

function logout() {
  localStorage.clear();
  window.location.href = '../../index.html';
}

// Calculate total hours for booking
function calculateTotalHoursBooking(booking) {
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

// Calculate total price for booking
function calculateTotalPriceBooking(booking) {
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

console.log('✅ Booking requests script loaded');