// ===== STUDENT COURSES PAGE JAVASCRIPT =====
// Display courses based on accepted booking requests

const API_URL = window.API_BASE_URL || 'http://localhost:5000/api';
let allCourses = [];

// Use TokenManager for automatic token refresh
const tokenManager = window.TokenManager || {
  apiRequest: async (endpoint, options) => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options?.headers
      }
    });
    return response.json();
  }
};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎓 Student Courses page loaded');
  
  // Check authentication
  const token = getToken();
  if (!token) {
    window.location.href = '../../index.html';
    return;
  }

  // Load courses
  loadCourses();
  
  // Set up tab switching
  setupTabs();
});

// Get token from localStorage
function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('accessToken');
}

// Set up tab switching
function setupTabs() {
  const tabs = document.querySelectorAll('.course-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabName = tab.dataset.tab;
      document.querySelectorAll('.course-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`${tabName}Panel`).classList.add('active');

      // Re-render timetable if timetable tab is clicked
      if (tabName === 'timetable') {
        renderTimetable();
      }
    });
  });
}

// Load courses (from accepted booking requests)
async function loadCourses() {
  try {
    console.log('📤 Loading courses from booking requests...');
    
    // Get accepted booking requests
    const response = await tokenManager.apiRequest('/bookings?status=accepted');
    
    if (response.success) {
      allCourses = response.data || [];
      console.log('📚 Loaded courses:', allCourses.length);
      
      // Categorize courses
      categorizeCourses(allCourses);
    } else {
      throw new Error(response.message || 'Failed to load courses');
    }
    
  } catch (error) {
    console.error('❌ Error loading courses:', error);
    showErrorState();
  }
}

// Categorize courses into upcoming, ongoing, and completed
function categorizeCourses(courses) {
  const now = new Date();
  
  const upcoming = courses.filter(course => {
    const startDate = new Date(course.schedule?.startDate);
    return startDate > now;
  });
  
  const ongoing = courses.filter(course => {
    const startDate = new Date(course.schedule?.startDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + (course.schedule?.duration || 0));
    return startDate <= now && now <= endDate;
  });
  
  const completed = courses.filter(course => {
    const startDate = new Date(course.schedule?.startDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + (course.schedule?.duration || 0));
    return endDate < now || course.status === 'completed';
  });
  
  // Update counts
  document.getElementById('totalCourses').textContent = courses.length;
  document.getElementById('ongoingCourses').textContent = ongoing.length;
  document.getElementById('countUpcoming').textContent = upcoming.length;
  document.getElementById('countOngoing').textContent = ongoing.length;
  document.getElementById('countCompleted').textContent = completed.length;
  
  // Render courses in each panel
  renderCourses('upcomingContainer', upcoming, 'upcoming');
  renderCourses('ongoingContainer', ongoing, 'ongoing');
  renderCourses('completedContainer', completed, 'completed');
  
  // Render timetable
  renderTimetable();
}

// Render timetable
function renderTimetable() {
  const container = document.getElementById('timetableContainer');
  const loadingState = container.querySelector('.loading-state');
  const table = container.querySelector('.timetable');

  // Show loading initially if not already rendered
  if (!table.style.display || table.style.display === 'none') {
    if (loadingState) loadingState.style.display = 'block';
    if (table) table.style.display = 'none';
  }

  // Get upcoming and ongoing courses
  const relevantCourses = allCourses.filter(course => {
    const startDate = new Date(course.schedule?.startDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + (course.schedule?.duration || 0));
    const now = new Date();
    return (startDate > now) || (startDate <= now && now <= endDate); // upcoming or ongoing
  });

  console.log('📅 Rendering timetable with', relevantCourses.length, 'courses');

  const tbody = document.getElementById('timetableBody');
  tbody.innerHTML = '';

  // Create rows for each hour from 7:00 to 22:00
  for (let hour = 7; hour <= 22; hour++) {
    const row = document.createElement('tr');

    // Time column
    const timeCell = document.createElement('td');
    timeCell.className = 'time-slot';
    timeCell.textContent = `${hour}:00`;
    row.appendChild(timeCell);

    // Day columns (Monday to Sunday)
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    days.forEach((day) => {
      const dayCell = document.createElement('td');
      dayCell.dataset.day = day;
      dayCell.dataset.hour = hour;

      // Find courses for this day and hour
      const coursesForSlot = relevantCourses.filter(course => {
        return isCourseScheduledAt(course, day, hour);
      });

      // Add course slots
      coursesForSlot.forEach(course => {
        const courseSlot = createCourseSlot(course);
        dayCell.appendChild(courseSlot);
      });

      row.appendChild(dayCell);
    });

    tbody.appendChild(row);
  }

  // Hide loading and show table
  if (loadingState) loadingState.style.display = 'none';
  if (table) table.style.display = 'table';
}

// Check if course is scheduled at specific day and hour
function isCourseScheduledAt(course, day, hour) {
  const schedule = course.schedule || {};

  // Parse preferredTime - handle different formats
  const preferredTime = schedule.preferredTime || '';
  let startHour = 0;
  let endHour = 0;
  let courseDays = [];

  // First, try the new format "19:00-21:00"
  const timeMatch = preferredTime.match(/(\d+):(\d+)\s*-\s*(\d+):(\d+)/);
  if (timeMatch) {
    startHour = parseInt(timeMatch[1]);
    endHour = parseInt(timeMatch[3]);
  } else {
    // Handle descriptive format like "Tối thứ 5 ,6, Chủ nhật"
    const timeDesc = preferredTime.toLowerCase();

    // Determine time range based on keywords
    if (timeDesc.includes('tối') || timeDesc.includes('evening')) {
      startHour = 19;
      endHour = 21;
    } else if (timeDesc.includes('sáng') || timeDesc.includes('morning')) {
      startHour = 7;
      endHour = 9;
    } else if (timeDesc.includes('chiều') || timeDesc.includes('afternoon')) {
      startHour = 14;
      endHour = 16;
    } else {
      // Default evening time
      startHour = 19;
      endHour = 21;
    }
  }

  // Check if hour falls within the time range
  if (hour < startHour || hour >= endHour) {
    return false;
  }

  // Parse days from preferredTime or use daysOfWeek array
  if (schedule.daysOfWeek && Array.isArray(schedule.daysOfWeek) && schedule.daysOfWeek.length > 0) {
    courseDays = schedule.daysOfWeek.map(d => d.toLowerCase());
  } else {
    // Parse days from preferredTime text
    courseDays = parseDaysFromText(preferredTime, schedule);
  }

  const dayMatch = courseDays.includes(day.toLowerCase());
  return dayMatch;
}

// Parse days from descriptive text
function parseDaysFromText(text, schedule) {
  const days = [];
  const lowerText = text.toLowerCase();

  // Map Vietnamese day names to English
  const dayMappings = {
    'thứ 2': 'monday',
    'thứ 3': 'tuesday',
    'thứ 4': 'wednesday',
    'thứ 5': 'thursday',
    'thứ 6': 'friday',
    'thứ 7': 'saturday',
    'chủ nhật': 'sunday',
    'thứ hai': 'monday',
    'thứ ba': 'tuesday',
    'thứ tư': 'wednesday',
    'thứ năm': 'thursday',
    'thứ sáu': 'friday',
    'thứ bảy': 'saturday'
  };

  // Check for each day
  Object.entries(dayMappings).forEach(([vietnamese, english]) => {
    if (lowerText.includes(vietnamese) && !days.includes(english)) {
      days.push(english);
    }
  });

  // If no days found, fallback to old logic based on daysPerWeek
  if (days.length === 0) {
    const daysPerWeek = schedule.daysPerWeek || 2;
    if (daysPerWeek >= 1) days.push('monday');
    if (daysPerWeek >= 2) days.push('wednesday');
    if (daysPerWeek >= 3) days.push('friday');
    if (daysPerWeek >= 4) days.push('saturday');
    if (daysPerWeek >= 5) days.push('sunday');
    if (daysPerWeek >= 6) days.push('tuesday');
    if (daysPerWeek >= 7) days.push('thursday');
  }

  return days;
}

// Create course slot element
function createCourseSlot(course) {
  const tutor = course.tutor || {};
  const tutorProfile = tutor.profile || {};

  const slot = document.createElement('div');
  slot.className = `course-slot ${getCourseStatus(course)}`;
  slot.dataset.courseId = course._id;
  slot.onclick = () => viewCourseDetail(course._id);

  slot.innerHTML = `
    <span class="subject">${course.subject?.name || 'N/A'}</span>
    <span class="tutor">${tutorProfile.fullName || 'Gia sư'}</span>
  `;

  return slot;
}

// Get course status for styling
function getCourseStatus(course) {
  const now = new Date();
  const startDate = new Date(course.schedule?.startDate);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + (course.schedule?.duration || 0));

  if (startDate > now) return 'upcoming';
  if (now <= endDate) return 'ongoing';
  return 'completed';
}

// Render courses
function renderCourses(containerId, courses, type) {
  const container = document.getElementById(containerId);
  
  if (courses.length === 0) {
    container.innerHTML = getEmptyState(type);
    return;
  }
  
  container.innerHTML = courses.map(course => createCourseCard(course, type)).join('');
}

// Create course card
function createCourseCard(course, type) {
  const tutor = course.tutor || {};
  const tutorProfile = tutor.profile || {};
  const startDate = new Date(course.schedule?.startDate);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + (course.schedule?.duration || 0));
  
  // Calculate progress for ongoing courses
  let progressPercent = 0;
  if (type === 'ongoing') {
    const now = new Date();
    const totalDuration = endDate - startDate;
    const elapsed = now - startDate;
    progressPercent = Math.min(Math.round((elapsed / totalDuration) * 100), 100);
  }
  
  // Calculate total sessions
  const totalSessions = (course.schedule?.daysPerWeek || 0) * (course.schedule?.duration || 0) * 4; // approximate
  
  return `
    <div class="course-card ${type}">
      <div class="course-card-header">
        <div class="course-subject">
          <i class="fas fa-book"></i>
          <div>
            <h3>${course.subject?.name || 'N/A'}</h3>
            <span class="course-level">${getLevelLabel(course.subject?.level)}</span>
          </div>
        </div>
        <span class="course-status ${type}">
          ${type === 'upcoming' ? '<i class="fas fa-clock"></i> Sắp tới' : 
            type === 'ongoing' ? '<i class="fas fa-play-circle"></i> Đang học' : 
            '<i class="fas fa-check-circle"></i> Đã kết thúc'}
        </span>
      </div>
      
      <div class="course-card-body">
        <!-- Tutor Info -->
        <div class="course-tutor">
          <img src="${tutorProfile.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(tutorProfile.fullName || 'T')}" 
               alt="${tutorProfile.fullName || 'Tutor'}" 
               class="tutor-avatar-small">
          <div class="tutor-info">
            <h4>${tutorProfile.fullName || 'Gia sư'}</h4>
            <p><i class="fas fa-envelope"></i> ${tutor.email || ''}</p>
          </div>
        </div>
        
        <!-- Course Details -->
        <div class="course-details">
          <div class="detail-item">
            <i class="fas fa-calendar-day"></i>
            <div>
              <small>Ngày bắt đầu</small>
              <strong>${formatDate(startDate)}</strong>
            </div>
          </div>
          <div class="detail-item">
            <i class="fas fa-calendar-check"></i>
            <div>
              <small>Kết thúc dự kiến</small>
              <strong>${formatDate(endDate)}</strong>
            </div>
          </div>
          <div class="detail-item">
            <i class="fas fa-clock"></i>
            <div>
              <small>Lịch học</small>
              <strong>${course.schedule?.daysPerWeek || 0} buổi/tuần</strong>
            </div>
          </div>
          <div class="detail-item">
            <i class="fas fa-hourglass-half"></i>
            <div>
              <small>Thời lượng buổi</small>
              <strong>${course.schedule?.hoursPerSession || 0}h</strong>
            </div>
          </div>
        </div>
        
        <!-- Schedule Info -->
        <div class="course-schedule">
          <div class="schedule-item">
            <i class="fas fa-business-time"></i>
            <span>${course.schedule?.preferredTime || 'Linh hoạt'}</span>
          </div>
          <div class="schedule-item">
            <i class="fas fa-map-marker-alt"></i>
            <span>${getLocationLabel(course.location?.type)}</span>
          </div>
        </div>
        
        ${type === 'ongoing' ? `
        <!-- Progress Bar -->
        <div class="course-progress">
          <div class="progress-header">
            <span>Tiến độ</span>
            <span class="progress-percent">${progressPercent}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <small class="progress-text">${Math.floor(totalSessions * progressPercent / 100)} / ${totalSessions} buổi học (ước tính)</small>
        </div>
        ` : ''}
        
        ${course.pricing?.hourlyRate ? `
        <div class="course-pricing">
          <div class="pricing-item">
            <small>Học phí/giờ</small>
            <strong>${formatCurrency(course.pricing.hourlyRate)}</strong>
          </div>
          <div class="pricing-item">
            <small>Tổng học phí</small>
            <strong class="total-price">${formatCurrency(course.pricing.totalAmount || 0)}</strong>
          </div>
        </div>
        ` : ''}
      </div>
      
      <div class="course-card-footer">
        <button class="btn-icon" onclick="viewCourseDetail('${course._id}')" title="Xem chi tiết">
          <i class="fas fa-eye"></i>
          Chi tiết
        </button>
        <button class="btn-icon" onclick="contactTutor('${tutor._id}')" title="Nhắn tin">
          <i class="fas fa-comment"></i>
          Nhắn tin
        </button>
        ${type === 'completed' ? `
        <button class="btn-icon btn-rating" onclick="rateCourse('${course._id}')" title="Đánh giá">
          <i class="fas fa-star"></i>
          Đánh giá
        </button>
        ` : ''}
      </div>
    </div>
  `;
}

// Get empty state message
function getEmptyState(type) {
  const messages = {
    upcoming: {
      icon: 'fa-calendar-plus',
      title: 'Chưa có khóa học sắp tới',
      description: 'Các khóa học bạn đăng ký sẽ xuất hiện ở đây'
    },
    ongoing: {
      icon: 'fa-book-reader',
      title: 'Chưa có khóa học đang học',
      description: 'Bạn chưa có khóa học nào đang diễn ra'
    },
    completed: {
      icon: 'fa-graduation-cap',
      title: 'Chưa hoàn thành khóa học nào',
      description: 'Các khóa học đã hoàn thành sẽ xuất hiện ở đây'
    }
  };
  
  const msg = messages[type] || messages.upcoming;
  
  return `
    <div class="empty-state">
      <i class="fas ${msg.icon}"></i>
      <h3>${msg.title}</h3>
      <p>${msg.description}</p>
      ${type === 'upcoming' || type === 'ongoing' ? `
        <button class="btn btn-primary" onclick="window.location.href='./find_tutor.html'">
          <i class="fas fa-search"></i>
          Tìm Gia Sư
        </button>
      ` : ''}
    </div>
  `;
}

// Show error state
function showErrorState() {
  ['upcomingContainer', 'ongoingContainer', 'completedContainer'].forEach(containerId => {
    const container = document.getElementById(containerId);
    container.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Lỗi tải dữ liệu</h3>
        <p>Không thể tải danh sách khóa học. Vui lòng thử lại.</p>
        <button class="btn btn-primary" onclick="loadCourses()">
          <i class="fas fa-redo"></i>
          Thử Lại
        </button>
      </div>
    `;
  });
}

// View course detail
window.viewCourseDetail = function viewCourseDetail(courseId) {
  const course = allCourses.find(c => c._id === courseId);
  if (!course) {
    console.error('Course not found:', courseId);
    return;
  }
  
  const tutor = course.tutor || {};
  const tutorProfile = tutor.profile || {};
  const startDate = new Date(course.schedule?.startDate);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + (course.schedule?.duration || 0));
  
  console.log('📋 Viewing course detail:', course);
  
  // Remove existing modal if any
  const existingModal = document.getElementById('courseDetailModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.id = 'courseDetailModal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h3><i class="fas fa-book"></i> Chi Tiết Khóa Học</h3>
        <button class="modal-close" onclick="closeCourseDetailModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <!-- Subject Info -->
        <div class="detail-section">
          <h4><i class="fas fa-book"></i> Môn Học</h4>
          <p><strong>Môn:</strong> ${course.subject?.name || 'N/A'}</p>
          <p><strong>Cấp học:</strong> ${getLevelLabel(course.subject?.level)}</p>
        </div>

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

        <!-- Schedule -->
        <div class="detail-section">
          <h4><i class="fas fa-calendar-alt"></i> Lịch Học</h4>
          <p><strong>Ngày bắt đầu:</strong> ${formatDate(course.schedule?.startDate)}</p>
          <p><strong>Kết thúc dự kiến:</strong> ${formatDate(endDate)}</p>
          <p><strong>Thời gian mong muốn:</strong> ${course.schedule?.preferredTime || 'Linh hoạt'}</p>
          <p><strong>Số buổi/tuần:</strong> ${course.schedule?.daysPerWeek || 0} buổi</p>
          <p><strong>Số giờ/buổi:</strong> ${course.schedule?.hoursPerSession || 0} giờ</p>
          <p><strong>Thời lượng:</strong> ${course.schedule?.duration || 0} tháng</p>
        </div>

        <!-- Location -->
        <div class="detail-section">
          <h4><i class="fas fa-map-marker-alt"></i> Địa Điểm</h4>
          <p><strong>Hình thức:</strong> ${getLocationLabel(course.location?.type)}</p>
          ${course.location?.address ? `<p><strong>Địa chỉ:</strong> ${course.location.address}</p>` : ''}
        </div>

        <!-- Notes -->
        ${course.studentNote ? `
        <div class="detail-section">
          <h4><i class="fas fa-sticky-note"></i> Ghi Chú Của Bạn</h4>
          <p>${course.studentNote}</p>
        </div>
        ` : ''}

        <!-- Tutor Response -->
        ${course.tutorResponse?.message ? `
        <div class="detail-section">
          <h4><i class="fas fa-comment"></i> Tin Nhắn Từ Gia Sư</h4>
          <div class="response-box">
            <p>${course.tutorResponse.message}</p>
            <small><i class="fas fa-clock"></i> ${formatDateTime(course.tutorResponse.respondedAt)}</small>
          </div>
        </div>
        ` : ''}

        <!-- Pricing -->
        ${course.pricing?.hourlyRate ? `
        <div class="detail-section">
          <h4><i class="fas fa-money-bill-wave"></i> Học Phí</h4>
          <p><strong>Học phí/giờ:</strong> ${formatCurrency(course.pricing.hourlyRate)}</p>
          <p><strong>Tổng số giờ:</strong> ${course.pricing.totalHours || 0} giờ</p>
          <p><strong>Tổng học phí:</strong> ${formatCurrency(course.pricing.totalAmount || 0)}</p>
        </div>
        ` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeCourseDetailModal()">Đóng</button>
        <button class="btn btn-primary" onclick="closeCourseDetailModal(); contactTutor('${tutor._id}')">
          <i class="fas fa-comment"></i> Nhắn Tin Gia Sư
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeCourseDetailModal();
    }
  });
  
  console.log('✅ Course detail modal displayed');
}

// Close course detail modal
window.closeCourseDetailModal = function closeCourseDetailModal() {
  const modal = document.getElementById('courseDetailModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

// Contact tutor
window.contactTutor = function contactTutor(tutorId) {
  window.location.href = `./messages.html?recipientId=${tutorId}`;
}

// Rate course
window.rateCourse = function rateCourse(courseId) {
  alert('Chức năng đánh giá đang được phát triển');
  // TODO: Implement rating system
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
