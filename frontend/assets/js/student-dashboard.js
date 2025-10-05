// ===== STUDENT DASHBOARD JAVASCRIPT =====

// API_BASE_URL is already defined in main.js
// const API_BASE_URL = 'http://localhost:5000/api';

// Load dashboard data
async function loadDashboard() {
  try {
    showLoading('coursesContainer');
    showLoading('requestsContainer');
    showLoading('messagesContainer');
    
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/student/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const { stats, recentCourses, activeRequests, recentMessages } = data.data;
      
      // Debug log
      console.log('📊 Dashboard Data:', {
        statsCount: Object.keys(stats).length,
        coursesCount: recentCourses?.length || 0,
        requestsCount: activeRequests?.length || 0,
        messagesCount: recentMessages?.length || 0
      });
      console.log('📋 Active Requests:', activeRequests);
      
      // Update stats
      updateStats(stats);
      
      // Render sections
      renderRecentCourses(recentCourses || []);
      renderActiveRequests(activeRequests || []);
      renderRecentMessages(recentMessages || []);
      
      // Update counts
      document.getElementById('recentCoursesCount').textContent = recentCourses?.length || 0;
      document.getElementById('activeRequestsCount').textContent = activeRequests?.length || 0;
      document.getElementById('recentMessagesCount').textContent = recentMessages?.length || 0;
    }
  } catch (error) {
    console.error('Load dashboard error:', error);
    showErrorState('coursesContainer', 'Không thể tải dữ liệu');
    showErrorState('requestsContainer', 'Không thể tải dữ liệu');
    showErrorState('messagesContainer', 'Không thể tải dữ liệu');
  }
}

// Update stats
function updateStats(stats) {
  // Total Courses
  const totalCoursesEl = document.getElementById('totalCourses');
  if (totalCoursesEl) {
    totalCoursesEl.textContent = stats.totalBookings || 0;
  }
  
  // Active Courses
  const activeCoursesEl = document.getElementById('activeCourses');
  if (activeCoursesEl) {
    activeCoursesEl.textContent = stats.activeBookings || 0;
  }
  
  // Completed Courses
  const completedCoursesEl = document.getElementById('completedCourses');
  if (completedCoursesEl) {
    completedCoursesEl.textContent = stats.completedBookings || 0;
  }

  // Total Tutors
  const totalTutorsEl = document.getElementById('totalTutors');
  if (totalTutorsEl) {
    totalTutorsEl.textContent = stats.totalTutors || 0;
  }

  // Pending Requests
  const pendingRequestsEl = document.getElementById('pendingRequests');
  if (pendingRequestsEl) {
    pendingRequestsEl.textContent = stats.pendingRequests || 0;
  }

  // Update sidebar badges
  const coursesCountEl = document.getElementById('coursesCount');
  if (coursesCountEl) {
    coursesCountEl.textContent = stats.activeBookings || 0;
  }
  
  const messagesCountEl = document.getElementById('messagesCount');
  if (messagesCountEl) {
    messagesCountEl.textContent = stats.unreadMessages || 0;
  }
}

// Render recent courses
function renderRecentCourses(courses) {
  const container = document.getElementById('coursesContainer');
  
  if (!courses || courses.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 30px; text-align: center;">
        <i class="fas fa-book" style="font-size: 48px; color: #cbd5e1; margin-bottom: 15px;"></i>
        <h3 style="font-size: 16px; color: #64748b; margin-bottom: 8px;">Chưa có khóa học</h3>
        <p style="font-size: 14px; color: #94a3b8;">Hãy tìm gia sư để bắt đầu học</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="courses-list" style="display: grid; gap: 12px;">
      ${courses.map(course => {
        const avatar = course.tutorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(course.tutorName)}&background=667eea&color=fff`;
        const statusClass = course.status === 'accepted' ? 'success' : course.status === 'completed' ? 'info' : course.status === 'pending' ? 'warning' : 'secondary';
        const statusText = course.status === 'accepted' ? 'Đang học' : course.status === 'completed' ? 'Hoàn thành' : course.status === 'pending' ? 'Chờ xác nhận' : course.status === 'rejected' ? 'Đã từ chối' : 'Đã hủy';
        const rating = course.tutorRating || 0;
        const subjectText = course.subject || 'N/A';
        const levelText = course.level ? ` - ${course.level}` : '';
        const displayDate = course.startDate ? formatDate(course.startDate) : formatRelativeTime(course.createdAt);
        const amount = course.totalAmount || 0;
        
        return `
          <div class="course-card" style="display: flex; align-items: center; padding: 12px; background: #f8fafc; border-radius: 8px; gap: 12px; cursor: pointer; transition: all 0.2s;" onclick="viewCourseDetail('${course._id}')">
            <img src="${avatar}" alt="${course.tutorName}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid #e2e8f0;">
            <div style="flex: 1; min-width: 0;">
              <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 4px; color: #1e293b;">${course.tutorName}</h4>
              <p style="font-size: 13px; color: #64748b; margin-bottom: 3px;">
                <i class="fas fa-book" style="margin-right: 5px;"></i>${subjectText}${levelText}
              </p>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="status-badge ${statusClass}" style="font-size: 11px; padding: 2px 8px;">${statusText}</span>
                ${rating > 0 ? `<span style="font-size: 12px; color: #f59e0b;"><i class="fas fa-star"></i> ${rating.toFixed(1)}</span>` : ''}
              </div>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 12px; color: #64748b; margin-bottom: 4px;">${displayDate}</p>
              <p style="font-size: 13px; font-weight: 600; color: #059669;">${formatCurrency(amount)}</p>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Render Active Requests
function renderActiveRequests(requests) {
  const container = document.getElementById('requestsContainer');
  
  if (!requests || requests.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 30px; text-align: center;">
        <i class="fas fa-paper-plane" style="font-size: 48px; color: #cbd5e1; margin-bottom: 15px;"></i>
        <h3 style="font-size: 16px; color: #64748b; margin-bottom: 8px;">Chưa có yêu cầu</h3>
        <p style="font-size: 14px; color: #94a3b8; margin-bottom: 16px;">Bạn chưa đăng yêu cầu tìm gia sư nào</p>
        <a href="tutor_request.html" class="action-btn primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; text-decoration: none;">
          <i class="fas fa-plus"></i>
          Tạo Yêu Cầu Mới
        </a>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="requests-list" style="display: grid; gap: 12px;">
      ${requests.map(req => {
        const statusMap = {
          'open': { text: 'Đang mở', class: 'success', icon: 'fa-check-circle' },
          'reviewing': { text: 'Đang xem xét', class: 'warning', icon: 'fa-clock' },
          'closed': { text: 'Đã đóng', class: 'secondary', icon: 'fa-times-circle' }
        };
        const status = statusMap[req.status] || { text: req.status, class: 'secondary', icon: 'fa-info-circle' };
        const applicationsCount = req.totalApplications || 0;
        const budgetText = req.budget ? `${formatCurrency(req.budget.min || 0)} - ${formatCurrency(req.budget.max || 0)}` : 'Chưa xác định';
        const locationText = req.location ? `${req.location.district || ''}, ${req.location.city || ''}`.trim().replace(/^,\s*/, '') : 'Chưa xác định';
        
        return `
          <div class="request-card" style="padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid var(--color-${status.class});">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
              <div style="flex: 1;">
                <h4 style="font-size: 15px; font-weight: 600; color: #1e293b; margin-bottom: 6px;">
                  ${req.title || 'Không có tiêu đề'}
                </h4>
                <p style="font-size: 13px; color: #64748b; margin-bottom: 4px;">
                  <i class="fas fa-book" style="margin-right: 6px; color: #667eea;"></i>
                  <strong>${req.subject || 'N/A'}</strong> ${req.level ? `- ${req.level}` : ''}
                </p>
                <p style="font-size: 13px; color: #64748b;">
                  <i class="fas fa-map-marker-alt" style="margin-right: 6px; color: #f59e0b;"></i>
                  ${locationText}
                </p>
              </div>
              <span class="status-badge ${status.class}" style="font-size: 12px; padding: 4px 10px;">
                <i class="fas ${status.icon}" style="margin-right: 4px;"></i>${status.text}
              </span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
              <div>
                <p style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Ứng tuyển</p>
                <p style="font-size: 15px; font-weight: 600; color: #667eea;">
                  <i class="fas fa-users" style="margin-right: 4px;"></i>${applicationsCount}
                </p>
              </div>
              <div>
                <p style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Ngân sách</p>
                <p style="font-size: 13px; font-weight: 500; color: #059669;">${budgetText}</p>
              </div>
              <div>
                <p style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Ngày tạo</p>
                <p style="font-size: 13px; color: #64748b;">${formatRelativeTime(req.createdAt)}</p>
              </div>
            </div>
            
            <div style="display: flex; gap: 8px;">
              <button class="action-btn primary" onclick="viewRequestDetail('${req._id}')" style="flex: 1; padding: 8px 12px; font-size: 13px;">
                <i class="fas fa-eye"></i> Chi tiết
              </button>
              <button class="action-btn success" onclick="viewApplications('${req._id}')" style="flex: 1; padding: 8px 12px; font-size: 13px;">
                <i class="fas fa-users"></i> Ứng tuyển (${applicationsCount})
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Render Recent Messages
function renderRecentMessages(messages) {
  const container = document.getElementById('messagesContainer');
  
  if (!messages || messages.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 30px; text-align: center;">
        <i class="fas fa-inbox" style="font-size: 48px; color: #cbd5e1; margin-bottom: 15px;"></i>
        <h3 style="font-size: 16px; color: #64748b; margin-bottom: 8px;">Chưa có tin nhắn</h3>
        <p style="font-size: 14px; color: #94a3b8;">Các cuộc trò chuyện của bạn sẽ hiển thị ở đây</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="messages-list" style="display: flex; flex-direction: column; gap: 12px;">
      ${messages.map(msg => {
        const userName = msg.otherUserName || 'Unknown';
        const userAvatar = msg.otherUserAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=667eea&color=fff`;
        const unreadBadge = msg.unreadCount > 0 ? `<span class="badge" style="display: inline-block; background: #ef4444; color: white; font-size: 11px; padding: 2px 6px; border-radius: 10px; margin-left: 6px;">${msg.unreadCount}</span>` : '';
        const userRole = msg.otherUserRole === 'tutor' ? '👨‍🏫' : msg.otherUserRole === 'admin' ? '👑' : '👤';
        const messagePreview = msg.content ? (msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content) : 'Không có nội dung';
        const isUnread = msg.unreadCount > 0;
        
        return `
          <div class="message-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: ${isUnread ? '#eff6ff' : '#f9fafb'}; border-radius: 8px; cursor: pointer; transition: all 0.2s; border-left: 3px solid ${isUnread ? '#3b82f6' : 'transparent'};" 
               onclick="openChat('${msg.otherUserId}')"
               onmouseover="this.style.background='#f1f5f9'"
               onmouseout="this.style.background='${isUnread ? '#eff6ff' : '#f9fafb'}'">
            <div style="position: relative;">
              <img src="${userAvatar}" alt="${userName}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid ${isUnread ? '#3b82f6' : '#e2e8f0'};">
              <span style="position: absolute; bottom: 0; right: 0; font-size: 14px;">${userRole}</span>
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <h4 style="margin: 0; font-size: 14px; font-weight: ${isUnread ? '700' : '600'}; color: #1e293b;">${userName}</h4>
                ${unreadBadge}
              </div>
              <p style="margin: 0; font-size: 13px; color: ${isUnread ? '#475569' : '#64748b'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: ${isUnread ? '500' : '400'};">
                ${messagePreview}
              </p>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 11px; color: #94a3b8; display: block;">${formatTimeAgo(msg.createdAt)}</span>
              ${isUnread ? '<i class="fas fa-circle" style="font-size: 8px; color: #3b82f6; margin-top: 4px;"></i>' : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// View course detail
async function viewCourseDetail(courseId) {
  try {
    showNotification('Đang tải thông tin...', 'info');
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/bookings/${courseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.data) {
      showCourseDetailModal(data.data);
    } else {
      showNotification(data.message || 'Không thể xem chi tiết khóa học', 'error');
    }
  } catch (error) {
    console.error('View course detail error:', error);
    showNotification('Không thể xem chi tiết khóa học', 'error');
  }
}

// Show course detail modal
function showCourseDetailModal(booking) {
  const tutorProfile = booking.tutor?.profile;
  const tutorName = tutorProfile?.fullName || booking.tutor?.email || 'N/A';
  const tutorAvatar = tutorProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutorName)}&background=667eea&color=fff`;
  const rating = tutorProfile?.stats?.averageRating || 0;
  
  // Extract subject info - handle both old and new structure
  const subjectName = booking.subject?.name || booking.subject || 'N/A';
  const subjectLevel = booking.subject?.level || booking.level || 'N/A';
  
  const statusMap = {
    'pending': { text: 'Chờ xác nhận', class: 'warning' },
    'accepted': { text: 'Đang học', class: 'success' },
    'rejected': { text: 'Đã từ chối', class: 'danger' },
    'completed': { text: 'Hoàn thành', class: 'info' },
    'cancelled': { text: 'Đã hủy', class: 'secondary' }
  };
  const status = statusMap[booking.status] || { text: booking.status, class: 'secondary' };
  
  // Location info
  const locationType = booking.location?.type || 'N/A';
  const locationTypeText = {
    'online': 'Trực tuyến',
    'student_home': 'Tại nhà học sinh',
    'tutor_home': 'Tại nhà gia sư',
    'other': 'Địa điểm khác'
  };
  const locationAddress = booking.location?.address ? 
    `${booking.location.address}, ${booking.location.district || ''}, ${booking.location.city || ''}` : 
    locationTypeText[locationType] || 'Chưa xác định';
  
  // Calculate total amount
  const hourlyRate = booking.pricing?.hourlyRate || 0;
  const totalHours = booking.pricing?.totalHours || 0;
  const totalAmount = booking.pricing?.totalAmount || (hourlyRate * totalHours);
  
  const modalHTML = `
    <div class="modal-overlay" id="courseDetailModal" onclick="closeModal('courseDetailModal')" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">
      <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 700px; width: 90%; background: white; border-radius: 12px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
        <div class="modal-header" style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; font-size: 20px; color: #1e293b;"><i class="fas fa-book" style="margin-right: 8px; color: #667eea;"></i> Chi Tiết Khóa Học</h2>
          <button class="modal-close" onclick="closeModal('courseDetailModal')" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">&times;</button>
        </div>
        <div class="modal-body" style="padding: 24px;">
          <!-- Tutor Info -->
          <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <img src="${tutorAvatar}" alt="${tutorName}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 3px solid #667eea; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);">
            <div style="flex: 1;">
              <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 600; color: #1e293b;">${tutorName}</h3>
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                <i class="fas fa-star" style="color: #f59e0b;"></i> ${rating.toFixed(1)} 
                <span style="margin-left: 12px;"><i class="fas fa-envelope" style="color: #667eea;"></i> ${booking.tutor?.email || ''}</span>
              </p>
            </div>
            <span class="status-badge ${status.class}" style="padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 500;">${status.text}</span>
          </div>
          
          <!-- Course Details -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
            <div class="info-item">
              <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; font-weight: 500;"><i class="fas fa-book" style="margin-right: 6px;"></i> Môn Học:</label>
              <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 600;">${subjectName}</p>
            </div>
            <div class="info-item">
              <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; font-weight: 500;"><i class="fas fa-layer-group" style="margin-right: 6px;"></i> Trình Độ:</label>
              <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 600;">${subjectLevel}</p>
            </div>
            <div class="info-item">
              <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; font-weight: 500;"><i class="fas fa-calendar" style="margin-right: 6px;"></i> Ngày Bắt Đầu:</label>
              <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 600;">${booking.schedule?.startDate ? formatDate(booking.schedule.startDate) : 'Chưa xác định'}</p>
            </div>
            <div class="info-item">
              <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; font-weight: 500;"><i class="fas fa-clock" style="margin-right: 6px;"></i> Thời Gian:</label>
              <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 600;">${booking.schedule?.preferredTime || 'N/A'}</p>
            </div>
            <div class="info-item">
              <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; font-weight: 500;"><i class="fas fa-redo" style="margin-right: 6px;"></i> Tần Suất:</label>
              <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 600;">${booking.schedule?.daysPerWeek || 0} buổi/tuần × ${booking.schedule?.hoursPerSession || 0} giờ/buổi</p>
            </div>
            <div class="info-item">
              <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; font-weight: 500;"><i class="fas fa-hourglass-half" style="margin-right: 6px;"></i> Thời Lượng:</label>
              <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 600;">${booking.schedule?.duration || 0} tuần</p>
            </div>
          </div>
          
          <!-- Pricing -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 16px; border-radius: 8px; margin-bottom: 20px; color: white;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; text-align: center;">
              <div>
                <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.9;">Học phí/giờ</p>
                <p style="margin: 0; font-size: 18px; font-weight: 700;">${formatCurrency(hourlyRate)}</p>
              </div>
              <div>
                <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.9;">Tổng số giờ</p>
                <p style="margin: 0; font-size: 18px; font-weight: 700;">${totalHours} giờ</p>
              </div>
              <div>
                <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.9;">Tổng chi phí</p>
                <p style="margin: 0; font-size: 18px; font-weight: 700;">${formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>
          
          <!-- Location -->
          <div class="info-item" style="margin-bottom: ${booking.description || booking.studentNote ? '16px' : '20px'};">
            <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 6px; font-weight: 500;"><i class="fas fa-map-marker-alt" style="margin-right: 6px;"></i> Địa Điểm Học:</label>
            <p style="margin: 0; color: #1e293b; font-size: 14px;">${locationAddress}</p>
          </div>
          
          ${booking.description || booking.studentNote ? `
            <div class="info-item" style="margin-bottom: 20px;">
              <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 6px; font-weight: 500;"><i class="fas fa-sticky-note" style="margin-right: 6px;"></i> Ghi Chú:</label>
              <p style="margin: 0; color: #475569; font-size: 14px; white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 3px solid #667eea;">${booking.description || booking.studentNote}</p>
            </div>
          ` : ''}
          
          ${booking.tutorResponse?.message ? `
            <div class="info-item" style="margin-bottom: 20px;">
              <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 6px; font-weight: 500;"><i class="fas fa-comment-dots" style="margin-right: 6px;"></i> Phản Hồi Từ Gia Sư:</label>
              <p style="margin: 0; color: #475569; font-size: 14px; white-space: pre-wrap; background: #f0fdf4; padding: 12px; border-radius: 6px; border-left: 3px solid #10b981;">${booking.tutorResponse.message}</p>
            </div>
          ` : ''}
          
          <!-- Actions -->
          <div style="display: flex; gap: 12px; margin-top: 20px;">
            <button class="action-btn primary" onclick="openChat('${booking.tutor?._id}'); closeModal('courseDetailModal');" style="flex: 1; padding: 12px; border-radius: 8px; border: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
              <i class="fas fa-comment"></i> Nhắn Tin Gia Sư
            </button>
            ${booking.status === 'accepted' ? `
              <button class="action-btn secondary" onclick="viewSchedule('${booking._id}'); closeModal('courseDetailModal');" style="flex: 1; padding: 12px; border-radius: 8px; border: 2px solid #667eea; background: white; color: #667eea; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <i class="fas fa-calendar-alt"></i> Xem Lịch Học
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// View request detail
function viewRequestDetail(requestId) {
  window.location.href = `../student/tutor_request.html?id=${requestId}`;
}

// View applications
function viewApplications(requestId) {
  window.location.href = `../student/tutor_request.html?id=${requestId}&tab=applications`;
}

// Open chat
function openChat(userId) {
  if (!userId) {
    showNotification('Không tìm thấy thông tin người dùng', 'error');
    return;
  }
  window.location.href = `../student/messages.html?userId=${userId}`;
}

// View schedule
function viewSchedule(bookingId) {
  showNotification('Tính năng xem lịch học đang được phát triển', 'info');
}

// Format currency
function formatCurrency(amount) {
  if (!amount && amount !== 0) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'Chưa xác định';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Ngày không hợp lệ';
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Format relative time
function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diff = now - date;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 7) {
    return date.toLocaleDateString('vi-VN');
  } else if (days > 0) {
    return `${days} ngày trước`;
  } else if (hours > 0) {
    return `${hours} giờ trước`;
  } else if (minutes > 0) {
    return `${minutes} phút trước`;
  } else {
    return 'Vừa xong';
  }
}

// Format time ago (alias for formatRelativeTime)
function formatTimeAgo(date) {
  return formatRelativeTime(date);
}

// API Request helper with token
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  
  return data;
}

// Show notification
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    max-width: 400px;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Close modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.remove();
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});

console.log('Student dashboard initialized');
