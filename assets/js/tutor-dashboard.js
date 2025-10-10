// ===== TUTOR DASHBOARD JAVASCRIPT =====

// API_BASE_URL is already defined in main.js
let incomeChart = null;

// Load dashboard data
async function loadDashboard() {
  try {
    showLoading('studentsContainer');
    showLoading('requestsContainer');
    showLoading('scheduleContainer');
    showLoading('notificationsContainer');
    
    const period = document.getElementById('incomeChartPeriod')?.value || 'month';
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/tutor/dashboard?period=${period}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const { stats, incomeChartData, recentStudents, newRequests, upcomingSchedule, notifications } = data.data;
      
      // Update stats
      updateStats(stats);
      
      // Render sections
      renderIncomeChart(incomeChartData, period);
      renderRecentStudents(recentStudents || []);
      renderNewRequests(newRequests || []);
      renderUpcomingSchedule(upcomingSchedule || []);
      renderNotifications(notifications || []);
      
      // Update counts
      document.getElementById('recentStudentsCount').textContent = recentStudents?.length || 0;
      document.getElementById('newRequestsCount').textContent = newRequests?.length || 0;
      document.getElementById('upcomingScheduleCount').textContent = upcomingSchedule?.length || 0;
      document.getElementById('notificationsCount').textContent = notifications?.length || 0;
    }
  } catch (error) {
    console.error('Load dashboard error:', error);
    showErrorState('studentsContainer', 'Không thể tải dữ liệu');
    showErrorState('requestsContainer', 'Không thể tải dữ liệu');
    showErrorState('scheduleContainer', 'Không thể tải dữ liệu');
    showErrorState('notificationsContainer', 'Không thể tải dữ liệu');
  }
}

// Update stats
function updateStats(stats) {
  console.log('📊 Updating stats:', stats);
  
  // Total Students
  const totalStudentsEl = document.getElementById('totalStudents');
  if (totalStudentsEl) {
    totalStudentsEl.textContent = stats.totalStudents || 0;
  }
  const activeStudentsEl = document.getElementById('activeStudents');
  if (activeStudentsEl) {
    activeStudentsEl.textContent = stats.activeStudents || 0;
  }

  // Monthly Income - hiển thị thu nhập tháng này
  const monthlyIncomeEl = document.getElementById('monthlyIncome');
  if (monthlyIncomeEl) {
    const income = stats.monthlyIncome || 0;
    monthlyIncomeEl.textContent = formatCurrency(income);
    // Add animation when value changes
    monthlyIncomeEl.style.transition = 'all 0.3s ease';
  }
  
  const predictedIncomeEl = document.getElementById('predictedIncome');
  if (predictedIncomeEl) {
    const predicted = stats.predictedIncome || 0;
    predictedIncomeEl.textContent = formatCurrency(predicted);
  }

  // Available Requests
  const availableRequestsEl = document.getElementById('availableRequests');
  if (availableRequestsEl) {
    availableRequestsEl.textContent = stats.availableRequests || 0;
  }

  // Average Rating - hiển thị đánh giá trung bình
  const averageRatingEl = document.getElementById('averageRating');
  if (averageRatingEl) {
    const rating = stats.averageRating || 0;
    averageRatingEl.textContent = rating.toFixed(1);
    
    // Add star color based on rating
    const ratingStars = '⭐'.repeat(Math.round(rating));
    averageRatingEl.title = ratingStars;
  }
  
  const totalReviewsEl = document.getElementById('totalReviews');
  if (totalReviewsEl) {
    totalReviewsEl.textContent = stats.totalReviews || 0;
  }

  // Update notification badge
  const notificationBadge = document.getElementById('notificationBadge');
  if (notificationBadge) {
    const totalNotifications = (stats.unreadMessages || 0) + (stats.availableRequests || 0);
    notificationBadge.textContent = totalNotifications;
    notificationBadge.style.display = totalNotifications > 0 ? 'flex' : 'none';
  }
  
  console.log('✅ Stats updated successfully');
}

// Render income chart with actual and predicted data
function renderIncomeChart(incomeChartData, period) {
  const ctx = document.getElementById('incomeChart');
  if (!ctx) return;

  // Destroy previous chart if exists
  if (incomeChart) {
    incomeChart.destroy();
  }

  // Prepare data
  const actualData = incomeChartData?.actual || [];
  const predictedData = incomeChartData?.predicted || [];
  
  // Merge and sort dates
  const allDates = [...new Set([...actualData.map(d => d.date), ...predictedData.map(d => d.date)])].sort();
  
  // Create data arrays
  const actualAmounts = allDates.map(date => {
    const item = actualData.find(d => d.date === date);
    return item ? item.amount : 0;
  });
  
  const predictedAmounts = allDates.map(date => {
    const item = predictedData.find(d => d.date === date);
    return item ? item.amount : 0;
  });

  incomeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: allDates.map(date => formatChartDate(date, period)),
      datasets: [
        {
          label: 'Thu nhập thực tế',
          data: actualAmounts,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Dự kiến',
          data: predictedAmounts,
          borderColor: 'rgb(249, 115, 22)',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          tension: 0.4,
          fill: true,
          borderDash: [5, 5],
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

// Format date for chart labels
function formatChartDate(dateStr, period) {
  const date = new Date(dateStr);
  if (period === 'week') {
    return date.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' });
  } else if (period === 'month') {
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
  } else {
    return date.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' });
  }
}

// Render recent students
function renderRecentStudents(students) {
  const container = document.getElementById('studentsContainer');
  
  if (!students || students.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 30px; text-align: center;">
        <i class="fas fa-users" style="font-size: 48px; color: #cbd5e1; margin-bottom: 15px;"></i>
        <h3 style="font-size: 16px; color: #64748b; margin-bottom: 8px;">Chưa có học sinh</h3>
        <p style="font-size: 14px; color: #94a3b8;">Bạn chưa có học sinh nào</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="students-list" style="display: grid; gap: 12px;">
      ${students.map(student => {
        const avatar = student.studentAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.studentName)}&background=667eea&color=fff`;
        const statusClass = student.status === 'accepted' ? 'success' : student.status === 'completed' ? 'info' : 'warning';
        const statusText = student.status === 'accepted' ? 'Đang học' : student.status === 'completed' ? 'Hoàn thành' : 'Chờ xác nhận';
        const subjectDisplay = student.level ? `${student.subject} - ${student.level}` : student.subject;
        
        return `
          <div class="student-card" style="display: flex; align-items: center; padding: 14px; background: #f8fafc; border-radius: 8px; gap: 12px; border: 1px solid #e2e8f0;">
            <img src="${avatar}" alt="${student.studentName}" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="flex: 1; min-width: 0;">
              <h4 style="font-size: 15px; font-weight: 600; margin-bottom: 4px; color: #1e293b;">${student.studentName}</h4>
              <p style="font-size: 13px; color: #64748b; margin-bottom: 4px;">
                <i class="fas fa-book" style="margin-right: 5px;"></i>${subjectDisplay}
              </p>
              <span class="status-badge ${statusClass}" style="font-size: 11px; padding: 3px 10px; border-radius: 12px;">${statusText}</span>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">
                <i class="fas fa-calendar" style="margin-right: 4px;"></i>${formatDate(student.startDate)}
              </p>
              <p style="font-size: 14px; font-weight: 700; color: #059669; margin-bottom: 6px;">${formatCurrency(student.totalAmount)}</p>
              <div style="display: flex; gap: 4px;">
                <button onclick="contactStudent('${student.studentId}')" style="padding: 4px 10px; font-size: 11px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;" title="Nhắn tin">
                  <i class="fas fa-comment"></i>
                </button>
                <button onclick="callStudent('${student.studentId}', 'video')" style="padding: 4px 10px; font-size: 11px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;" title="Gọi video">
                  <i class="fas fa-video"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Render new requests
function renderNewRequests(requests) {
  const container = document.getElementById('requestsContainer');
  
  if (!requests || requests.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 30px; text-align: center;">
        <i class="fas fa-clipboard-list" style="font-size: 48px; color: #cbd5e1; margin-bottom: 15px;"></i>
        <h3 style="font-size: 16px; color: #64748b; margin-bottom: 8px;">Chưa có yêu cầu mới</h3>
        <p style="font-size: 14px; color: #94a3b8;">Hiện không có yêu cầu mới phù hợp. Hãy kiểm tra lại sau!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="requests-list" style="display: grid; gap: 14px;">
      ${requests.map(req => {
        const avatar = req.studentAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.studentName)}&background=667eea&color=fff`;
        const methodIcon = req.teachingMethod === 'online' ? 'fa-laptop' : 'fa-home';
        const methodText = req.teachingMethod === 'online' ? 'Trực tuyến' : 'Tại nhà';
        
        return `
          <div class="request-card" style="padding: 16px; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-radius: 10px; border-left: 4px solid #f59e0b; border: 1px solid #fde68a; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.1);">
            <div style="display: flex; align-items: start; gap: 12px; margin-bottom: 12px;">
              <img src="${avatar}" alt="${req.studentName}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                  <h4 style="font-size: 15px; font-weight: 600; color: #1e293b;">${req.studentName}</h4>
                  <span style="background: #fbbf24; color: #78350f; font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600;">MỚI</span>
                </div>
                <p style="font-size: 13px; color: #475569; margin-bottom: 5px;">
                  <i class="fas fa-book" style="margin-right: 5px; color: #f59e0b;"></i><strong>${req.subject} - ${req.level}</strong>
                </p>
                <p style="font-size: 12px; color: #64748b;">
                  <i class="fas ${methodIcon}" style="margin-right: 5px; color: #3b82f6;"></i>${methodText}
                  ${req.address ? ' • ' + req.address : ''}
                </p>
              </div>
              <div style="text-align: right;">
                <p style="font-size: 16px; font-weight: 700; color: #059669; margin-bottom: 3px;">${formatCurrency(req.budget)}</p>
                <p style="font-size: 11px; color: #059669; font-weight: 500;">/giờ</p>
                <p style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${formatRelativeTime(req.createdAt)}</p>
              </div>
            </div>
            ${req.description ? `<p style="font-size: 13px; color: #475569; margin-bottom: 12px; line-height: 1.5; background: #fff; padding: 10px; border-radius: 6px;">${req.description.substring(0, 120)}${req.description.length > 120 ? '...' : ''}</p>` : ''}
            <div style="display: flex; gap: 8px;">
              <button onclick="viewRequestDetail('${req._id}')" style="flex: 1; padding: 10px 14px; font-size: 13px; background: #fff; color: #1e293b; border: 2px solid #e2e8f0; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s;">
                <i class="fas fa-eye"></i> Xem chi tiết
              </button>
              <button onclick="applyToRequest('${req._id}')" style="flex: 1; padding: 10px 14px; font-size: 13px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);">
                <i class="fas fa-paper-plane"></i> Ứng tuyển ngay
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Render upcoming schedule
function renderUpcomingSchedule(schedule) {
  const container = document.getElementById('scheduleContainer');
  
  if (!schedule || schedule.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 30px; text-align: center;">
        <i class="fas fa-calendar-alt" style="font-size: 48px; color: #cbd5e1; margin-bottom: 15px;"></i>
        <h3 style="font-size: 16px; color: #64748b; margin-bottom: 8px;">Không có lịch sắp tới</h3>
        <p style="font-size: 14px; color: #94a3b8;">Bạn chưa có lịch dạy nào sắp tới</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="schedule-list" style="display: grid; gap: 12px;">
      ${schedule.map(item => {
        const avatar = item.studentAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.studentName)}&background=667eea&color=fff`;
        const startDate = new Date(item.startDate);
        const dayName = startDate.toLocaleDateString('vi-VN', { weekday: 'short' });
        const subjectDisplay = item.level ? `${item.subject} - ${item.level}` : item.subject;
        
        // Format time display
        const preferredTime = item.preferredTime || 'Chưa xác định';
        const scheduleInfo = `${item.daysPerWeek || 0} buổi/tuần • ${item.hoursPerSession || 0}h/buổi`;
        
        return `
          <div class="schedule-card" style="display: flex; padding: 14px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #8b5cf6; gap: 12px; border: 1px solid #e2e8f0;">
            <div style="text-align: center; padding: 10px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border-radius: 10px; min-width: 65px; height: fit-content;">
              <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; opacity: 0.9;">${dayName}</div>
              <div style="font-size: 24px; font-weight: 700; margin: 4px 0;">${startDate.getDate()}</div>
              <div style="font-size: 11px; opacity: 0.9;">Th ${startDate.getMonth() + 1}</div>
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <img src="${avatar}" alt="${item.studentName}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h4 style="font-size: 15px; font-weight: 600; color: #1e293b;">${item.studentName}</h4>
              </div>
              <p style="font-size: 13px; color: #475569; margin-bottom: 5px;">
                <i class="fas fa-book" style="margin-right: 6px; color: #8b5cf6;"></i><strong>${subjectDisplay}</strong>
              </p>
              <p style="font-size: 12px; color: #64748b; margin-bottom: 4px;">
                <i class="fas fa-clock" style="margin-right: 6px; color: #f59e0b;"></i>${preferredTime}
              </p>
              <p style="font-size: 12px; color: #64748b; margin-bottom: 4px;">
                <i class="fas fa-calendar-week" style="margin-right: 6px; color: #06b6d4;"></i>${scheduleInfo}
              </p>
              <p style="font-size: 12px; color: #64748b;">
                <i class="fas fa-map-marker-alt" style="margin-right: 6px; color: #ef4444;"></i>${item.location}
              </p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; justify-content: center;">
              <button onclick="contactStudent('${item.studentId}')" style="padding: 8px 14px; font-size: 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;">
                <i class="fas fa-comment"></i> Nhắn tin
              </button>
              <button onclick="callStudent('${item.studentId}', 'video')" style="padding: 8px 14px; font-size: 12px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;">
                <i class="fas fa-video"></i> Gọi video
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Render notifications
function renderNotifications(notifications) {
  const container = document.getElementById('notificationsContainer');
  
  if (!notifications || notifications.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 30px; text-align: center;">
        <i class="fas fa-bell" style="font-size: 48px; color: #cbd5e1; margin-bottom: 15px;"></i>
        <h3 style="font-size: 16px; color: #64748b; margin-bottom: 8px;">Không có thông báo</h3>
        <p style="font-size: 14px; color: #94a3b8;">Bạn chưa có thông báo mới</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="notifications-list" style="display: grid; gap: 10px;">
      ${notifications.map(notif => {
        const avatar = notif.senderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(notif.senderName)}&background=667eea&color=fff`;
        const isUnread = !notif.isRead;
        
        return `
          <div class="notification-card" style="display: flex; align-items: start; padding: 12px; background: ${isUnread ? '#eff6ff' : '#f8fafc'}; border-radius: 8px; gap: 12px; border-left: 3px solid ${isUnread ? '#3b82f6' : 'transparent'};">
            <img src="${avatar}" alt="${notif.senderName}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <h4 style="font-size: 13px; font-weight: 600; color: #1e293b;">${notif.senderName}</h4>
                ${isUnread ? '<span style="width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; display: inline-block;"></span>' : ''}
              </div>
              <p style="font-size: 13px; color: #475569; margin-bottom: 4px; line-height: 1.5;">${notif.content}</p>
              <p style="font-size: 11px; color: #94a3b8;">${formatRelativeTime(notif.createdAt)}</p>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Helper functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return formatDate(dateStr);
}

function showLoading(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center;">
        <div class="spinner" style="border: 3px solid #f3f4f6; border-top: 3px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      </div>
    `;
  }
}

function showErrorState(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="error-state" style="padding: 30px; text-align: center;">
        <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #ef4444; margin-bottom: 15px;"></i>
        <h3 style="font-size: 16px; color: #64748b; margin-bottom: 8px;">Lỗi tải dữ liệu</h3>
        <p style="font-size: 14px; color: #94a3b8;">${message}</p>
      </div>
    `;
  }
}

// View request detail
function viewRequestDetail(requestId) {
  window.location.href = `new_request.html`;
}

// Apply to request
async function applyToRequest(requestId) {
  const message = prompt('Giới thiệu ngắn gọn về bạn (tùy chọn):');
  if (message === null) return;
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/tutor/requests/${requestId}/apply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: message || '' })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Đã gửi ứng tuyển thành công!');
      loadDashboard();
    } else {
      alert(data.message || 'Không thể gửi ứng tuyển');
    }
  } catch (error) {
    console.error('Apply request error:', error);
    alert('Không thể gửi ứng tuyển');
  }
}

// Contact student
function contactStudent(studentId) {
  window.location.href = `messages.html?userId=${studentId}`;
}

// Call student - initiate video/audio call
function callStudent(studentId, callType = 'video') {
  // Redirect to messages page with call parameter
  window.location.href = `messages.html?userId=${studentId}&autoCall=${callType}`;
}

// Change income chart period
document.getElementById('incomeChartPeriod')?.addEventListener('change', (e) => {
  loadDashboard();
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  
  // Update current date
  const currentDateEl = document.getElementById('currentDate');
  if (currentDateEl) {
    currentDateEl.textContent = new Date().toLocaleDateString('vi-VN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
});

// Add spinner animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

console.log('Tutor dashboard initialized');
