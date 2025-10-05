// ===== TUTOR DASHBOARD JAVASCRIPT =====

let incomeChart = null;

// Load dashboard data
async function loadDashboard() {
  try {
    const response = await apiRequest('/tutor/dashboard');
    
    if (response.success) {
      updateStats(response.data);
      loadStudents();
      loadRequests();
      loadIncomeChart(response.data.income);
    }
  } catch (error) {
    console.error('Load dashboard error:', error);
    showNotification('Không thể tải dữ liệu dashboard', 'error');
  }
}

// Update stats
function updateStats(data) {
  // Total students
  const totalStudentsEl = document.getElementById('totalStudents');
  if (totalStudentsEl) {
    totalStudentsEl.textContent = data.totalStudents || 0;
  }

  // Monthly income
  const monthlyIncomeEl = document.getElementById('monthlyIncome');
  if (monthlyIncomeEl) {
    monthlyIncomeEl.textContent = formatCurrency(data.monthlyIncome || 0);
  }

  // Pending requests
  const pendingRequestsEl = document.getElementById('pendingRequests');
  if (pendingRequestsEl) {
    pendingRequestsEl.textContent = data.pendingRequests || 0;
  }

  // Average rating
  const averageRatingEl = document.getElementById('averageRating');
  if (averageRatingEl) {
    averageRatingEl.textContent = (data.averageRating || 0).toFixed(1);
  }

  // Total reviews
  const totalReviewsEl = document.getElementById('totalReviews');
  if (totalReviewsEl) {
    totalReviewsEl.textContent = data.totalReviews || 0;
  }

  // Update badges
  const studentsCountEl = document.getElementById('studentsCount');
  if (studentsCountEl) {
    studentsCountEl.textContent = data.totalStudents || 0;
  }

  const requestsCountEl = document.getElementById('requestsCount');
  if (requestsCountEl) {
    requestsCountEl.textContent = data.pendingRequests || 0;
  }
}

// Load income chart
function loadIncomeChart(incomeData) {
  const ctx = document.getElementById('incomeChart');
  if (!ctx) return;

  // Destroy previous chart if exists
  if (incomeChart) {
    incomeChart.destroy();
  }

  // Prepare data
  const labels = incomeData?.labels || ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
  const data = incomeData?.data || [0, 0, 0, 0];

  incomeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Thu nhập',
        data: data,
        borderColor: 'rgb(102, 126, 234)',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatCurrency(context.parsed.y);
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

// Load students
async function loadStudents() {
  showLoading('studentsContainer');
  
  try {
    const response = await apiRequest('/tutor/students');
    
    if (response.success) {
      const students = response.data.courses || []; // Backend returns courses
      
      if (students.length === 0) {
        showEmptyState(
          'studentsContainer',
          'fas fa-users',
          'Chưa có học sinh',
          'Bạn chưa có học sinh nào'
        );
      } else {
        renderStudents(students);
      }
    }
  } catch (error) {
    console.error('Load students error:', error);
    showErrorState('studentsContainer', 'Không thể tải danh sách học sinh');
  }
}

// Render students
function renderStudents(students) {
  const container = document.getElementById('studentsContainer');
  
  const columns = [
    {
      key: 'student',
      label: 'Học Sinh',
      render: (value, row) => {
        const studentName = row.studentDetails?.fullName || 'N/A';
        const studentAvatar = row.studentDetails?.avatar || 
          `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=667eea&color=fff`;
        
        return `
          <div class="table-user">
            <img src="${studentAvatar}" class="table-avatar" alt="${studentName}">
            <div class="table-user-info">
              <h4>${studentName}</h4>
              <p>${row.studentDetails?.email || ''}</p>
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
          <button class="action-btn primary" onclick="viewStudentDetail('${row._id}')" title="Xem chi tiết">
            <i class="fas fa-eye"></i>
          </button>
          <button class="action-btn secondary" onclick="openChat('${row.studentId}')" title="Nhắn tin">
            <i class="fas fa-comment"></i>
          </button>
        </div>
      `
    }
  ];

  container.innerHTML = createTable(students, columns);
}

// Load requests
async function loadRequests() {
  showLoading('requestsContainer');
  
  try {
    const response = await apiRequest('/tutor/requests');
    
    if (response.success) {
      const requests = response.data.requests || [];
      
      if (requests.length === 0) {
        showEmptyState(
          'requestsContainer',
          'fas fa-clipboard-list',
          'Chưa có yêu cầu mới',
          'Hiện không có yêu cầu mới phù hợp với bạn'
        );
      } else {
        renderRequests(requests);
      }
    }
  } catch (error) {
    console.error('Load requests error:', error);
    showErrorState('requestsContainer', 'Không thể tải danh sách yêu cầu');
  }
}

// Render requests
function renderRequests(requests) {
  const container = document.getElementById('requestsContainer');
  
  const columns = [
    {
      key: 'subject',
      label: 'Môn Học'
    },
    {
      key: 'level',
      label: 'Trình Độ'
    },
    {
      key: 'location',
      label: 'Địa Điểm',
      render: (value) => value || 'Online'
    },
    {
      key: 'budget',
      label: 'Ngân Sách',
      render: (value) => formatCurrency(value)
    },
    {
      key: 'createdAt',
      label: 'Thời Gian',
      render: (value) => formatRelativeTime(value)
    },
    {
      key: 'actions',
      label: 'Thao Tác',
      render: (value, row) => `
        <div class="action-buttons">
          <button class="action-btn primary" onclick="viewRequestDetail('${row._id}')" title="Xem chi tiết">
            <i class="fas fa-eye"></i>
          </button>
          <button class="action-btn success" onclick="applyToRequest('${row._id}')" title="Ứng tuyển">
            <i class="fas fa-paper-plane"></i>
            Ứng tuyển
          </button>
        </div>
      `
    }
  ];

  container.innerHTML = createTable(requests, columns);
}

// View student detail
function viewStudentDetail(courseId) {
  console.log('View student detail:', courseId);
  showNotification('Đang phát triển tính năng này', 'info');
}

// View request detail
function viewRequestDetail(requestId) {
  console.log('View request detail:', requestId);
  showNotification('Đang phát triển tính năng này', 'info');
}

// Apply to request
async function applyToRequest(requestId) {
  const message = prompt('Giới thiệu ngắn gọn về bạn (tùy chọn):');
  
  try {
    const response = await apiRequest(`/tutor/requests/${requestId}/apply`, {
      method: 'POST',
      body: JSON.stringify({
        message: message || ''
      })
    });

    if (response.success) {
      showNotification('Đã gửi ứng tuyển thành công!', 'success');
      loadRequests(); // Reload requests
    }
  } catch (error) {
    console.error('Apply request error:', error);
    showNotification(error.message || 'Không thể gửi ứng tuyển', 'error');
  }
}

// Open chat
function openChat(userId) {
  console.log('Open chat with user:', userId);
  showNotification('Đang phát triển tính năng chat', 'info');
}

// Change income chart period
document.getElementById('incomeChartPeriod')?.addEventListener('change', async (e) => {
  const period = e.target.value;
  
  try {
    const response = await apiRequest(`/tutor/income?period=${period}`);
    
    if (response.success) {
      loadIncomeChart(response.data);
    }
  } catch (error) {
    console.error('Load income chart error:', error);
    showNotification('Không thể tải biểu đồ thu nhập', 'error');
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});

console.log('Tutor dashboard initialized');
