// ===== TUTOR DASHBOARD JAVASCRIPT =====

// API_BASE_URL is already defined in main.js
let incomeChart = null;

// Debug mode
const DEBUG = true;
function debug(message, data = null) {
  if (DEBUG) {
    console.log(`[DASHBOARD] ${message}`, data || '');
  }
}

// Load dashboard data
async function loadDashboard() {
  try {
    showLoading('studentsContainer');
    showLoading('requestsContainer');
    showLoading('scheduleContainer');
    showLoading('notificationsContainer');
    
    const period = document.getElementById('incomeChartPeriod')?.value || 'month';
    const token = localStorage.getItem('token');
    
    console.log('🔄 Loading dashboard...');
    console.log('📍 API URL:', API_BASE_URL);
    console.log('🔑 Token exists:', !!token);
    
    if (!token) {
      console.error('❌ No token found');
      showErrorState('studentsContainer', 'Vui lòng đăng nhập lại');
      showErrorState('requestsContainer', 'Vui lòng đăng nhập lại');
      showErrorState('scheduleContainer', 'Vui lòng đăng nhập lại');
      showErrorState('notificationsContainer', 'Vui lòng đăng nhập lại');
      return;
    }
    
    const url = `${API_BASE_URL}/tutor/dashboard?period=${period}`;
    console.log('🌐 Request URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📨 Response status:', response.status);
    
    // Check if response is ok
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('📊 Dashboard data received:', data);
    
    if (data.success && data.data) {
      const { stats, incomeChartData, recentStudents, newRequests, upcomingSchedule, notifications } = data.data;
      
      console.log('✅ Data structure valid');
      console.log('📈 Stats:', stats);
      
      // Validate stats
      if (!stats) {
        console.warn('⚠️ Stats data is missing');
      }
      
      // Update stats
      updateStats(stats || {});
      
      // Render sections
      renderIncomeChart(incomeChartData || {}, period);
      renderRecentStudents(recentStudents || []);
      renderNewRequests(newRequests || []);
      renderUpcomingSchedule(upcomingSchedule || []);
      renderNotifications(notifications || []);
      
      // Update counts
      document.getElementById('recentStudentsCount').textContent = recentStudents?.length || 0;
      document.getElementById('newRequestsCount').textContent = newRequests?.length || 0;
      document.getElementById('upcomingScheduleCount').textContent = upcomingSchedule?.length || 0;
      document.getElementById('notificationsCount').textContent = notifications?.length || 0;
      
      console.log('✅ Dashboard loaded successfully');
    } else {
      const errorMsg = data.message || 'Lỗi tải dữ liệu';
      console.error('❌ API returned error:', errorMsg);
      showErrorState('studentsContainer', errorMsg);
      showErrorState('requestsContainer', errorMsg);
      showErrorState('scheduleContainer', errorMsg);
      showErrorState('notificationsContainer', errorMsg);
    }
  } catch (error) {
    console.error('❌ Load dashboard error:', error);
    const errorMsg = error.message || 'Không thể tải dữ liệu. Vui lòng thử lại.';
    showErrorState('studentsContainer', errorMsg);
    showErrorState('requestsContainer', errorMsg);
    showErrorState('scheduleContainer', errorMsg);
    showErrorState('notificationsContainer', errorMsg);
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
    try {
      const income = Number(stats.monthlyIncome) || 0;
      monthlyIncomeEl.textContent = formatCurrency(income);
      monthlyIncomeEl.style.transition = 'all 0.3s ease';
      console.log('✅ Monthly income updated:', income);
    } catch (e) {
      console.error('Error formatting monthly income:', e);
      monthlyIncomeEl.textContent = '0đ';
    }
  }
  
  const predictedIncomeEl = document.getElementById('predictedIncome');
  if (predictedIncomeEl) {
    try {
      const predicted = Number(stats.predictedIncome) || 0;
      predictedIncomeEl.textContent = formatCurrency(predicted);
      console.log('✅ Predicted income updated:', predicted);
    } catch (e) {
      console.error('Error formatting predicted income:', e);
      predictedIncomeEl.textContent = '0đ';
    }
  }

  // Available Requests
  const availableRequestsEl = document.getElementById('availableRequests');
  if (availableRequestsEl) {
    availableRequestsEl.textContent = stats.availableRequests || 0;
  }

  // Average Rating - hiển thị đánh giá trung bình
  const averageRatingEl = document.getElementById('averageRating');
  if (averageRatingEl) {
    const rating = Number(stats.averageRating) || 0;
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

  // Handle empty or invalid data
  if (!incomeChartData || typeof incomeChartData !== 'object') {
    ctx.parentElement.innerHTML = '<div class="chart-empty-state"><p>Không có dữ liệu biểu đồ</p></div>';
    return;
  }

  // Prepare data with validation
  const actualData = Array.isArray(incomeChartData.actual) ? incomeChartData.actual : [];
  const predictedData = Array.isArray(incomeChartData.predicted) ? incomeChartData.predicted : [];
  
  // If no data at all, show empty state
  if (actualData.length === 0 && predictedData.length === 0) {
    ctx.parentElement.innerHTML = '<div class="chart-empty-state"><p>Chưa có dữ liệu thu nhập</p></div>';
    return;
  }
  
  // Merge and sort dates
  const allDates = [...new Set([...actualData.map(d => d.date), ...predictedData.map(d => d.date)])].sort();
  
  if (allDates.length === 0) {
    ctx.parentElement.innerHTML = '<div class="chart-empty-state"><p>Không có dữ liệu biểu đồ</p></div>';
    return;
  }
  
  // Create data arrays
  const actualAmounts = allDates.map(date => {
    const item = actualData.find(d => d.date === date);
    return item ? Math.max(0, Number(item.amount) || 0) : 0;
  });
  
  const predictedAmounts = allDates.map(date => {
    const item = predictedData.find(d => d.date === date);
    return item ? Math.max(0, Number(item.amount) || 0) : 0;
  });

  // Create canvas context wrapper if needed
  try {
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
            pointRadius: 5,
            pointBackgroundColor: 'rgb(34, 197, 94)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 7,
            segment: {
              borderColor: (ctx) => ctx.p0DataIndex === ctx.p1DataIndex ? 'transparent' : undefined,
            }
          },
          {
            label: 'Dự kiến',
            data: predictedAmounts,
            borderColor: 'rgb(249, 115, 22)',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            tension: 0.4,
            fill: true,
            borderDash: [5, 5],
            pointRadius: 5,
            pointBackgroundColor: 'rgb(249, 115, 22)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                size: 13,
                weight: '500'
              }
            }
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 },
            displayColors: true,
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
              },
              afterLabel: function(context) {
                try {
                  // Get chart instance safely
                  if (context.datasetIndex === 0 && context.chart && context.chart.data) {
                    const predictedDataset = context.chart.data.datasets[1];
                    if (predictedDataset && predictedDataset.data && context.dataIndex < predictedDataset.data.length) {
                      const predicted = predictedDataset.data[context.dataIndex];
                      if (predicted) {
                        const diff = context.parsed.y - predicted;
                        const sign = diff > 0 ? '+' : '';
                        return 'So với dự kiến: ' + sign + formatCurrency(diff);
                      }
                    }
                  }
                  return '';
                } catch (e) {
                  console.error('Error in tooltip afterLabel:', e);
                  return '';
                }
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
              drawBorder: false
            },
            ticks: {
              callback: function(value) {
                return formatCurrency(value);
              },
              font: { size: 12 }
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: { size: 12 }
            }
          }
        }
      }
    });
    
    console.log('✅ Income chart rendered successfully');
  } catch (error) {
    console.error('❌ Error rendering income chart:', error);
    ctx.parentElement.innerHTML = '<div class="chart-empty-state"><p>Lỗi hiển thị biểu đồ</p></div>';
  }
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
      <div class="empty-state-box">
        <i class="fas fa-users empty-state-icon"></i>
        <h3 class="empty-state-title">Chưa có học sinh</h3>
        <p class="empty-state-text">Bạn chưa có học sinh nào</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="students-list">
      ${students.map(student => {
        const avatar = student.studentAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.studentName)}&background=667eea&color=fff`;
        const statusClass = student.status === 'accepted' ? 'success' : student.status === 'completed' ? 'info' : 'warning';
        const statusText = student.status === 'accepted' ? 'Đang học' : student.status === 'completed' ? 'Hoàn thành' : 'Chờ xác nhận';
        const subjectDisplay = student.level ? `${student.subject} - ${student.level}` : student.subject;
        
        return `
          <div class="student-card">
            <img src="${avatar}" alt="${student.studentName}">
            <div class="student-card-info">
              <h4>${student.studentName}</h4>
              <p>
                <i class="fas fa-book"></i>${subjectDisplay}
              </p>
              <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <div class="student-card-amount">
              <p><i class="fas fa-calendar"></i>${formatDate(student.startDate)}</p>
              <strong>${formatCurrency(student.totalAmount)}</strong>
              <div class="student-card-actions">
                <button class="btn-sm primary" onclick="contactStudent('${student.studentId}')" title="Nhắn tin">
                  <i class="fas fa-comment"></i>
                </button>
                <button class="btn-sm success" onclick="callStudent('${student.studentId}', 'video')" title="Gọi video">
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
      <div class="empty-state-box">
        <i class="fas fa-clipboard-list empty-state-icon"></i>
        <h3 class="empty-state-title">Chưa có yêu cầu mới</h3>
        <p class="empty-state-text">Hiện không có yêu cầu mới phù hợp. Hãy kiểm tra lại sau!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="requests-list">
      ${requests.map(req => {
        const avatar = req.studentAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.studentName)}&background=667eea&color=fff`;
        const methodIcon = req.teachingMethod === 'online' ? 'fa-laptop' : 'fa-home';
        const methodText = req.teachingMethod === 'online' ? 'Trực tuyến' : 'Tại nhà';
        
        return `
          <div class="request-card">
            <div class="request-card-header">
              <div class="request-card-avatar">
                <img src="${avatar}" alt="${req.studentName}">
              </div>
              <div class="request-card-title">
                <h4>
                  ${req.studentName}
                  <span class="request-card-badge">MỚI</span>
                </h4>
                <p class="request-card-subject">
                  <i class="fas fa-book"></i><strong>${req.subject} - ${req.level}</strong>
                </p>
                <p class="request-card-method">
                  <i class="fas ${methodIcon}"></i>${methodText}
                  ${req.address ? ' • ' + req.address : ''}
                </p>
              </div>
              <div class="request-card-price">
                <strong>${formatCurrency(req.budget)}</strong>
                <small>/giờ</small>
                <time>${formatRelativeTime(req.createdAt)}</time>
              </div>
            </div>
            ${req.description ? `<p class="request-card-description">${req.description.substring(0, 120)}${req.description.length > 120 ? '...' : ''}</p>` : ''}
            <div class="request-card-actions">
              <button class="btn-outline" onclick="viewRequestDetail('${req._id}')">
                <i class="fas fa-eye"></i> Xem chi tiết
              </button>
              <button class="btn-apply" onclick="applyToRequest('${req._id}')">
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
      <div class="empty-state-box">
        <i class="fas fa-calendar-alt empty-state-icon"></i>
        <h3 class="empty-state-title">Không có lịch sắp tới</h3>
        <p class="empty-state-text">Bạn chưa có lịch dạy nào sắp tới</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="schedule-list">
      ${schedule.map(item => {
        const avatar = item.studentAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.studentName)}&background=667eea&color=fff`;
        const startDate = new Date(item.startDate);
        const dayName = startDate.toLocaleDateString('vi-VN', { weekday: 'short' });
        const subjectDisplay = item.level ? `${item.subject} - ${item.level}` : item.subject;
        const preferredTime = item.preferredTime || 'Chưa xác định';
        const scheduleInfo = `${item.daysPerWeek || 0} buổi/tuần • ${item.hoursPerSession || 0}h/buổi`;
        
        return `
          <div class="schedule-card">
            <div class="schedule-date-badge">
              <div class="day">${dayName}</div>
              <div class="date">${startDate.getDate()}</div>
              <div class="month">Th ${startDate.getMonth() + 1}</div>
            </div>
            <div class="schedule-info">
              <div class="schedule-student">
                <img src="${avatar}" alt="${item.studentName}">
                <h4>${item.studentName}</h4>
              </div>
              <p class="schedule-detail">
                <i class="fas fa-book"></i><strong>${subjectDisplay}</strong>
              </p>
              <p class="schedule-meta">
                <i class="fas fa-clock"></i>${preferredTime}
              </p>
              <p class="schedule-meta">
                <i class="fas fa-calendar-week"></i>${scheduleInfo}
              </p>
              <p class="schedule-meta">
                <i class="fas fa-map-marker-alt"></i>${item.location}
              </p>
            </div>
            <div class="schedule-actions">
              <button class="btn-sm primary" onclick="contactStudent('${item.studentId}')">
                <i class="fas fa-comment"></i> Nhắn tin
              </button>
              <button class="btn-sm success" onclick="callStudent('${item.studentId}', 'video')">
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
      <div class="empty-state-box">
        <i class="fas fa-bell empty-state-icon"></i>
        <h3 class="empty-state-title">Không có thông báo</h3>
        <p class="empty-state-text">Bạn chưa có thông báo mới</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="notifications-list">
      ${notifications.map(notif => {
        const avatar = notif.senderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(notif.senderName)}&background=667eea&color=fff`;
        const isUnread = !notif.isRead;
        
        return `
          <div class="notification-card ${isUnread ? 'unread' : ''}">
            <img src="${avatar}" alt="${notif.senderName}">
            <div class="notification-content">
              <div class="notification-header">
                <h4>${notif.senderName}</h4>
                ${isUnread ? '<span class="notification-dot"></span>' : ''}
              </div>
              <p class="notification-message">${notif.content}</p>
              <p class="notification-time">${formatRelativeTime(notif.createdAt)}</p>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Helper functions
function formatCurrency(amount) {
  try {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return '0đ';
  }
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
  if (!container) {
    console.error(`❌ Container ${containerId} not found!`);
    return;
  }
  container.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
    </div>
  `;
  debug(`Loading shown in ${containerId}`);
}

function showErrorState(containerId, message) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`❌ Container ${containerId} not found!`);
    return;
  }
  container.innerHTML = `
    <div class="error-state">
      <i class="fas fa-exclamation-circle empty-state-icon"></i>
      <h3 class="empty-state-title">Lỗi tải dữ liệu</h3>
      <p class="empty-state-text">${message}</p>
      <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Thử lại
      </button>
    </div>
  `;
  debug(`Error shown in ${containerId}: ${message}`);
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  try {
    debug('🚀 DOM Ready, initializing dashboard...');
    
    // Update current date
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
      currentDateEl.textContent = new Date().toLocaleDateString('vi-VN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      debug('✅ Current date updated');
    }
    
    // Change income chart period
    const periodSelector = document.getElementById('incomeChartPeriod');
    if (periodSelector) {
      periodSelector.addEventListener('change', (e) => {
        debug('📊 Period changed to:', e.target.value);
        loadDashboard();
      });
      debug('✅ Period selector event listener added');
    }
    
    // Load dashboard data
    debug('📍 Calling loadDashboard()...');
    loadDashboard();
    
  } catch (error) {
    console.error('❌ Initialization error:', error);
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

console.log('✅ Tutor dashboard script loaded successfully');
console.log('📍 API_BASE_URL:', typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'NOT DEFINED');