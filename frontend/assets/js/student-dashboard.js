// ===== STUDENT DASHBOARD JAVASCRIPT =====

// Load dashboard data
async function loadDashboard() {
  try {
    const response = await apiRequest('/student/dashboard');
    
    if (response.success) {
      updateStats(response.data);
      loadCourses();
      loadRequests();
    }
  } catch (error) {
    console.error('Load dashboard error:', error);
    showNotification('Không thể tải dữ liệu dashboard', 'error');
  }
}

// Update stats
function updateStats(data) {
  // Total courses
  const totalCoursesEl = document.getElementById('totalCourses');
  if (totalCoursesEl) {
    totalCoursesEl.textContent = data.totalCourses || 0;
  }

  // Completed courses
  const completedCoursesEl = document.getElementById('completedCourses');
  if (completedCoursesEl) {
    completedCoursesEl.textContent = data.completedCourses || 0;
  }

  // Total tutors
  const totalTutorsEl = document.getElementById('totalTutors');
  if (totalTutorsEl) {
    totalTutorsEl.textContent = data.activeCourses || 0;
  }

  // Average rating
  const averageRatingEl = document.getElementById('averageRating');
  if (averageRatingEl) {
    averageRatingEl.textContent = (data.averageRating || 0).toFixed(1);
  }

  // Update badges
  const coursesCountEl = document.getElementById('coursesCount');
  if (coursesCountEl) {
    coursesCountEl.textContent = data.totalCourses || 0;
  }
}

// Load courses
async function loadCourses() {
  showLoading('coursesContainer');
  
  try {
    const response = await apiRequest('/student/courses');
    
    if (response.success) {
      const courses = response.data.courses || [];
      
      if (courses.length === 0) {
        showEmptyState(
          'coursesContainer',
          'fas fa-book',
          'Chưa có khóa học',
          'Bạn chưa tham gia khóa học nào. Hãy tìm gia sư phù hợp!'
        );
      } else {
        renderCourses(courses);
      }
    }
  } catch (error) {
    console.error('Load courses error:', error);
    showErrorState('coursesContainer', 'Không thể tải danh sách khóa học');
  }
}

// Render courses
function renderCourses(courses) {
  const container = document.getElementById('coursesContainer');
  
  const columns = [
    {
      key: 'tutor',
      label: 'Gia Sư',
      render: (value, row) => {
        const tutorName = row.tutorDetails?.fullName || 'N/A';
        const tutorAvatar = row.tutorDetails?.avatar || 
          `https://ui-avatars.com/api/?name=${encodeURIComponent(tutorName)}&background=667eea&color=fff`;
        
        return `
          <div class="table-user">
            <img src="${tutorAvatar}" class="table-avatar" alt="${tutorName}">
            <div class="table-user-info">
              <h4>${tutorName}</h4>
              <p>${row.subject || ''}</p>
            </div>
          </div>
        `;
      }
    },
    {
      key: 'subject',
      label: 'Môn Học'
    },
    {
      key: 'level',
      label: 'Trình Độ',
      render: (value) => value || 'N/A'
    },
    {
      key: 'status',
      label: 'Trạng Thái',
      render: (value) => `<span class="status-badge ${value}">${getStatusText(value)}</span>`
    },
    {
      key: 'startDate',
      label: 'Ngày Bắt Đầu',
      render: (value) => value ? formatDate(value) : 'Chưa xác định'
    },
    {
      key: 'actions',
      label: 'Thao Tác',
      render: (value, row) => `
        <div class="action-buttons">
          <button class="action-btn primary" onclick="viewCourseDetail('${row._id}')" title="Xem chi tiết">
            <i class="fas fa-eye"></i>
          </button>
          <button class="action-btn secondary" onclick="openChat('${row.tutorId}')" title="Nhắn tin">
            <i class="fas fa-comment"></i>
          </button>
          ${row.status === 'completed' ? `
            <button class="action-btn success" onclick="rateCourse('${row._id}')" title="Đánh giá">
              <i class="fas fa-star"></i>
            </button>
          ` : ''}
        </div>
      `
    }
  ];

  container.innerHTML = createTable(courses, columns);
}

// Load requests
async function loadRequests() {
  showLoading('requestsContainer');
  
  try {
    // TODO: Implement API endpoint for student requests
    // For now, show empty state
    setTimeout(() => {
      showEmptyState(
        'requestsContainer',
        'fas fa-paper-plane',
        'Chưa có yêu cầu',
        'Bạn chưa đăng yêu cầu tìm gia sư nào'
      );
    }, 500);
  } catch (error) {
    console.error('Load requests error:', error);
    showErrorState('requestsContainer', 'Không thể tải danh sách yêu cầu');
  }
}

// View course detail
async function viewCourseDetail(courseId) {
  try {
    const response = await apiRequest(`/student/courses/${courseId}`);
    
    if (response.success) {
      // TODO: Show course detail modal or navigate to detail page
      console.log('Course detail:', response.data);
      showNotification('Đang phát triển tính năng này', 'info');
    }
  } catch (error) {
    console.error('View course detail error:', error);
    showNotification('Không thể xem chi tiết khóa học', 'error');
  }
}

// Open chat
function openChat(tutorId) {
  // TODO: Implement chat functionality
  console.log('Open chat with tutor:', tutorId);
  showNotification('Đang phát triển tính năng chat', 'info');
}

// Rate course
async function rateCourse(courseId) {
  // TODO: Show rating modal
  const rating = prompt('Đánh giá từ 1-5 sao:');
  if (!rating || rating < 1 || rating > 5) {
    showNotification('Vui lòng nhập đánh giá từ 1-5', 'error');
    return;
  }

  const comment = prompt('Nhận xét (tùy chọn):');

  try {
    const response = await apiRequest(`/student/courses/${courseId}/rate`, {
      method: 'POST',
      body: JSON.stringify({
        rating: parseInt(rating),
        comment: comment || ''
      })
    });

    if (response.success) {
      showNotification('Cảm ơn bạn đã đánh giá!', 'success');
      loadCourses(); // Reload courses
    }
  } catch (error) {
    console.error('Rate course error:', error);
    showNotification('Không thể gửi đánh giá', 'error');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});

console.log('Student dashboard initialized');
