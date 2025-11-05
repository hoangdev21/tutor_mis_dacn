// ===== TUTOR STUDENTS MANAGEMENT JAVASCRIPT =====

// API_BASE_URL is already defined in main.js
let currentFilter = 'all';
let currentPage = 1;
let totalPages = 1;
let allStudents = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadStudents();
  setupEventListeners();
  updateCurrentDate();
});

// Setup event listeners
function setupEventListeners() {
  // Filter buttons
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      currentPage = 1;
      loadStudents();
    });
  });

  // Search
  const searchInput = document.querySelector('.search-box input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterStudents(e.target.value);
    });
  }
}

// Update current date
function updateCurrentDate() {
  const dateEl = document.getElementById('currentDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('vi-VN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
}

// Load students from API
async function loadStudents() {
  try {
    showLoading();
    
    const token = localStorage.getItem('token');
    
    // Build query string
    const params = new URLSearchParams();
    if (currentFilter !== 'all') {
      params.append('status', currentFilter);
    }
    params.append('page', currentPage);
    params.append('limit', 20);
    
    const response = await fetch(`${API_BASE_URL}/tutor/students?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      allStudents = data.data.bookings || [];
      totalPages = data.data.pages || 1;
      
      // Get stats
      const stats = await loadStats();
      renderStats(stats);
      
      renderStudents(allStudents);
      renderPagination();
    } else {
      showError('Không thể tải danh sách học sinh');
    }
    
  } catch (error) {
    console.error('Load students error:', error);
    showError('Không thể tải danh sách học sinh');
  }
}

// Load stats
async function loadStats() {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/tutor/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data.data.stats;
    }
    
    return null;
  } catch (error) {
    console.error('Load stats error:', error);
    return null;
  }
}

// Render stats
function renderStats(stats) {
  if (!stats) return;
  
  const statsContainer = document.getElementById('statsCards');
  if (!statsContainer) return;
  
  statsContainer.innerHTML = `
    <div class="stat-card blue">
      <div class="stat-icon blue">
        <i class="fas fa-users"></i>
      </div>
      <div class="stat-info">
        <h3>${stats.totalStudents || 0}</h3>
        <p>Tổng Học Sinh</p>
      </div>
    </div>
    
    <div class="stat-card green">
      <div class="stat-icon green">
        <i class="fas fa-user-check"></i>
      </div>
      <div class="stat-info">
        <h3>${stats.activeStudents || 0}</h3>
        <p>Đang Học</p>
      </div>
    </div>
    
    <div class="stat-card orange">
      <div class="stat-icon orange">
        <i class="fas fa-graduation-cap"></i>
      </div>
      <div class="stat-info orange">
        <h3>${stats.completedBookings || 0}</h3>
        <p>Đã Hoàn Thành</p>
      </div>
    </div>
    
    <div class="stat-card purple">
      <div class="stat-icon purple">
        <i class="fas fa-clock"></i>
      </div>
      <div class="stat-info">
        <h3>${stats.totalBookings || 0}</h3>
        <p>Tổng Khóa Học</p>
      </div>
    </div>
  `;
}

// Render students
function renderStudents(students) {
  const container = document.getElementById('studentsContainer');
  
  if (!students || students.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 60px 20px; text-align: center;">
        <i class="fas fa-user-graduate" style="font-size: 64px; color: #cbd5e1; margin-bottom: 20px;"></i>
        <h3 style="font-size: 20px; color: #64748b; margin-bottom: 12px;">
          ${currentFilter === 'all' ? 'Chưa có học sinh' : 'Không tìm thấy học sinh'}
        </h3>
        <p style="font-size: 16px; color: #94a3b8;">
          ${currentFilter === 'all' ? 'Bạn chưa có học sinh nào. Hãy chấp nhận yêu cầu từ học sinh!' : 'Thử thay đổi bộ lọc hoặc tìm kiếm'}
        </p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="students-grid">
      ${students.map(booking => renderStudentCard(booking)).join('')}
    </div>
  `;
}

// Render student card
function renderStudentCard(booking) {
  const student = booking.student;
  const studentProfile = booking.studentProfile;
  
  const avatar = studentProfile?.avatar || student?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentProfile?.fullName || student?.email || 'Student')}&background=667eea&color=fff`;
  const name = studentProfile?.fullName || student?.email || 'Học sinh';
  const email = student?.email || 'N/A';
  const phone = studentProfile?.phone || 'Chưa có';
  
  const subject = booking.subject?.name || 'N/A';
  const level = booking.subject?.level || '';
  const subjectDisplay = level ? `${subject} - ${level}` : subject;
  
  const statusClass = booking.status === 'accepted' ? 'success' : 
                      booking.status === 'completed' ? 'info' : 
                      booking.status === 'pending' ? 'warning' : 'danger';
  
  const statusText = booking.status === 'accepted' ? 'Đang học' : 
                     booking.status === 'completed' ? 'Hoàn thành' : 
                     booking.status === 'pending' ? 'Chờ xác nhận' : 
                     booking.status === 'cancelled' ? 'Đã hủy' : 'Từ chối';
  
  const startDate = booking.schedule?.startDate ? new Date(booking.schedule.startDate).toLocaleDateString('vi-VN') : 'N/A';
  const endDate = calculateEndDate(booking.schedule?.startDate, booking.schedule?.duration);
  const preferredTime = booking.schedule?.preferredTime || 'Chưa xác định';
  const scheduleInfo = `${booking.schedule?.daysPerWeek || 0} buổi/tuần • ${booking.schedule?.hoursPerSession || 0}h/buổi`;
  
  const totalAmount = booking.pricing?.totalAmount || 0;
  const hourlyRate = booking.pricing?.hourlyRate || 0;
  
  const location = booking.location?.type === 'online' ? 
    '<i class="fas fa-laptop"></i> Trực tuyến' : 
    `<i class="fas fa-home"></i> ${booking.location?.address || 'Tại nhà'}`;
  
  return `
    <div class="student-card" data-student-id="${student?._id}">
      <div class="student-card-header">
        <img src="${avatar}" alt="${name}" class="student-avatar">
        <div class="student-header-info">
          <h3 class="student-name">${name}</h3>
          <p class="student-email"><i class="fas fa-envelope"></i> ${email}</p>
          <p class="student-phone"><i class="fas fa-phone"></i> ${phone}</p>
        </div>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
      
      <div class="student-card-body">
        <div class="info-row">
          <div class="info-item">
            <i class="fas fa-book"></i>
            <div>
              <span class="info-label">Môn học</span>
              <span class="info-value">${subjectDisplay}</span>
            </div>
          </div>
          <div class="info-item">
            <i class="fas fa-calendar"></i>
            <div>
              <span class="info-label">Ngày bắt đầu</span>
              <span class="info-value">${startDate}</span>
            </div>
          </div>
        </div>
        
        <div class="info-row">
          <div class="info-item">
            <i class="fas fa-calendar-check"></i>
            <div>
              <span class="info-label">Kết thúc</span>
              <span class="info-value">${endDate}</span>
            </div>
          </div>
          <div class="info-item">
            <i class="fas fa-clock"></i>
            <div>
              <span class="info-label">Thời gian</span>
              <span class="info-value">${preferredTime}</span>
            </div>
          </div>
        </div>
        
        <div class="info-row">
          <div class="info-item">
            <i class="fas fa-calendar-week"></i>
            <div>
              <span class="info-label">Lịch học</span>
              <span class="info-value">${booking.schedule?.daysPerWeek || 0} buổi/tuần</span>
            </div>
          </div>
          <div class="info-item">
            <i class="fas fa-hourglass-end"></i>
            <div>
              <span class="info-label">Thời lượng buổi</span>
              <span class="info-value">${booking.schedule?.hoursPerSession || 0}h/buổi</span>
            </div>
          </div>
        </div>
        
        <div class="info-row">
          <div class="info-item full-width">
            <i class="fas fa-map-marker-alt"></i>
            <div>
              <span class="info-label">Địa điểm</span>
              <span class="info-value">${location}</span>
            </div>
          </div>
        </div>
        
        <div class="pricing-info">
          <div class="pricing-item">
            <span class="pricing-label">Học phí/giờ</span>
            <span class="pricing-value">${formatCurrency(hourlyRate)}</span>
          </div>
          <div class="pricing-item">
            <span class="pricing-label">Học phí/tháng</span>
            <span class="pricing-value">${formatCurrency(calculateMonthlyPrice(booking))}</span>
          </div>
          <div class="pricing-item">
            <span class="pricing-label">Tổng học phí</span>
            <span class="pricing-value total">${formatCurrency(calculateTotalPriceTutor(booking))}</span>
          </div>
        </div>
      </div>
      
      <div class="student-card-footer">
        <button class="btn-secondary" onclick="contactStudent('${student?._id}')">
          <i class="fas fa-comment"></i> Nhắn tin
        </button>
        <button class="btn-primary" onclick="viewStudentDetail('${booking._id}')">
          <i class="fas fa-eye"></i> Chi tiết
        </button>
        ${booking.status === 'pending' ? `
          <button class="btn-success" onclick="acceptBooking('${booking._id}')">
            <i class="fas fa-check"></i> Chấp nhận
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// Filter students
function filterStudents(searchTerm) {
  if (!searchTerm) {
    renderStudents(allStudents);
    return;
  }
  
  const filtered = allStudents.filter(booking => {
    const studentName = booking.studentProfile?.fullName || booking.student?.email || '';
    const subject = booking.subject?.name || '';
    const email = booking.student?.email || '';
    
    return studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
           email.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  renderStudents(filtered);
}

// Render pagination
function renderPagination() {
  const container = document.getElementById('paginationContainer');
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }
  
  let paginationHTML = '<div class="pagination">';
  
  // Previous button
  paginationHTML += `
    <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
      <i class="fas fa-chevron-left"></i>
    </button>
  `;
  
  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      paginationHTML += `
        <button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
          ${i}
        </button>
      `;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      paginationHTML += '<span class="pagination-dots">...</span>';
    }
  }
  
  // Next button
  paginationHTML += `
    <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
      <i class="fas fa-chevron-right"></i>
    </button>
  `;
  
  paginationHTML += '</div>';
  container.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
  if (page < 1 || page > totalPages || page === currentPage) return;
  currentPage = page;
  loadStudents();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Contact student
function contactStudent(studentId) {
  window.location.href = `messages.html?userId=${studentId}`;
}

// View student detail
function viewStudentDetail(bookingId) {
  // Show modal with detailed information
  showStudentDetailModal(bookingId);
}

// Show student detail modal
function showStudentDetailModal(bookingId) {
  const booking = allStudents.find(b => b._id === bookingId);
  if (!booking) return;
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
    <div class="modal-content" style="max-width: 550px; width: 95%; max-height: calc(100vh - 60px);">
      <div class="modal-header" style="background: linear-gradient(135deg, #2d8c3fff 0%, #336b19ff 100%); padding: 14px 18px; border-radius: 12px 12px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-user-graduate" style="font-size: 16px;"></i> Chi Tiết Học Sinh
        </h2>
        <button class="modal-close" onclick="this.closest('.modal').remove()" style="background: rgba(255,255,255,0.2); color: white; font-size: 20px; border: none; padding: 0; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; cursor: pointer; transition: all 0.2s;">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="modal-body" style="padding: 14px 16px; max-height: calc(100vh - 140px); overflow-y: auto;">
        ${renderStudentDetailContent(booking)}
      </div>
      
      <div class="modal-footer" style="padding: 10px 16px; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; justify-content: flex-end;">
        <button class="btn-secondary" onclick="this.closest('.modal').remove()" style="padding: 8px 16px; background: #f1f5f9; color: #475569; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
          <i class="fas fa-times"></i> Đóng
        </button>
        <button class="btn-primary" onclick="contactStudent('${booking.student?._id}'); this.closest('.modal').remove();" style="padding: 8px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
          <i class="fas fa-comment"></i> Nhắn tin
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Render student detail content
function renderStudentDetailContent(booking) {
  const student = booking.student;
  const studentProfile = booking.studentProfile;
  
  const avatar = studentProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentProfile?.fullName || 'Student')}&background=667eea&color=fff`;
  const name = studentProfile?.fullName || 'Học sinh';
  
  return `
    <div style="text-align: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0;">
      <img src="${avatar}" alt="${name}" style="width: 70px; height: 70px; border-radius: 50%; margin-bottom: 8px; border: 3px solid #667eea;">
      <h3 style="font-size: 16px; margin: 0 0 2px; color: #1e293b; font-weight: 600;">${name}</h3>
      <p style="margin: 0; font-size: 13px; color: #64748b;">${student?.email || 'N/A'}</p>
    </div>
    
    <div style="display: grid; gap: 12px; font-size: 13px;">
      <!-- Thông Tin Khóa Học -->
      <div style="background: linear-gradient(135deg, #7a8fedff 0%, #52ba76ff 100%); padding: 10px 12px; border-radius: 8px; color: white;">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; margin-bottom: 8px; font-size: 13px;">
          <i class="fas fa-book" style="font-size: 14px;"></i> Khóa Học
        </div>
        <div style="display: grid; gap: 6px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="opacity: 0.9;">Môn học:</span>
            <strong>${booking.subject?.name || 'N/A'} ${booking.subject?.level ? '- ' + booking.subject.level : ''}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="opacity: 0.9;">Trạng thái:</span>
            <span style="padding: 2px 6px; background: rgba(255,255,255,0.2); border-radius: 4px;">
              ${booking.status === 'accepted' ? 'Đang học' : booking.status === 'completed' ? 'Hoàn thành' : 'Chờ xác nhận'}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="opacity: 0.9;">Khoá thời gian:</span>
            <strong>${booking.schedule?.startDate ? new Date(booking.schedule.startDate).toLocaleDateString('vi-VN') : 'N/A'} → ${calculateEndDate(booking.schedule?.startDate, booking.schedule?.duration)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="opacity: 0.9;">Thời lượng:</span>
            <strong>${booking.schedule?.duration || 0} tháng</strong>
          </div>
        </div>
      </div>
      
      <!-- Lịch Học -->
      <div style="background: linear-gradient(135deg, #10b6b9ff 0%, #52ba76ff 100%); padding: 10px 12px; border-radius: 8px; color: white;">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; margin-bottom: 8px; font-size: 13px;">
          <i class="fas fa-calendar-alt" style="font-size: 14px;"></i> Lịch Học
        </div>
        <div style="display: grid; gap: 6px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="opacity: 0.9;">Thời gian:</span>
            <strong>${booking.schedule?.preferredTime || 'Chưa xác định'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="opacity: 0.9;">Buổi/tuần:</span>
            <strong>${booking.schedule?.daysPerWeek || 0} · ${booking.schedule?.hoursPerSession || 0}h/buổi · ${calculateTotalHoursTutor(booking)}h tổng</strong>
          </div>
        </div>
      </div>
      
      <!-- Địa Điểm -->
      <div style="background: linear-gradient(135deg, #988edeff 0%, #52ba76ff 100%); padding: 10px 12px; border-radius: 8px; color: white;">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; margin-bottom: 6px; font-size: 13px;">
          <i class="fas fa-map-marker-alt" style="font-size: 14px;"></i> Địa Điểm
        </div>
        <div style="font-size: 12px; opacity: 0.95;">
          ${booking.location?.type === 'online' ? 
            '<i class="fas fa-laptop" style="margin-right: 4px;"></i>Trực tuyến' : 
            `<i class="fas fa-home" style="margin-right: 4px;"></i>${booking.location?.address || 'Tại nhà'}<br><span style="font-size: 11px; opacity: 0.8;">${booking.location?.district ? booking.location.district + ', ' : ''}${booking.location?.city || ''}</span>`
          }
        </div>
      </div>
      
      <!-- Học Phí -->
      <div style="background: linear-gradient(135deg, #55b38aff 0%, #8d9ba7ff 100%); padding: 10px 12px; border-radius: 8px; color: white;">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; margin-bottom: 8px; font-size: 13px;">
          <i class="fas fa-dollar-sign" style="font-size: 14px;"></i> Học Phí
        </div>
        <div style="display: grid; gap: 6px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="opacity: 0.9;">/giờ:</span>
            <strong style="color: #b15333ff">${formatCurrency(booking.pricing?.hourlyRate || 0)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="opacity: 0.9;">/tháng:</span>
            <strong style="color: #b15333ff">${formatCurrency(calculateMonthlyPrice(booking))}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.3); margin-top: 6px;">
            <span style="opacity: 0.9;">Tổng:</span>
            <strong style="font-size: 13px; color: #d94413ff;">${formatCurrency(calculateTotalPriceTutor(booking))}</strong>
          </div>
        </div>
      </div>
      
      ${booking.description ? `
      <!-- Ghi Chú -->
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 10px 12px; border-radius: 8px; color: white;">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; margin-bottom: 6px; font-size: 13px;">
          <i class="fas fa-sticky-note" style="font-size: 14px;"></i> Ghi Chú
        </div>
        <p style="margin: 0; font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; max-height: 80px; overflow-y: auto;">${booking.description}</p>
      </div>
      ` : ''}
    </div>
  `;
}

// Accept booking
async function acceptBooking(bookingId) {
  if (!confirm('Bạn có chắc muốn chấp nhận yêu cầu này?')) return;
  
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/booking/${bookingId}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Tôi đồng ý nhận dạy!'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Đã chấp nhận yêu cầu thành công!');
      loadStudents();
    } else {
      alert(data.message || 'Không thể chấp nhận yêu cầu');
    }
  } catch (error) {
    console.error('Accept booking error:', error);
    alert('Không thể chấp nhận yêu cầu');
  }
}

// Helper functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function showLoading() {
  const container = document.getElementById('studentsContainer');
  if (container) {
    container.innerHTML = `
      <div style="padding: 60px; text-align: center;">
        <div class="spinner" style="border: 4px solid #f3f4f6; border-top: 4px solid #667eea; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        <p style="margin-top: 20px; color: #64748b;">Đang tải danh sách học sinh...</p>
      </div>
    `;
  }
}

function showError(message) {
  const container = document.getElementById('studentsContainer');
  if (container) {
    container.innerHTML = `
      <div class="error-state" style="padding: 60px 20px; text-align: center;">
        <i class="fas fa-exclamation-circle" style="font-size: 64px; color: #ef4444; margin-bottom: 20px;"></i>
        <h3 style="font-size: 20px; color: #64748b; margin-bottom: 12px;">Lỗi tải dữ liệu</h3>
        <p style="font-size: 16px; color: #94a3b8;">${message}</p>
        <button onclick="loadStudents()" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
          <i class="fas fa-redo"></i> Thử lại
        </button>
      </div>
    `;
  }
}

// Add spinner animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Calculate total hours based on course duration for tutor
function calculateTotalHoursTutor(booking) {
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

// Calculate total price based on actual course duration for tutor
function calculateTotalPriceTutor(booking) {
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

// Calculate end date based on start date and duration (in months)
function calculateEndDate(startDateStr, durationMonths) {
  if (!startDateStr || !durationMonths) return 'N/A';
  
  try {
    const startDate = new Date(startDateStr);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + parseInt(durationMonths));
    
    return endDate.toLocaleDateString('vi-VN');
  } catch (error) {
    console.error('Calculate end date error:', error);
    return 'N/A';
  }
}

// Calculate monthly price (hourly rate × hours per session × days per week × 4 weeks per month)
function calculateMonthlyPrice(booking) {
  const pricing = booking.pricing || {};
  const schedule = booking.schedule || {};
  
  const hourlyRate = pricing.hourlyRate || 0;
  const hoursPerSession = schedule.hoursPerSession || 0;
  const daysPerWeek = schedule.daysPerWeek || 0;
  
  // Calculate: hourly rate × hours per session × days per week × 4 weeks per month
  const monthlyPrice = hourlyRate * hoursPerSession * daysPerWeek * 4;
  
  return monthlyPrice;
}

console.log('Tutor students management initialized');