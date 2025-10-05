// ===== ADMIN COURSE MANAGEMENT JAVASCRIPT =====

let currentPage = 1;
let totalPages = 1;
let currentFilters = {
  status: '',
  subject: '',
  level: '',
  search: ''
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('📚 Admin Course Management Initialized');
  loadStats();
  loadCourses();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Status filter
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentFilters.status = e.target.value;
      currentPage = 1;
      loadCourses();
    });
  }

  // Subject filter
  const subjectFilter = document.getElementById('subjectFilter');
  if (subjectFilter) {
    subjectFilter.addEventListener('change', (e) => {
      currentFilters.subject = e.target.value;
      currentPage = 1;
      loadCourses();
    });
  }

  // Level filter
  const levelFilter = document.getElementById('levelFilter');
  if (levelFilter) {
    levelFilter.addEventListener('change', (e) => {
      currentFilters.level = e.target.value;
      currentPage = 1;
      loadCourses();
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
        loadCourses();
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
    status: '',
    subject: '',
    level: '',
    search: ''
  };
  currentPage = 1;

  // Reset UI
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) statusFilter.value = '';

  const subjectFilter = document.getElementById('subjectFilter');
  if (subjectFilter) subjectFilter.value = '';

  const levelFilter = document.getElementById('levelFilter');
  if (levelFilter) levelFilter.value = '';

  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  loadCourses();
}

// Load statistics
async function loadStats() {
  const statsContainer = document.getElementById('courseStats');
  
  try {
    const response = await apiRequest('/admin/courses/stats');
    
    if (response.success) {
      const { overview, revenue } = response.data;
      
      statsContainer.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon primary">
            <i class="fas fa-book"></i>
          </div>
          <div class="stat-content">
            <h3>${overview.total || 0}</h3>
            <p>Tổng khóa học</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon success">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="stat-content">
            <h3>${overview.active || 0}</h3>
            <p>Đang hoạt động</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon info">
            <i class="fas fa-graduation-cap"></i>
          </div>
          <div class="stat-content">
            <h3>${overview.completed || 0}</h3>
            <p>Hoàn thành</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon warning">
            <i class="fas fa-clock"></i>
          </div>
          <div class="stat-content">
            <h3>${formatCurrency(revenue.pending || 0)}</h3>
            <p>Thanh toán chờ xử lý</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon danger">
            <i class="fas fa-ban"></i>
          </div>
          <div class="stat-content">
            <h3>${overview.cancelled || 0}</h3>
            <p>Đã hủy</p>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Load stats error:', error);
  }
}

// Load courses from API
async function loadCourses() {
  showLoading('coursesContainer');
  
  try {
    // Build query string
    const params = new URLSearchParams({
      page: currentPage,
      limit: 20
    });

    if (currentFilters.status) {
      params.append('status', currentFilters.status);
    }

    if (currentFilters.subject) {
      params.append('subject', currentFilters.subject);
    }

    if (currentFilters.level) {
      params.append('level', currentFilters.level);
    }

    if (currentFilters.search) {
      params.append('search', currentFilters.search);
    }

    const response = await apiRequest(`/admin/courses?${params.toString()}`);
    
    if (response.success) {
      const courses = response.data.courses || [];
      totalPages = response.data.pages || 1;
      
      // Update total count
      const totalCount = document.getElementById('totalCourses');
      if (totalCount) {
        totalCount.textContent = `${response.data.total} khóa học`;
      }
      
      if (courses.length === 0) {
        showEmptyState(
          'coursesContainer',
          'fas fa-book',
          'Không tìm thấy khóa học',
          'Thử thay đổi bộ lọc hoặc tìm kiếm'
        );
      } else {
        renderCourses(courses);
      }

      // Update pagination
      updatePagination(response.data);
    }
  } catch (error) {
    console.error('Load courses error:', error);
    showErrorState('coursesContainer', 'Không thể tải danh sách khóa học');
  }
}

// Render courses list
function renderCourses(courses) {
  const container = document.getElementById('coursesContainer');
  
  let html = '<div class="courses-list">';
  
  courses.forEach(course => {
    // Extract tutor information with accurate hourly rate
    const tutorName = course.tutorId?.profile?.fullName || course.tutorId?.email || 'N/A';
    const tutorAvatar = course.tutorId?.profile?.avatar || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(tutorName)}&background=667eea&color=fff`;
    
    // Get hourly rate from tutor profile (most accurate)
    let tutorHourlyRate = course.tutorId?.profile?.hourlyRate || course.hourlyRate || 0;
    
    // Check if tutor has specific rate for this subject and level
    if (course.tutorId?.profile?.subjects && course.subject && course.level) {
      const matchingSubject = course.tutorId.profile.subjects.find(
        s => s.subject === course.subject && s.level === course.level
      );
      if (matchingSubject && matchingSubject.hourlyRate) {
        tutorHourlyRate = matchingSubject.hourlyRate;
      }
    }
    
    // Calculate accurate totals based on tutor's hourly rate
    const totalAmount = tutorHourlyRate * (course.totalHours || 0);
    const paidAmount = course.payment?.paidAmount || 0;
    const remainingAmount = totalAmount - paidAmount;
    
    const studentName = course.studentId?.profile?.fullName || course.studentId?.email || 'N/A';
    const studentAvatar = course.studentId?.profile?.avatar || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=56ab2f&color=fff`;

    const statusMap = {
      'pending': { label: 'Chờ xác nhận', class: 'pending' },
      'active': { label: 'Đang hoạt động', class: 'approved' },
      'paused': { label: 'Tạm dừng', class: 'cancelled' },
      'completed': { label: 'Hoàn thành', class: 'info' },
      'cancelled': { label: 'Đã hủy', class: 'danger' }
    };
    const status = statusMap[course.status] || { label: course.status, class: 'secondary' };

    const levelMap = {
      'elementary': 'Tiểu học',
      'middle_school': 'THCS',
      'high_school': 'THPT',
      'university': 'Đại học'
    };

    const locationMap = {
      'online': 'Trực tuyến',
      'student_home': 'Nhà học sinh',
      'tutor_home': 'Nhà gia sư',
      'library': 'Thư viện',
      'cafe': 'Quán cà phê',
      'other': 'Khác'
    };

    // Add source badge
    const sourceBadge = course._source === 'booking' 
      ? '<span class="source-badge booking"><i class="fas fa-calendar-check"></i> Booking Request</span>'
      : '<span class="source-badge course"><i class="fas fa-book-open"></i> Course</span>';

    html += `
      <div class="course-item ${course._source === 'booking' ? 'from-booking' : ''}">
        <div class="course-header">
          <div>
            <h3 class="course-title">
              ${course.title || 'Khóa học'}
              ${sourceBadge}
            </h3>
            <div class="course-meta">
              <span class="course-meta-item">
                <i class="fas fa-book"></i>
                ${course.subject}
              </span>
              <span class="course-meta-item">
                <i class="fas fa-graduation-cap"></i>
                ${levelMap[course.level] || course.level}
              </span>
              <span class="course-meta-item">
                <i class="fas fa-map-marker-alt"></i>
                ${locationMap[course.location?.type] || course.location?.type || 'N/A'}
              </span>
            </div>
          </div>
          <span class="status-badge ${status.class}">${status.label}</span>
        </div>

        <div class="course-users">
          <div class="course-user">
            <img src="${tutorAvatar}" alt="${tutorName}" class="user-avatar">
            <div class="user-info">
              <h4><i class="fas fa-chalkboard-teacher"></i> Gia sư</h4>
              <p>${tutorName}</p>
            </div>
          </div>
          <div class="course-user">
            <img src="${studentAvatar}" alt="${studentName}" class="user-avatar">
            <div class="user-info">
              <h4><i class="fas fa-user-graduate"></i> Học sinh</h4>
              <p>${studentName}</p>
            </div>
          </div>
        </div>

        ${course.totalHours > 0 ? `
          <div class="course-progress">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 14px; color: #666;">Tiến độ học tập</span>
              <span style="font-size: 14px; font-weight: 600; color: #667eea;">
                ${course.completedHours}/${course.totalHours}h (${course.completionRate}%)
              </span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar" style="width: ${course.completionRate}%"></div>
            </div>
          </div>
        ` : ''}

        <div class="course-stats">
          <div class="course-stat">
            <span class="course-stat-label">Học phí/giờ</span>
            <span class="course-stat-value">${formatCurrency(tutorHourlyRate)}</span>
          </div>
          <div class="course-stat">
            <span class="course-stat-label">Tổng tiền</span>
            <span class="course-stat-value">${formatCurrency(totalAmount)}</span>
          </div>
          <div class="course-stat">
            <span class="course-stat-label">Đã thanh toán</span>
            <span class="course-stat-value" style="color: #56ab2f;">
              ${formatCurrency(paidAmount)}
            </span>
          </div>
          <div class="course-stat">
            <span class="course-stat-label">Còn lại</span>
            <span class="course-stat-value" style="color: #f5576c;">
              ${formatCurrency(remainingAmount)}
            </span>
          </div>
          <div class="course-stat">
            <span class="course-stat-label">Ngày bắt đầu</span>
            <span class="course-stat-value">
              ${course.startDate ? formatDate(course.startDate) : 'Chưa xác định'}
            </span>
          </div>
        </div>

        <div class="action-buttons" style="margin-top: 16px;">
          <button class="action-btn primary" onclick="viewCourseDetail('${course._id}')" title="Xem chi tiết">
            <i class="fas fa-eye"></i> Chi tiết
          </button>
          ${course.status === 'pending' ? `
            <button class="action-btn success" onclick="updateCourseStatus('${course._id}', 'active')" title="Kích hoạt">
              <i class="fas fa-check"></i> Kích hoạt
            </button>
          ` : ''}
          ${course.status === 'active' ? `
            <button class="action-btn warning" onclick="updateCourseStatus('${course._id}', 'paused')" title="Tạm dừng">
              <i class="fas fa-pause"></i> Tạm dừng
            </button>
          ` : ''}
          ${course.status === 'paused' ? `
            <button class="action-btn success" onclick="updateCourseStatus('${course._id}', 'active')" title="Tiếp tục">
              <i class="fas fa-play"></i> Tiếp tục
            </button>
          ` : ''}
          ${(course.status === 'pending' || course.status === 'cancelled') ? `
            <button class="action-btn danger" onclick="deleteCourse('${course._id}')" title="Xóa">
              <i class="fas fa-trash"></i> Xóa
            </button>
          ` : ''}
          ${(course.status === 'active' || course.status === 'paused') ? `
            <button class="action-btn danger" onclick="cancelCourse('${course._id}')" title="Hủy khóa học">
              <i class="fas fa-ban"></i> Hủy
            </button>
          ` : ''}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
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
      Hiển thị ${(page - 1) * 20 + 1} - ${Math.min(page * 20, total)} trong tổng số ${total} khóa học
    </div>
  `;

  paginationContainer.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
  if (page < 1 || page > totalPages || page === currentPage) return;
  currentPage = page;
  loadCourses();
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// View course detail
async function viewCourseDetail(courseId) {
  try {
    const response = await apiRequest(`/admin/courses/${courseId}`);
    
    if (response.success) {
      const course = response.data;
      showCourseDetailModal(course);
    }
  } catch (error) {
    console.error('View course detail error:', error);
    showNotification('Không thể tải thông tin khóa học', 'error');
  }
}

// Show course detail modal
function showCourseDetailModal(course) {
  console.log('📋 Course detail:', course);
  
  // Extract tutor information
  const tutorId = course.tutorId?._id || 'N/A';
  const tutorName = course.tutorId?.profile?.fullName || course.tutorId?.email || 'N/A';
  const tutorEmail = course.tutorId?.email || 'N/A';
  const tutorPhone = course.tutorId?.profile?.phone || 'Chưa cập nhật';
  const tutorAvatar = course.tutorId?.profile?.avatar || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(tutorName)}&background=667eea&color=fff`;
  // Get the actual hourly rate from tutor profile (most accurate)
  // Try to get subject-specific rate first, then fall back to general rate
  let tutorHourlyRate = course.tutorId?.profile?.hourlyRate || course.hourlyRate || 0;
  let rateSource = 'Học phí chung';
  
  // Check if tutor has specific rate for this subject and level
  if (course.tutorId?.profile?.subjects && course.subject && course.level) {
    const matchingSubject = course.tutorId.profile.subjects.find(
      s => s.subject === course.subject && s.level === course.level
    );
    if (matchingSubject && matchingSubject.hourlyRate) {
      tutorHourlyRate = matchingSubject.hourlyRate;
      rateSource = `Học phí cho môn ${course.subject} - ${course.level}`;
    }
  }
  
  const tutorYearsExp = course.tutorId?.profile?.yearsOfExperience || 0;
  const tutorStats = course.tutorId?.profile?.stats || {};

  // Extract student information
  const studentId = course.studentId?._id || 'N/A';
  const studentName = course.studentId?.profile?.fullName || course.studentId?.email || 'N/A';
  const studentEmail = course.studentId?.email || 'N/A';
  const studentPhone = course.studentId?.profile?.phone || 'Chưa cập nhật';
  const studentAvatar = course.studentId?.profile?.avatar || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=56ab2f&color=fff`;

  const statusMap = {
    'pending': 'Chờ xác nhận',
    'active': 'Đang hoạt động',
    'paused': 'Tạm dừng',
    'completed': 'Hoàn thành',
    'cancelled': 'Đã hủy'
  };

  const levelMap = {
    'elementary': 'Tiểu học',
    'middle_school': 'THCS',
    'high_school': 'THPT',
    'university': 'Đại học'
  };

  const locationMap = {
    'online': 'Trực tuyến',
    'student_home': 'Nhà học sinh',
    'tutor_home': 'Nhà gia sư',
    'library': 'Thư viện',
    'cafe': 'Quán cà phê',
    'other': 'Khác'
  };

  const paymentMethodMap = {
    'hourly': 'Theo giờ',
    'package': 'Theo gói',
    'monthly': 'Theo tháng'
  };

  const modalHTML = `
    <div class="modal active" id="courseDetailModal" style="z-index: 10000;">
      <div class="modal__overlay" onclick="closeModal('courseDetailModal')"></div>
      <div class="modal__content" style="max-width: 900px;">
        <div class="modal__header">
          <h3 class="modal__title">Chi Tiết Khóa Học</h3>
          <button class="modal__close" onclick="closeModal('courseDetailModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal__body">
          <div class="detail-section">
            <h4><i class="fas fa-info-circle"></i> Thông Tin Cơ Bản</h4>
            <div class="detail-grid">
              <div class="detail-item" style="grid-column: 1 / -1;">
                <strong><i class="fas fa-fingerprint"></i> ID Khóa học:</strong>
                <span><code style="background: #f0f0f0; padding: 4px 12px; border-radius: 6px; font-size: 13px; color: #667eea; font-weight: 600;">${course._id}</code></span>
              </div>
              ${course._source ? `
              <div class="detail-item">
                <strong><i class="fas fa-source"></i> Nguồn:</strong>
                <span style="display: inline-flex; align-items: center; gap: 6px;">
                  ${course._source === 'booking' 
                    ? '<span class="source-badge booking"><i class="fas fa-calendar-check"></i> Booking Request</span>'
                    : '<span class="source-badge course"><i class="fas fa-book-open"></i> Course</span>'}
                </span>
              </div>
              ` : ''}
              <div class="detail-item">
                <strong><i class="fas fa-heading"></i> Tên khóa học:</strong>
                <span style="font-weight: 600; color: #333;">${course.title || 'N/A'}</span>
              </div>
              <div class="detail-item">
                <strong><i class="fas fa-book"></i> Môn học:</strong>
                <span style="font-weight: 600; color: #667eea;">${course.subject}</span>
              </div>
              <div class="detail-item">
                <strong><i class="fas fa-graduation-cap"></i> Cấp độ:</strong>
                <span style="font-weight: 600; color: #56ab2f;">${levelMap[course.level] || course.level}</span>
              </div>
              <div class="detail-item">
                <strong><i class="fas fa-flag"></i> Trạng thái:</strong>
                <span style="font-weight: 600; color: #f5576c;">${statusMap[course.status] || course.status}</span>
              </div>
              <div class="detail-item">
                <strong><i class="fas fa-calendar-alt"></i> Ngày tạo:</strong>
                <span>${course.createdAt ? formatDate(course.createdAt) : 'N/A'}</span>
              </div>
              <div class="detail-item">
                <strong><i class="fas fa-calendar-check"></i> Ngày bắt đầu:</strong>
                <span>${course.startDate ? formatDate(course.startDate) : 'Chưa xác định'}</span>
              </div>
              <div class="detail-item">
                <strong><i class="fas fa-calendar-times"></i> Ngày kết thúc:</strong>
                <span>${course.endDate ? formatDate(course.endDate) : 'Chưa xác định'}</span>
              </div>
            </div>
            ${course.description ? `
              <div style="margin-top: 16px; padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                <strong style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <i class="fas fa-align-left"></i> Mô tả:
                </strong>
                <p style="margin: 0; color: #666; line-height: 1.6;">${course.description}</p>
              </div>
            ` : ''}
          </div>

          <div class="detail-section">
            <h4><i class="fas fa-chalkboard-teacher"></i> Thông Tin Gia Sư</h4>
            <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-radius: 12px; border: 2px solid #667eea30;">
              <img src="${tutorAvatar}" alt="${tutorName}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 3px solid #667eea;">
              <div style="flex: 1;">
                <h5 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #333;">${tutorName}</h5>
                <div style="display: grid; gap: 6px; font-size: 14px; color: #666;">
                  <div><i class="fas fa-id-card" style="width: 18px; color: #667eea;"></i> <strong>ID:</strong> <code style="background: #f0f0f0; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${tutorId}</code></div>
                  <div><i class="fas fa-envelope" style="width: 18px; color: #667eea;"></i> ${tutorEmail}</div>
                  <div><i class="fas fa-phone" style="width: 18px; color: #667eea;"></i> ${tutorPhone}</div>
                  <div><i class="fas fa-coins" style="width: 18px; color: #667eea;"></i> <strong>Học phí:</strong> <span style="font-weight: 700; color: #667eea;">${formatCurrency(tutorHourlyRate)}/giờ</span></div>
                  ${tutorYearsExp > 0 ? `<div><i class="fas fa-award" style="width: 18px; color: #667eea;"></i> <strong>Kinh nghiệm:</strong> ${tutorYearsExp} năm</div>` : ''}
                  ${tutorStats.averageRating ? `<div><i class="fas fa-star" style="width: 18px; color: #f5a623;"></i> <strong>Đánh giá:</strong> ${tutorStats.averageRating.toFixed(1)}/5.0 (${tutorStats.totalReviews || 0} đánh giá)</div>` : ''}
                </div>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4><i class="fas fa-user-graduate"></i> Thông Tin Học Sinh</h4>
            <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: linear-gradient(135deg, #56ab2f15 0%, #a8e06315 100%); border-radius: 12px; border: 2px solid #56ab2f30;">
              <img src="${studentAvatar}" alt="${studentName}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 3px solid #56ab2f;">
              <div style="flex: 1;">
                <h5 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #333;">${studentName}</h5>
                <div style="display: grid; gap: 6px; font-size: 14px; color: #666;">
                  <div><i class="fas fa-id-card" style="width: 18px; color: #56ab2f;"></i> <strong>ID:</strong> <code style="background: #f0f0f0; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${studentId}</code></div>
                  <div><i class="fas fa-envelope" style="width: 18px; color: #56ab2f;"></i> ${studentEmail}</div>
                  <div><i class="fas fa-phone" style="width: 18px; color: #56ab2f;"></i> ${studentPhone}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4><i class="fas fa-clock"></i> Tiến Độ & Thời Gian</h4>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px;">
              <div style="text-align: center; padding: 16px; background: #f8f9fa; border-radius: 10px; border: 2px solid #e0e0e0;">
                <div style="font-size: 32px; font-weight: 700; color: #667eea; margin-bottom: 8px;">
                  ${course.totalHours || 0}
                </div>
                <div style="font-size: 13px; color: #666; font-weight: 600;">
                  <i class="fas fa-hourglass"></i> Tổng số giờ
                </div>
              </div>
              <div style="text-align: center; padding: 16px; background: #f8f9fa; border-radius: 10px; border: 2px solid #e0e0e0;">
                <div style="font-size: 32px; font-weight: 700; color: #56ab2f; margin-bottom: 8px;">
                  ${course.completedHours || 0}
                </div>
                <div style="font-size: 13px; color: #666; font-weight: 600;">
                  <i class="fas fa-check"></i> Đã hoàn thành
                </div>
              </div>
              <div style="text-align: center; padding: 16px; background: #f8f9fa; border-radius: 10px; border: 2px solid #e0e0e0;">
                <div style="font-size: 32px; font-weight: 700; color: #f5576c; margin-bottom: 8px;">
                  ${course.completionRate || 0}%
                </div>
                <div style="font-size: 13px; color: #666; font-weight: 600;">
                  <i class="fas fa-chart-line"></i> Tỷ lệ hoàn thành
                </div>
              </div>
            </div>
            ${course.totalHours > 0 ? `
              <div style="margin-top: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; font-weight: 600;">
                  <span style="color: #666;">Tiến độ học tập</span>
                  <span style="color: #667eea;">${course.completedHours}/${course.totalHours} giờ</span>
                </div>
                <div class="progress-bar-container" style="height: 12px; border-radius: 6px;">
                  <div class="progress-bar" style="width: ${course.completionRate}%; height: 12px; border-radius: 6px; position: relative;">
                    <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: white; font-size: 11px; font-weight: 700;">
                      ${course.completionRate}%
                    </span>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <div class="detail-section">
            <h4><i class="fas fa-map-marker-alt"></i> Địa Điểm</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <strong>Hình thức:</strong>
                <span>${locationMap[course.location?.type] || course.location?.type || 'N/A'}</span>
              </div>
              ${course.location?.address ? `
                <div class="detail-item">
                  <strong>Địa chỉ:</strong>
                  <span>${course.location.address}</span>
                </div>
              ` : ''}
              ${course.location?.platform ? `
                <div class="detail-item">
                  <strong>Nền tảng:</strong>
                  <span>${course.location.platform}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="detail-section">
            <h4><i class="fas fa-dollar-sign"></i> Thanh Toán & Chi Phí</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
              <div style="padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white; position: relative;">
                <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px;">
                  <i class="fas fa-coins"></i> Học phí/giờ
                </div>
                <div style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">${formatCurrency(tutorHourlyRate)}</div>
                <div style="font-size: 11px; opacity: 0.85; background: rgba(255,255,255,0.15); padding: 4px 8px; border-radius: 8px; display: inline-block;">
                  <i class="fas fa-info-circle"></i> ${rateSource}
                </div>
              </div>
              <div style="padding: 16px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 12px; color: white;">
                <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px;">
                  <i class="fas fa-calculator"></i> Tổng tiền (${course.totalHours || 0} giờ)
                </div>
                <div style="font-size: 24px; font-weight: 700;">${formatCurrency((tutorHourlyRate * (course.totalHours || 0)))}</div>
              </div>
              <div style="padding: 16px; background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%); border-radius: 12px; color: white;">
                <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px;">
                  <i class="fas fa-check-circle"></i> Đã thanh toán
                </div>
                <div style="font-size: 24px; font-weight: 700;">${formatCurrency(course.payment?.paidAmount || 0)}</div>
              </div>
              <div style="padding: 16px; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); border-radius: 12px; color: white;">
                <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px;">
                  <i class="fas fa-hourglass-half"></i> Còn lại
                </div>
                <div style="font-size: 24px; font-weight: 700;">${formatCurrency((tutorHourlyRate * (course.totalHours || 0)) - (course.payment?.paidAmount || 0))}</div>
              </div>
            </div>
            <div class="detail-grid">
              <div class="detail-item">
                <strong><i class="fas fa-credit-card"></i> Phương thức thanh toán:</strong>
                <span style="font-weight: 600;">${paymentMethodMap[course.payment?.method] || course.payment?.method || 'N/A'}</span>
              </div>
            </div>
            <div style="margin-top: 16px; padding: 12px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 8px;">
              <p style="margin: 0; color: #856404; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-info-circle"></i>
                <strong>Lưu ý:</strong> Học phí được lấy trực tiếp từ hồ sơ gia sư và có thể được cập nhật bất cứ lúc nào. Tổng tiền được tính tự động dựa trên học phí hiện tại × số giờ học.
              </p>
            </div>
          </div>

          ${course.notes ? `
            <div class="detail-section">
              <h4><i class="fas fa-sticky-note"></i> Ghi Chú</h4>
              <p style="color: #666; margin: 0;">${course.notes}</p>
            </div>
          ` : ''}

          ${course.cancellationReason ? `
            <div class="detail-section">
              <h4><i class="fas fa-ban"></i> Lý Do Hủy</h4>
              <p style="color: #f5576c; margin: 0;">${course.cancellationReason}</p>
              <p style="color: #999; font-size: 13px; margin-top: 8px;">
                Hủy lúc: ${course.cancelledAt ? formatDate(course.cancelledAt) : 'N/A'}
              </p>
            </div>
          ` : ''}
        </div>
        <div class="modal__footer">
          <button class="btn btn-secondary" onclick="closeModal('courseDetailModal')">Đóng</button>
          ${course.status === 'pending' ? `
            <button class="btn btn-success" onclick="updateCourseStatus('${course._id}', 'active'); closeModal('courseDetailModal');">
              <i class="fas fa-check"></i> Kích hoạt
            </button>
          ` : ''}
          ${course.status === 'active' ? `
            <button class="btn btn-warning" onclick="updateCourseStatus('${course._id}', 'paused'); closeModal('courseDetailModal');">
              <i class="fas fa-pause"></i> Tạm dừng
            </button>
          ` : ''}
          ${course.status === 'paused' ? `
            <button class="btn btn-success" onclick="updateCourseStatus('${course._id}', 'active'); closeModal('courseDetailModal');">
              <i class="fas fa-play"></i> Tiếp tục
            </button>
          ` : ''}
          ${(course.status === 'active' || course.status === 'paused') ? `
            <button class="btn btn-danger" onclick="cancelCourse('${course._id}'); closeModal('courseDetailModal');">
              <i class="fas fa-ban"></i> Hủy khóa học
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  // Remove existing modal if any
  const existingModal = document.getElementById('courseDetailModal');
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

// Update course status
async function updateCourseStatus(courseId, newStatus) {
  const statusNames = {
    'active': 'kích hoạt',
    'paused': 'tạm dừng',
    'completed': 'hoàn thành'
  };
  
  if (!confirm(`Bạn có chắc chắn muốn ${statusNames[newStatus] || 'thay đổi'} khóa học này?`)) {
    return;
  }

  try {
    const response = await apiRequest(`/admin/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });

    if (response.success) {
      showNotification(`${statusNames[newStatus].charAt(0).toUpperCase() + statusNames[newStatus].slice(1)} khóa học thành công`, 'success');
      loadCourses();
      loadStats();
    }
  } catch (error) {
    console.error('Update course status error:', error);
    showNotification(`Không thể ${statusNames[newStatus]} khóa học`, 'error');
  }
}

// Cancel course
async function cancelCourse(courseId) {
  const reason = prompt('Vui lòng nhập lý do hủy khóa học:');
  
  if (!reason || reason.trim() === '') {
    showNotification('Vui lòng nhập lý do hủy', 'warning');
    return;
  }

  try {
    const response = await apiRequest(`/admin/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'cancelled',
        cancellationReason: reason.trim()
      })
    });

    if (response.success) {
      showNotification('Hủy khóa học thành công', 'success');
      loadCourses();
      loadStats();
    }
  } catch (error) {
    console.error('Cancel course error:', error);
    showNotification('Không thể hủy khóa học', 'error');
  }
}

// Delete course
async function deleteCourse(courseId) {
  if (!confirm('Bạn có chắc chắn muốn xóa khóa học này? Hành động này không thể hoàn tác!')) {
    return;
  }

  try {
    const response = await apiRequest(`/admin/courses/${courseId}`, {
      method: 'DELETE'
    });

    if (response.success) {
      showNotification('Xóa khóa học thành công', 'success');
      loadCourses();
      loadStats();
    }
  } catch (error) {
    console.error('Delete course error:', error);
    showNotification('Không thể xóa khóa học', 'error');
  }
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount || 0);
}
