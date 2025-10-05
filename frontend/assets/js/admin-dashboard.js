// ===== ADMIN DASHBOARD JAVASCRIPT =====

let userChart = null;
let userDistributionChart = null;

// Load dashboard data
async function loadDashboard() {
  try {
    const period = document.getElementById('userChartPeriod')?.value || 'month';
    const response = await apiRequest(`/admin/dashboard?period=${period}`);
    
    if (response.success) {
      // Backend trả về data.stats chứa các thống kê
      updateStats(response.data.stats || response.data);
      loadPendingTutors();
      loadRecentUsers();
      loadPendingBlogs();
      loadUserCharts(response.data.userStats);
      loadSystemActivities(response.data.systemActivities || []);
    }
  } catch (error) {
    console.error('Load dashboard error:', error);
    showNotification('Không thể tải dữ liệu dashboard', 'error');
  }
}

// Update stats
function updateStats(data) {
  // Total users
  const totalUsersEl = document.getElementById('totalUsers');
  if (totalUsersEl) {
    totalUsersEl.textContent = data.totalUsers || 0;
  }

  // Total students display
  const totalStudentsEl = document.getElementById('totalStudents');
  if (totalStudentsEl) {
    totalStudentsEl.textContent = data.totalStudents || 0;
  }

  // Total tutors display in stat card
  const totalTutorsDisplayEl = document.getElementById('totalTutorsDisplay');
  if (totalTutorsDisplayEl) {
    totalTutorsDisplayEl.textContent = data.totalTutors || 0;
  }

  // Total tutors
  const totalTutorsEl = document.getElementById('totalTutors');
  if (totalTutorsEl) {
    totalTutorsEl.textContent = data.totalTutors || 0;
  }

  // Pending tutors
  const pendingTutorsEl = document.getElementById('pendingTutors');
  if (pendingTutorsEl) {
    pendingTutorsEl.textContent = data.pendingTutors || 0;
  }

  // Pending tutors count display
  const pendingTutorsCountDisplayEl = document.getElementById('pendingTutorsCountDisplay');
  if (pendingTutorsCountDisplayEl) {
    pendingTutorsCountDisplayEl.textContent = data.pendingTutors || 0;
  }

  // Total courses
  const totalCoursesEl = document.getElementById('totalCourses');
  if (totalCoursesEl) {
    totalCoursesEl.textContent = data.totalCourses || 0;
  }

  // Total courses 2 (for revenue card)
  const totalCourses2El = document.getElementById('totalCourses2');
  if (totalCourses2El) {
    totalCourses2El.textContent = data.totalCourses || 0;
  }

  // Active courses
  const activeCoursesEl = document.getElementById('activeCourses');
  if (activeCoursesEl) {
    activeCoursesEl.textContent = data.activeCourses || 0;
  }

  // Total revenue
  const totalRevenueEl = document.getElementById('totalRevenue');
  if (totalRevenueEl) {
    totalRevenueEl.textContent = formatCurrency(data.totalRevenue || 0);
  }

  // Update badges in sidebar
  const usersCountEl = document.getElementById('usersCount');
  if (usersCountEl) {
    usersCountEl.textContent = data.totalUsers || 0;
  }

  const pendingTutorsCountEl = document.getElementById('pendingTutorsCount');
  if (pendingTutorsCountEl) {
    pendingTutorsCountEl.textContent = data.pendingTutors || 0;
  }

  const pendingBlogsCountEl = document.getElementById('pendingBlogsCount');
  if (pendingBlogsCountEl) {
    pendingBlogsCountEl.textContent = data.pendingBlogs || data.pendingBlogPosts || 0;
  }

  // Pending blogs count display
  const pendingBlogsCountDisplayEl = document.getElementById('pendingBlogsCountDisplay');
  if (pendingBlogsCountDisplayEl) {
    pendingBlogsCountDisplayEl.textContent = data.pendingBlogs || data.pendingBlogPosts || 0;
  }
}

// Load user charts
function loadUserCharts(userStats) {
  loadUserGrowthChart(userStats);
  loadUserDistributionChart(userStats);
}

// Load user growth chart
function loadUserGrowthChart(userStats) {
  const ctx = document.getElementById('userChart');
  if (!ctx) return;

  // Destroy previous chart if exists
  if (userChart) {
    userChart.destroy();
  }

  const labels = userStats?.labels || ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
  const studentsData = userStats?.students || [0, 0, 0, 0];
  const tutorsData = userStats?.tutors || [0, 0, 0, 0];

  userChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Học sinh',
          data: studentsData,
          borderColor: 'rgb(102, 126, 234)',
          backgroundColor: 'rgba(0, 225, 255, 0.2)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Gia sư',
          data: tutorsData,
          borderColor: 'rgb(255, 153, 102)',
          backgroundColor: 'rgba(255, 85, 0, 0.2)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Load user distribution chart
function loadUserDistributionChart(userStats) {
  const ctx = document.getElementById('userDistributionChart');
  if (!ctx) return;

  // Destroy previous chart if exists
  if (userDistributionChart) {
    userDistributionChart.destroy();
  }

  const students = userStats?.totalStudents || 0;
  const tutors = userStats?.totalTutors || 0;
  const admins = userStats?.totalAdmins || 0;

  userDistributionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Học sinh', 'Gia sư', 'Admin'],
      datasets: [{
        data: [students, tutors, admins],
        backgroundColor: [
          'rgba(102, 126, 234, 0.8)',
          'rgba(255, 153, 102, 0.8)',
          'rgba(168, 237, 234, 0.8)'
        ],
        borderColor: [
          'rgb(102, 126, 234)',
          'rgb(255, 153, 102)',
          'rgb(168, 237, 234)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        }
      }
    }
  });
}

// Load pending tutors
async function loadPendingTutors() {
  showLoading('pendingTutorsContainer');
  
  try {
    // FIX: Use 'approvalStatus=pending' instead of 'status=pending'
    const response = await apiRequest('/admin/users?role=tutor&approvalStatus=pending&limit=5');
    
    if (response.success) {
      const tutors = response.data.users || [];
      
      if (tutors.length === 0) {
        showEmptyState(
          'pendingTutorsContainer',
          'fas fa-user-check',
          'Không có gia sư chờ duyệt',
          'Tất cả gia sư đã được xét duyệt'
        );
      } else {
        renderPendingTutors(tutors);
      }
    }
  } catch (error) {
    console.error('Load pending tutors error:', error);
    showErrorState('pendingTutorsContainer', 'Không thể tải danh sách gia sư');
  }
}

// Render pending tutors
function renderPendingTutors(tutors) {
  const container = document.getElementById('pendingTutorsContainer');
  
  const columns = [
    {
      key: 'profile',
      label: 'Gia Sư',
      render: (value, row) => {
        const tutorName = row.profile?.fullName || row.email;
        const tutorAvatar = row.profile?.avatar || 
          `https://ui-avatars.com/api/?name=${encodeURIComponent(tutorName)}&background=667eea&color=fff`;
        
        return `
          <div class="table-user">
            <img src="${tutorAvatar}" class="table-avatar" alt="${tutorName}">
            <div class="table-user-info">
              <h4>${tutorName}</h4>
              <p>${row.email}</p>
            </div>
          </div>
        `;
      }
    },
    {
      key: 'profile',
      label: 'Môn Dạy',
      render: (value) => {
        if (!value || !value.subjects || value.subjects.length === 0) {
          return '<span style="color: #999;">Chưa cập nhật</span>';
        }
        return value.subjects.map(s => s.subject).join(', ');
      }
    },
    {
      key: 'profile',
      label: 'Kinh Nghiệm',
      render: (value) => {
        if (!value || !value.teachingExperience) {
          return '<span style="color: #999;">Chưa cập nhật</span>';
        }
        const experience = value.teachingExperience.totalYears || 0;
        return `${experience} năm`;
      }
    },
    {
      key: 'createdAt',
      label: 'Ngày Đăng Ký',
      render: (value) => formatDate(value)
    },
    {
      key: 'actions',
      label: 'Thao Tác',
      render: (value, row) => `
        <div class="action-buttons">
          <button class="action-btn primary" onclick="viewTutorProfile('${row._id}')" title="Xem hồ sơ">
            <i class="fas fa-eye"></i>
          </button>
          <button class="action-btn success" onclick="approveTutor('${row._id}')" title="Duyệt">
            <i class="fas fa-check"></i>
          </button>
          <button class="action-btn danger" onclick="rejectTutor('${row._id}')" title="Từ chối">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `
    }
  ];

  container.innerHTML = createTable(tutors, columns);
}

// Load recent users
async function loadRecentUsers() {
  showLoading('recentUsersContainer');
  
  try {
    const response = await apiRequest('/admin/users?limit=10&sort=-createdAt');
    
    if (response.success) {
      const users = response.data.users || [];
      
      if (users.length === 0) {
        showEmptyState(
          'recentUsersContainer',
          'fas fa-users',
          'Chưa có người dùng',
          'Chưa có người dùng mới đăng ký'
        );
      } else {
        renderRecentUsers(users);
      }
    }
  } catch (error) {
    console.error('Load recent users error:', error);
    showErrorState('recentUsersContainer', 'Không thể tải danh sách người dùng');
  }
}

// Render recent users
function renderRecentUsers(users) {
  const container = document.getElementById('recentUsersContainer');
  
  const columns = [
    {
      key: 'profile',
      label: 'Người Dùng',
      render: (value, row) => {
        const userName = value?.fullName || row.email;
        const userAvatar = value?.avatar || 
          `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=667eea&color=fff`;
        
        return `
          <div class="table-user">
            <img src="${userAvatar}" class="table-avatar" alt="${userName}">
            <div class="table-user-info">
              <h4>${userName}</h4>
              <p>${row.email}</p>
            </div>
          </div>
        `;
      }
    },
    {
      key: 'role',
      label: 'Vai Trò',
      render: (value) => {
        const roleMap = {
          'student': 'Học sinh',
          'tutor': 'Gia sư',
          'admin': 'Admin'
        };
        return roleMap[value] || value;
      }
    },
    {
      key: 'isEmailVerified',
      label: 'Email',
      render: (value) => value ? 
        '<span class="status-badge approved">Đã xác thực</span>' : 
        '<span class="status-badge pending">Chưa xác thực</span>'
    },
    {
      key: 'isActive',
      label: 'Trạng Thái',
      render: (value) => value ? 
        '<span class="status-badge active">Hoạt động</span>' : 
        '<span class="status-badge cancelled">Vô hiệu hóa</span>'
    },
    {
      key: 'createdAt',
      label: 'Ngày Đăng Ký',
      render: (value) => formatDate(value)
    },
    {
      key: 'actions',
      label: 'Thao Tác',
      render: (value, row) => `
        <div class="action-buttons">
          <button class="action-btn primary" onclick="viewUserDetail('${row._id}')" title="Xem chi tiết">
            <i class="fas fa-eye"></i>
          </button>
          <button class="action-btn ${row.isActive ? 'danger' : 'success'}" 
                  onclick="toggleUserStatus('${row._id}', ${row.isActive})" 
                  title="${row.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}">
            <i class="fas fa-${row.isActive ? 'ban' : 'check'}"></i>
          </button>
        </div>
      `
    }
  ];

  container.innerHTML = createTable(users, columns);
}

// Load pending blogs
async function loadPendingBlogs() {
  showLoading('pendingBlogsContainer');
  
  try {
    const response = await apiRequest('/admin/content/blogs?status=pending&limit=5');
    
    if (response.success) {
      const blogs = response.data.blogPosts || []; // Backend returns blogPosts
      
      if (blogs.length === 0) {
        showEmptyState(
          'pendingBlogsContainer',
          'fas fa-blog',
          'Không có bài viết chờ duyệt',
          'Tất cả bài viết đã được xét duyệt'
        );
      } else {
        renderPendingBlogs(blogs);
      }
    }
  } catch (error) {
    console.error('Load pending blogs error:', error);
    showErrorState('pendingBlogsContainer', 'Không thể tải danh sách bài viết');
  }
}

// Render pending blogs
function renderPendingBlogs(blogs) {
  const container = document.getElementById('pendingBlogsContainer');
  
  const columns = [
    {
      key: 'title',
      label: 'Tiêu Đề'
    },
    {
      key: 'author',
      label: 'Tác Giả',
      render: (value) => value?.fullName || 'N/A'
    },
    {
      key: 'category',
      label: 'Danh Mục'
    },
    {
      key: 'createdAt',
      label: 'Ngày Đăng',
      render: (value) => formatDate(value)
    },
    {
      key: 'actions',
      label: 'Thao Tác',
      render: (value, row) => `
        <div class="action-buttons">
          <button class="action-btn primary" onclick="viewBlogPost('${row._id}')" title="Xem bài viết">
            <i class="fas fa-eye"></i>
          </button>
          <button class="action-btn success" onclick="approveBlogPost('${row._id}')" title="Duyệt">
            <i class="fas fa-check"></i>
          </button>
          <button class="action-btn danger" onclick="rejectBlogPost('${row._id}')" title="Từ chối">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `
    }
  ];

  container.innerHTML = createTable(blogs, columns);
}

// View tutor profile
async function viewTutorProfile(userId) {
  try {
    const response = await apiRequest(`/admin/users/${userId}`);
    
    if (response.success) {
      const user = response.data;
      showTutorProfileModal(user);
    }
  } catch (error) {
    console.error('Load tutor profile error:', error);
    showNotification('Không thể tải thông tin gia sư', 'error');
  }
}

// Show tutor profile modal
function showTutorProfileModal(user) {
  const profile = user.profile || {};
  const subjects = profile.subjects || [];
  const education = profile.education || [];
  
  const modalHTML = `
    <div class="modal-overlay" id="tutorProfileModal" onclick="closeModal('tutorProfileModal')">
      <div class="modal-container" onclick="event.stopPropagation()" style="max-width: 700px;">
        <div class="modal-header">
          <h2><i class="fas fa-user-circle"></i> Thông Tin Gia Sư</h2>
          <button class="modal-close" onclick="closeModal('tutorProfileModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <!-- Basic Info -->
          <div class="info-section">
            <div class="user-avatar-large" style="text-align: center; margin-bottom: 20px;">
              <img src="${profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName || user.email)}&size=120&background=667eea&color=fff`}" 
                   alt="${profile.fullName}" 
                   style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #667eea;">
            </div>
            
            <h3 style="text-align: center; color: #333; margin-bottom: 5px;">${profile.fullName || 'N/A'}</h3>
            <p style="text-align: center; color: #666; margin-bottom: 20px;">${user.email}</p>
            
            <div class="info-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
              <div class="info-item">
                <strong><i class="fas fa-phone"></i> Điện thoại:</strong>
                <span>${profile.phone || 'Chưa cập nhật'}</span>
              </div>
              <div class="info-item">
                <strong><i class="fas fa-birthday-cake"></i> Ngày sinh:</strong>
                <span>${profile.dateOfBirth ? formatDate(profile.dateOfBirth) : 'Chưa cập nhật'}</span>
              </div>
              <div class="info-item">
                <strong><i class="fas fa-venus-mars"></i> Giới tính:</strong>
                <span>${profile.gender === 'male' ? 'Nam' : profile.gender === 'female' ? 'Nữ' : 'Chưa cập nhật'}</span>
              </div>
              <div class="info-item">
                <strong><i class="fas fa-calendar-alt"></i> Ngày đăng ký:</strong>
                <span>${formatDate(user.createdAt)}</span>
              </div>
            </div>
            
            ${profile.address ? `
              <div class="info-item" style="margin-bottom: 15px;">
                <strong><i class="fas fa-map-marker-alt"></i> Địa chỉ:</strong>
                <span>${[profile.address.street, profile.address.ward, profile.address.district, profile.address.city].filter(Boolean).join(', ') || 'Chưa cập nhật'}</span>
              </div>
            ` : ''}
          </div>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          
          <!-- Subjects -->
          ${subjects.length > 0 ? `
            <div class="info-section">
              <h4><i class="fas fa-book"></i> Môn học dạy (${subjects.length})</h4>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-top: 10px;">
                ${subjects.map(s => `
                  <div style="padding: 10px; background: #f8f9fa; border-radius: 8px; border-left: 3px solid #667eea;">
                    <strong>${s.subject}</strong><br>
                    <small style="color: #666;">Cấp độ: ${s.level}</small><br>
                    <small style="color: #667eea; font-weight: bold;">${s.hourlyRate?.toLocaleString('vi-VN')} đ/giờ</small>
                  </div>
                `).join('')}
              </div>
            </div>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          ` : '<p style="color: #999; text-align: center; margin: 20px 0;"><i class="fas fa-info-circle"></i> Chưa cập nhật môn học</p>'}
          
          <!-- Education -->
          ${education.length > 0 ? `
            <div class="info-section">
              <h4><i class="fas fa-graduation-cap"></i> Học vấn</h4>
              ${education.map(e => `
                <div style="padding: 15px; background: #f8f9fa; border-radius: 8px; margin-top: 10px;">
                  <strong>${e.degree} - ${e.major}</strong><br>
                  <span style="color: #666;">${e.university}</span><br>
                  <small style="color: #888;">Tốt nghiệp: ${e.graduationYear}${e.gpa ? ` | GPA: ${e.gpa}` : ''}</small>
                </div>
              `).join('')}
            </div>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          ` : ''}
          
          <!-- Bio -->
          ${profile.bio ? `
            <div class="info-section">
              <h4><i class="fas fa-user-edit"></i> Giới thiệu</h4>
              <p style="color: #666; line-height: 1.6; margin-top: 10px;">${profile.bio}</p>
            </div>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          ` : ''}
          
          <!-- Status -->
          <div class="info-section">
            <h4><i class="fas fa-info-circle"></i> Trạng thái</h4>
            <div style="margin-top: 10px;">
              <span class="status-badge ${user.isEmailVerified ? 'approved' : 'pending'}">
                ${user.isEmailVerified ? '✓ Email đã xác thực' : '⏳ Email chưa xác thực'}
              </span>
              <span class="status-badge ${user.approvalStatus === 'approved' ? 'approved' : user.approvalStatus === 'rejected' ? 'cancelled' : 'pending'}" style="margin-left: 10px;">
                ${user.approvalStatus === 'approved' ? '✓ Đã duyệt' : user.approvalStatus === 'rejected' ? '✗ Đã từ chối' : '⏳ Chờ duyệt'}
              </span>
              <span class="status-badge ${user.isActive ? 'active' : 'cancelled'}" style="margin-left: 10px;">
                ${user.isActive ? '● Đang hoạt động' : '○ Vô hiệu hóa'}
              </span>
            </div>
          </div>
        </div>
        
        <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
          ${user.approvalStatus === 'pending' ? `
            <button class="btn btn-success" onclick="approveTutor('${user._id}'); closeModal('tutorProfileModal')">
              <i class="fas fa-check"></i> Duyệt Gia Sư
            </button>
            <button class="btn btn-danger" onclick="rejectTutor('${user._id}'); closeModal('tutorProfileModal')">
              <i class="fas fa-times"></i> Từ Chối
            </button>
          ` : ''}
          <button class="btn btn-secondary" onclick="closeModal('tutorProfileModal')">
            Đóng
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  setTimeout(() => {
    document.getElementById('tutorProfileModal').classList.add('active');
  }, 10);
}

// Close modal helper
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  }
}

// View user detail
async function viewUserDetail(userId) {
  try {
    const response = await apiRequest(`/admin/users/${userId}`);
    
    if (response.success) {
      const user = response.data;
      if (user.role === 'tutor') {
        showTutorProfileModal(user);
      } else {
        showNotification('Chi tiết người dùng đang được phát triển', 'info');
      }
    }
  } catch (error) {
    console.error('Load user detail error:', error);
    showNotification('Không thể tải thông tin người dùng', 'error');
  }
}

// View blog post
function viewBlogPost(postId) {
  console.log('View blog post:', postId);
  showNotification('Đang phát triển tính năng này', 'info');
}

// Approve tutor
async function approveTutor(userId) {
  showConfirmModal(
    'Duyệt Gia Sư',
    'Bạn có chắc chắn muốn duyệt gia sư này? Họ sẽ nhận được email thông báo và có thể bắt đầu nhận học sinh.',
    async () => {
      try {
        const response = await apiRequest(`/admin/users/${userId}/approve`, {
          method: 'PUT',
          body: JSON.stringify({
            isApproved: true
          })
        });

        if (response.success) {
          showNotification('✅ Đã duyệt gia sư thành công! Email thông báo đã được gửi.', 'success');
          loadPendingTutors();
          loadDashboard(); // Refresh stats
        }
      } catch (error) {
        console.error('Approve tutor error:', error);
        showNotification('❌ Có lỗi xảy ra khi duyệt gia sư', 'error');
      }
    }
  );
}

// Reject tutor
async function rejectTutor(userId) {
  showRejectModal(userId);
}

// Show reject modal
function showRejectModal(userId) {
  const modalHTML = `
    <div class="modal-overlay" id="rejectModal" onclick="closeModal('rejectModal')">
      <div class="modal-container" onclick="event.stopPropagation()" style="max-width: 500px;">
        <div class="modal-header" style="background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white;">
          <h2><i class="fas fa-times-circle"></i> Từ Chối Gia Sư</h2>
          <button class="modal-close" onclick="closeModal('rejectModal')" style="color: white;">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <p style="color: #666; margin-bottom: 20px;">
            Vui lòng nhập lý do từ chối để gia sư có thể cải thiện hồ sơ:
          </p>
          
          <textarea id="rejectReason" 
                    placeholder="Ví dụ: Thiếu chứng chỉ hành nghề, thông tin học vấn không rõ ràng..." 
                    style="width: 100%; min-height: 120px; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-family: inherit; resize: vertical;"
                    required></textarea>
          
          <div style="background: #fff3cd; padding: 12px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #ffc107;">
            <small style="color: #856404;">
              <i class="fas fa-exclamation-triangle"></i> 
              Gia sư sẽ nhận email thông báo kèm lý do từ chối này.
            </small>
          </div>
        </div>
        
        <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
          <button class="btn btn-secondary" onclick="closeModal('rejectModal')">
            Hủy
          </button>
          <button class="btn btn-danger" onclick="confirmRejectTutor('${userId}')">
            <i class="fas fa-times"></i> Từ Chối
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  setTimeout(() => {
    document.getElementById('rejectModal').classList.add('active');
    document.getElementById('rejectReason').focus();
  }, 10);
}

// Confirm reject tutor
async function confirmRejectTutor(userId) {
  const reason = document.getElementById('rejectReason').value.trim();
  
  if (!reason) {
    showNotification('⚠️ Vui lòng nhập lý do từ chối', 'warning');
    return;
  }
  
  try {
    const response = await apiRequest(`/admin/users/${userId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({
        isApproved: false,
        reason: reason
      })
    });

    if (response.success) {
      closeModal('rejectModal');
      showNotification('✅ Đã từ chối gia sư. Email thông báo đã được gửi.', 'success');
      loadPendingTutors();
      loadDashboard(); // Refresh stats
    }
  } catch (error) {
    console.error('Reject tutor error:', error);
    showNotification('❌ Có lỗi xảy ra', 'error');
  }
}

// Show confirm modal
function showConfirmModal(title, message, onConfirm) {
  const modalHTML = `
    <div class="modal-overlay" id="confirmModal" onclick="closeModal('confirmModal')">
      <div class="modal-container" onclick="event.stopPropagation()" style="max-width: 450px;">
        <div class="modal-header">
          <h2><i class="fas fa-question-circle"></i> ${title}</h2>
          <button class="modal-close" onclick="closeModal('confirmModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <p style="color: #666; line-height: 1.6;">${message}</p>
        </div>
        
        <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
          <button class="btn btn-secondary" onclick="closeModal('confirmModal')">
            Hủy
          </button>
          <button class="btn btn-primary" onclick="closeModal('confirmModal'); this.disabled=true;" id="confirmBtn">
            <i class="fas fa-check"></i> Xác Nhận
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  setTimeout(() => {
    document.getElementById('confirmModal').classList.add('active');
    document.getElementById('confirmBtn').onclick = () => {
      closeModal('confirmModal');
      onConfirm();
    };
  }, 10);
}

// Approve blog post
async function approveBlogPost(postId) {
  showConfirmModal(
    'Duyệt Bài Viết',
    'Bạn có chắc muốn duyệt bài viết này? Bài viết sẽ được công khai trên trang blog.',
    async () => {
      try {
        const response = await apiRequest(`/admin/content/blogs/${postId}/moderate`, {
          method: 'PUT',
          body: JSON.stringify({
            status: 'approved'
          })
        });

        if (response.success) {
          showNotification('✅ Đã duyệt bài viết thành công', 'success');
          loadPendingBlogs();
        }
      } catch (error) {
        console.error('Approve blog error:', error);
        showNotification('❌ Có lỗi xảy ra khi duyệt bài viết', 'error');
      }
    }
  );
}

// Reject blog post
async function rejectBlogPost(postId) {
  const reason = prompt('Lý do từ chối:');
  if (!reason) return;

  try {
    const response = await apiRequest(`/admin/content/blogs/${postId}/moderate`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'rejected',
        reason: reason
      })
    });

    if (response.success) {
      showNotification('✅ Đã từ chối bài viết', 'success');
      loadPendingBlogs();
    }
  } catch (error) {
    console.error('Reject blog error:', error);
    showNotification('❌ Có lỗi xảy ra', 'error');
  }
}

// Toggle user status
async function toggleUserStatus(userId, currentStatus) {
  const action = currentStatus ? 'vô hiệu hóa' : 'kích hoạt';
  
  showConfirmModal(
    `${currentStatus ? 'Vô Hiệu Hóa' : 'Kích Hoạt'} Người Dùng`,
    `Bạn có chắc muốn ${action} người dùng này?`,
    async () => {
      try {
        const response = await apiRequest(`/admin/users/${userId}/toggle-status`, {
          method: 'PUT',
          body: JSON.stringify({
            reason: currentStatus ? 'Vi phạm chính sách' : 'Đã xem xét lại'
          })
        });

        if (response.success) {
          showNotification(`✅ Đã ${action} người dùng thành công`, 'success');
          loadRecentUsers();
        }
      } catch (error) {
        console.error('Toggle user status error:', error);
        showNotification(`❌ Có lỗi xảy ra khi ${action} người dùng`, 'error');
      }
    }
  );
}

// Load system activities
function loadSystemActivities(activities) {
  const container = document.getElementById('systemActivityContainer');
  
  if (!activities || activities.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-clock"></i>
        <h3>Chưa có hoạt động</h3>
        <p>Các hoạt động gần đây sẽ hiển thị ở đây</p>
      </div>
    `;
    return;
  }
  
  const activitiesHTML = activities.map(activity => {
    const timeAgo = formatTimeAgo(activity.time);
    return `
      <div class="activity-item" style="display: flex; align-items: start; gap: 15px; padding: 15px; border-bottom: 1px solid #f0f0f0; transition: background 0.2s;">
        <div class="activity-icon" style="width: 40px; height: 40px; border-radius: 50%; background: ${activity.color}15; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i class="fas ${activity.icon}" style="color: ${activity.color}; font-size: 16px;"></i>
        </div>
        <div class="activity-content" style="flex: 1; min-width: 0;">
          <p style="margin: 0 0 5px 0; color: #333; font-size: 14px; line-height: 1.5;">${activity.message}</p>
          <small style="color: #999; font-size: 12px;">
            <i class="fas fa-clock" style="margin-right: 4px;"></i>${timeAgo}
          </small>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = `<div style="max-height: 400px; overflow-y: auto;">${activitiesHTML}</div>`;
}

// Format time ago helper
function formatTimeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000); // seconds
  
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  
  return new Date(date).toLocaleDateString('vi-VN');
}

// View blog post detail
function viewBlogPost(postId) {
  viewBlogPostDetail(postId);
}

// View blog post detail modal
async function viewBlogPostDetail(postId) {
  try {
    const response = await apiRequest(`/admin/content/blogs?limit=100`);
    
    if (response.success) {
      const post = response.data.blogPosts.find(p => p._id === postId);
      
      if (!post) {
        showNotification('Không tìm thấy bài viết', 'error');
        return;
      }
      
      showBlogPostModal(post);
    }
  } catch (error) {
    console.error('Load blog post error:', error);
    showNotification('Không thể tải bài viết', 'error');
  }
}

// Show blog post modal
function showBlogPostModal(post) {
  const authorName = post.authorProfile?.fullName || post.author?.email || 'N/A';
  const authorAvatar = post.authorProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=667eea&color=fff`;
  
  const modalHTML = `
    <div class="modal-overlay" id="blogPostModal" onclick="closeModal('blogPostModal')">
      <div class="modal-container" onclick="event.stopPropagation()" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <h2><i class="fas fa-blog"></i> Chi Tiết Bài Viết</h2>
          <button class="modal-close" onclick="closeModal('blogPostModal')" style="color: white;">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <!-- Author Info -->
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
            <img src="${authorAvatar}" 
                 alt="${authorName}" 
                 style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid #667eea;">
            <div>
              <h4 style="margin: 0 0 4px 0; font-size: 15px; color: #333;">${authorName}</h4>
              <p style="margin: 0; font-size: 13px; color: #666;">
                <i class="fas fa-calendar-alt" style="margin-right: 5px;"></i>
                ${formatDate(post.createdAt)}
              </p>
            </div>
            <span class="status-badge ${post.status === 'approved' ? 'approved' : post.status === 'rejected' ? 'cancelled' : 'pending'}" style="margin-left: auto;">
              ${post.status === 'approved' ? '✓ Đã duyệt' : post.status === 'rejected' ? '✗ Từ chối' : '⏳ Chờ duyệt'}
            </span>
          </div>
          
          <!-- Post Image -->
          ${post.image ? `
            <div style="margin-bottom: 20px;">
              <img src="${post.image}" alt="${post.title}" style="width: 100%; border-radius: 8px; max-height: 300px; object-fit: cover;">
            </div>
          ` : ''}
          
          <!-- Post Content -->
          <div style="margin-bottom: 20px;">
            <h3 style="color: #333; margin-bottom: 10px;">${post.title}</h3>
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
              <span style="background: #f3f4f6; padding: 4px 12px; border-radius: 20px; font-size: 12px; color: #667eea;">
                <i class="fas fa-folder"></i> ${post.category}
              </span>
              ${post.type ? `
                <span style="background: #f3f4f6; padding: 4px 12px; border-radius: 20px; font-size: 12px; color: #10b981;">
                  <i class="fas fa-file-alt"></i> ${post.type}
                </span>
              ` : ''}
            </div>
            <div style="color: #555; line-height: 1.8; font-size: 14px;">
              ${post.content}
            </div>
          </div>
          
          <!-- Tags -->
          ${post.tags && post.tags.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <strong style="color: #666; font-size: 13px; display: block; margin-bottom: 8px;">Tags:</strong>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${post.tags.map(tag => `
                  <span style="background: #e5e7eb; padding: 4px 10px; border-radius: 12px; font-size: 12px; color: #555;">
                    #${tag}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <!-- Stats -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
            <div style="text-align: center;">
              <div style="font-size: 24px; color: #667eea; font-weight: bold;">${post.likes?.length || 0}</div>
              <div style="font-size: 12px; color: #999;">Lượt thích</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 24px; color: #10b981; font-weight: bold;">${post.comments?.length || 0}</div>
              <div style="font-size: 12px; color: #999;">Bình luận</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 24px; color: #f59e0b; font-weight: bold;">${post.shares || 0}</div>
              <div style="font-size: 12px; color: #999;">Chia sẻ</div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
          ${post.status === 'pending' ? `
            <button class="btn btn-success" onclick="approveBlogPost('${post._id}'); closeModal('blogPostModal');">
              <i class="fas fa-check"></i> Duyệt Bài Viết
            </button>
            <button class="btn btn-danger" onclick="rejectBlogPost('${post._id}'); closeModal('blogPostModal');">
              <i class="fas fa-times"></i> Từ Chối
            </button>
          ` : ''}
          <button class="btn btn-secondary" onclick="closeModal('blogPostModal')">
            Đóng
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  setTimeout(() => {
    document.getElementById('blogPostModal').classList.add('active');
  }, 10);
}

// View user detail modal  
async function viewUserDetail(userId) {
  try {
    const response = await apiRequest(`/admin/users/${userId}`);
    
    if (response.success) {
      const user = response.data;
      if (user.role === 'tutor') {
        showTutorProfileModal(user);
      } else if (user.role === 'student') {
        showStudentProfileModal(user);
      } else {
        showBasicUserModal(user);
      }
    }
  } catch (error) {
    console.error('Load user detail error:', error);
    showNotification('Không thể tải thông tin người dùng', 'error');
  }
}

// Show student profile modal
function showStudentProfileModal(user) {
  const profile = user.profile || {};
  
  const modalHTML = `
    <div class="modal-overlay" id="studentProfileModal" onclick="closeModal('studentProfileModal')">
      <div class="modal-container" onclick="event.stopPropagation()" style="max-width: 600px;">
        <div class="modal-header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">
          <h2><i class="fas fa-user-graduate"></i> Thông Tin Học Sinh</h2>
          <button class="modal-close" onclick="closeModal('studentProfileModal')" style="color: white;">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName || user.email)}&size=100&background=10b981&color=fff`}" 
                 alt="${profile.fullName}" 
                 style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #10b981;">
            <h3 style="margin: 10px 0 5px 0; color: #333;">${profile.fullName || 'N/A'}</h3>
            <p style="color: #666; margin: 0;">${user.email}</p>
          </div>
          
          <div class="info-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div class="info-item">
              <strong><i class="fas fa-phone"></i> Điện thoại:</strong>
              <span>${profile.phone || 'Chưa cập nhật'}</span>
            </div>
            <div class="info-item">
              <strong><i class="fas fa-birthday-cake"></i> Ngày sinh:</strong>
              <span>${profile.dateOfBirth ? formatDate(profile.dateOfBirth) : 'Chưa cập nhật'}</span>
            </div>
            <div class="info-item">
              <strong><i class="fas fa-venus-mars"></i> Giới tính:</strong>
              <span>${profile.gender === 'male' ? 'Nam' : profile.gender === 'female' ? 'Nữ' : 'Chưa cập nhật'}</span>
            </div>
            <div class="info-item">
              <strong><i class="fas fa-graduation-cap"></i> Cấp học:</strong>
              <span>${profile.educationLevel || 'Chưa cập nhật'}</span>
            </div>
          </div>
          
          ${profile.address ? `
            <div class="info-item" style="margin-top: 15px;">
              <strong><i class="fas fa-map-marker-alt"></i> Địa chỉ:</strong>
              <span>${[profile.address.street, profile.address.ward, profile.address.district, profile.address.city].filter(Boolean).join(', ') || 'Chưa cập nhật'}</span>
            </div>
          ` : ''}
          
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
            <strong style="display: block; margin-bottom: 10px;">Trạng thái:</strong>
            <div>
              <span class="status-badge ${user.isEmailVerified ? 'approved' : 'pending'}">
                ${user.isEmailVerified ? '✓ Email đã xác thực' : '⏳ Email chưa xác thực'}
              </span>
              <span class="status-badge ${user.isActive ? 'active' : 'cancelled'}" style="margin-left: 10px;">
                ${user.isActive ? '● Đang hoạt động' : '○ Vô hiệu hóa'}
              </span>
            </div>
          </div>
        </div>
        
        <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
          <button class="btn btn-${user.isActive ? 'danger' : 'success'}" 
                  onclick="toggleUserStatus('${user._id}', ${user.isActive}); closeModal('studentProfileModal');">
            <i class="fas fa-${user.isActive ? 'ban' : 'check'}"></i> 
            ${user.isActive ? 'Vô Hiệu Hóa' : 'Kích Hoạt'}
          </button>
          <button class="btn btn-secondary" onclick="closeModal('studentProfileModal')">
            Đóng
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  setTimeout(() => {
    document.getElementById('studentProfileModal').classList.add('active');
  }, 10);
}

// Show basic user modal (for admins or other roles)
function showBasicUserModal(user) {
  const profile = user.profile || {};
  
  const modalHTML = `
    <div class="modal-overlay" id="basicUserModal" onclick="closeModal('basicUserModal')">
      <div class="modal-container" onclick="event.stopPropagation()" style="max-width: 500px;">
        <div class="modal-header">
          <h2><i class="fas fa-user"></i> Thông Tin Người Dùng</h2>
          <button class="modal-close" onclick="closeModal('basicUserModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&size=100&background=667eea&color=fff`}" 
                 alt="${user.email}" 
                 style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #667eea;">
            <h3 style="margin: 10px 0 5px 0; color: #333;">${profile.fullName || user.email}</h3>
            <p style="color: #666; margin: 0;">${user.role === 'admin' ? 'Quản trị viên' : user.role}</p>
          </div>
          
          <div class="info-item" style="margin-bottom: 12px;">
            <strong><i class="fas fa-envelope"></i> Email:</strong>
            <span>${user.email}</span>
          </div>
          <div class="info-item" style="margin-bottom: 12px;">
            <strong><i class="fas fa-calendar-alt"></i> Ngày tạo:</strong>
            <span>${formatDate(user.createdAt)}</span>
          </div>
          
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
            <strong style="display: block; margin-bottom: 10px;">Trạng thái:</strong>
            <div>
              <span class="status-badge ${user.isEmailVerified ? 'approved' : 'pending'}">
                ${user.isEmailVerified ? '✓ Email đã xác thực' : '⏳ Email chưa xác thực'}
              </span>
              <span class="status-badge ${user.isActive ? 'active' : 'cancelled'}" style="margin-left: 10px;">
                ${user.isActive ? '● Đang hoạt động' : '○ Vô hiệu hóa'}
              </span>
            </div>
          </div>
        </div>
        
        <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
          <button class="btn btn-secondary" onclick="closeModal('basicUserModal')">
            Đóng
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  setTimeout(() => {
    document.getElementById('basicUserModal').classList.add('active');
  }, 10);
}

// Change user chart period
document.getElementById('userChartPeriod')?.addEventListener('change', async (e) => {
  const period = e.target.value;
  loadDashboard(); // Reload entire dashboard with new period
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});

console.log('Admin dashboard initialized');
