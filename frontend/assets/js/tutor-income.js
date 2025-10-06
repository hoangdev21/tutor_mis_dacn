// ===== TUTOR INCOME PAGE JAVASCRIPT =====

const API_URL = window.API_BASE_URL || 'http://localhost:5000/api';
let incomeChart = null;
let subjectChart = null;
let levelChart = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  console.log('📊 Income page initialized');
  loadIncomeData();
  setupEventListeners();
  updateDateTime();
  setInterval(updateDateTime, 60000);
});

// Setup event listeners
function setupEventListeners() {
  const periodFilter = document.getElementById('periodFilter');
  if (periodFilter) {
    periodFilter.addEventListener('change', () => {
      loadIncomeData();
    });
  }
}

// Update date and time
function updateDateTime() {
  const dateElement = document.getElementById('currentDate');
  if (dateElement) {
    const now = new Date();
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    dateElement.textContent = now.toLocaleDateString('vi-VN', options);
  }
}

// Load income data
async function loadIncomeData() {
  try {
    showLoading();
    
    const period = document.getElementById('periodFilter')?.value || 'year';
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    
    if (!token) {
      console.error('❌ No token found, redirecting to login');
      window.location.href = '/index.html';
      return;
    }
    
    console.log('🔑 Token found, loading income data...');
    
    console.log('📡 Fetching:', `${API_URL}/tutor/income?period=${period}`);
    
    const response = await fetch(`${API_URL}/tutor/income?period=${period}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📥 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Response error:', errorText);
      throw new Error(`Failed to load income data: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Income data received:', result);
    
    if (result.success) {
      renderIncomeData(result.data);
    } else {
      showError('Không thể tải dữ liệu thu nhập');
    }
    
  } catch (error) {
    console.error('❌ Load income error:', error);
    showError('Có lỗi xảy ra khi tải dữ liệu');
  }
}

// Render income data
function renderIncomeData(data) {
  console.log('📊 Rendering income data:', data);
  
  if (!data) {
    console.error('❌ No data to render');
    showError('Không có dữ liệu thu nhập');
    return;
  }
  
  // Render stats
  if (data.summary) {
    renderStats(data.summary);
  }
  
  // Render charts
  if (data.monthlyIncome && data.monthlyIncome.length > 0) {
    renderMonthlyIncomeChart(data.monthlyIncome);
  }
  
  if (data.incomeBySubject && data.incomeBySubject.length > 0) {
    renderSubjectChart(data.incomeBySubject);
  }
  
  if (data.incomeByLevel && data.incomeByLevel.length > 0) {
    renderLevelChart(data.incomeByLevel);
  }
  
  // Render recent bookings table
  if (data.recentBookings) {
    renderRecentBookings(data.recentBookings);
  }
  
  hideLoading();
  console.log('✅ Income data rendered successfully');
}

// Render stats cards
function renderStats(summary) {
  const statsContainer = document.getElementById('statsContainer');
  if (!statsContainer) return;
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };
  
  statsContainer.innerHTML = `
    <div class="income-stat-card">
      <div class="stat-icon">
        <i class="fas fa-wallet"></i>
      </div>
      <div class="stat-info">
        <h3>Tổng Thu Nhập</h3>
        <div class="stat-value">${formatCurrency(summary.totalIncome)}</div>
        <div class="stat-subtitle">${summary.completedBookings} khóa học hoàn thành</div>
      </div>
    </div>
    
    <div class="income-stat-card green">
      <div class="stat-icon">
        <i class="fas fa-clock"></i>
      </div>
      <div class="stat-info">
        <h3>Thu Nhập Đang Chờ</h3>
        <div class="stat-value">${formatCurrency(summary.pendingIncome)}</div>
        <div class="stat-subtitle">${summary.activeBookings} khóa học đang học</div>
      </div>
    </div>
    
    <div class="income-stat-card orange">
      <div class="stat-icon">
        <i class="fas fa-calendar-alt"></i>
      </div>
      <div class="stat-info">
        <h3>Thu Nhập Tháng Này</h3>
        <div class="stat-value">${formatCurrency(summary.monthlyIncome)}</div>
        <div class="stat-subtitle">Từ ${new Date().toLocaleDateString('vi-VN', { month: 'long' })}</div>
      </div>
    </div>
    
    <div class="income-stat-card blue">
      <div class="stat-icon">
        <i class="fas fa-graduation-cap"></i>
      </div>
      <div class="stat-info">
        <h3>Tổng Giờ Dạy</h3>
        <div class="stat-value">${summary.totalHours.toFixed(1)}h</div>
        <div class="stat-subtitle">${summary.totalStudents} học sinh</div>
      </div>
    </div>
  `;
}

// Render monthly income chart
function renderMonthlyIncomeChart(monthlyData) {
  const canvas = document.getElementById('monthlyIncomeChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Destroy existing chart
  if (incomeChart) {
    incomeChart.destroy();
  }
  
  // Prepare data
  const labels = monthlyData.map(item => {
    const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    return `${monthNames[item._id.month - 1]} ${item._id.year}`;
  });
  
  const incomeData = monthlyData.map(item => item.income);
  const hoursData = monthlyData.map(item => item.hours);
  
  incomeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Thu nhập (VND)',
          data: incomeData,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: 'Giờ dạy',
          data: hoursData,
          borderColor: '#11998e',
          backgroundColor: 'rgba(17, 153, 142, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y1'
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
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                if (context.datasetIndex === 0) {
                  label += new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND'
                  }).format(context.parsed.y);
                } else {
                  label += context.parsed.y.toFixed(1) + ' giờ';
                }
              }
              return label;
            }
          }
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          ticks: {
            callback: function(value) {
              return new Intl.NumberFormat('vi-VN', {
                notation: 'compact',
                compactDisplay: 'short'
              }).format(value) + 'đ';
            }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          ticks: {
            callback: function(value) {
              return value + 'h';
            }
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

// Render subject chart
function renderSubjectChart(subjectData) {
  const canvas = document.getElementById('subjectChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Destroy existing chart
  if (subjectChart) {
    subjectChart.destroy();
  }
  
  // Prepare data
  const labels = subjectData.map(item => item._id || 'Khác');
  const data = subjectData.map(item => item.income);
  
  // Generate colors
  const colors = [
    '#667eea', '#11998e', '#f093fb', '#4facfe',
    '#ffc107', '#ff6b6b', '#4ecdc4', '#45b7d1',
    '#96ceb4', '#dfe4ea'
  ];
  
  subjectChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, data.length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed !== null) {
                label += new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND'
                }).format(context.parsed);
              }
              return label;
            }
          }
        }
      }
    }
  });
  
  // Render subject list
  renderSubjectList(subjectData);
}

// Render subject list
function renderSubjectList(subjectData) {
  const container = document.getElementById('subjectList');
  if (!container) return;
  
  const colors = [
    '#667eea', '#11998e', '#f093fb', '#4facfe',
    '#ffc107', '#ff6b6b', '#4ecdc4', '#45b7d1',
    '#96ceb4', '#dfe4ea'
  ];
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      notation: 'compact',
      compactDisplay: 'short'
    }).format(amount) + 'đ';
  };
  
  container.innerHTML = subjectData.map((item, index) => `
    <div class="subject-item">
      <div class="subject-info">
        <div class="subject-color" style="background: ${colors[index]}"></div>
        <div class="subject-name">${item._id || 'Khác'}</div>
      </div>
      <div class="subject-details">
        <div class="subject-amount">${formatCurrency(item.income)}</div>
        <div class="subject-count">${item.bookings} khóa</div>
      </div>
    </div>
  `).join('');
}

// Render level chart
function renderLevelChart(levelData) {
  const canvas = document.getElementById('levelChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Destroy existing chart
  if (levelChart) {
    levelChart.destroy();
  }
  
  // Prepare data
  const labels = levelData.map(item => item._id || 'Khác');
  const data = levelData.map(item => item.income);
  
  levelChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Thu nhập',
        data: data,
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: '#667eea',
        borderWidth: 2,
        borderRadius: 8
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
              return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
              }).format(context.parsed.y);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return new Intl.NumberFormat('vi-VN', {
                notation: 'compact',
                compactDisplay: 'short'
              }).format(value) + 'đ';
            }
          }
        }
      }
    }
  });
}

// Render recent bookings table
function renderRecentBookings(bookings) {
  const tbody = document.getElementById('bookingsTableBody');
  if (!tbody) return;
  
  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px;">
          <i class="fas fa-inbox" style="font-size: 48px; color: #ddd; margin-bottom: 12px;"></i>
          <p style="color: #999;">Chưa có khóa học nào hoàn thành</p>
        </td>
      </tr>
    `;
    return;
  }
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  tbody.innerHTML = bookings.map(booking => `
    <tr>
      <td>
        <div class="student-info">
          <img src="${booking.studentAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(booking.studentName)}" 
               alt="${booking.studentName}"
               class="student-avatar"
               onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(booking.studentName)}'">
          <div class="student-name">${booking.studentName}</div>
        </div>
      </td>
      <td>
        <span class="subject-badge">${booking.subject}</span>
      </td>
      <td>
        <span class="level-badge">${booking.level}</span>
      </td>
      <td>
        <div>${booking.totalHours.toFixed(1)} giờ</div>
        <div class="date-text">${formatCurrency(booking.hourlyRate)}/giờ</div>
      </td>
      <td>
        <div class="amount-highlight">${formatCurrency(booking.totalAmount)}</div>
      </td>
      <td>
        <div class="date-text">${formatDate(booking.completedAt)}</div>
        ${booking.rating ? `
          <div class="rating-stars">
            ${'★'.repeat(booking.rating)}${'☆'.repeat(5 - booking.rating)}
          </div>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

// Show loading state
function showLoading() {
  console.log('⏳ Showing loading state...');
  const statsContainer = document.getElementById('statsContainer');
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
      </div>
    `;
  }
}

// Hide loading state
function hideLoading() {
  // Loading will be replaced by actual content
}

// Show error message
function showError(message) {
  const container = document.getElementById('incomeContainer');
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Lỗi</h3>
        <p>${message}</p>
      </div>
    `;
  }
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}
