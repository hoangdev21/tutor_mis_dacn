// Financial Statistics Page JavaScript
const API_URL = 'http://localhost:5000/api';
let currentPage = 1;
let currentFilters = {};
let revenueChart = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    initializePage();
});

async function initializePage() {
    try {
        showLoading();
        
        // Load initial data
        await Promise.all([
            loadStatistics('month'),
            loadRevenueChart('monthly', new Date().getFullYear()),
            loadTransactions(1)
        ]);
        
        // Setup event listeners
        setupEventListeners();
        
        hideLoading();
    } catch (error) {
        console.error('Initialize error:', error);
        showError('Không thể tải dữ liệu');
        hideLoading();
    }
}

function setupEventListeners() {
    // Period change for statistics
    document.querySelectorAll('.period-btn')?.forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadStatistics(e.target.dataset.period);
        });
    });
    
    // Chart type tabs
    document.querySelectorAll('.chart-tab')?.forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            const chartType = e.target.dataset.type;
            loadRevenueChart(chartType, new Date().getFullYear());
        });
    });
    
    // Filter button
    document.getElementById('btnApplyFilters')?.addEventListener('click', applyFilters);
    
    // Reset button
    document.getElementById('btnResetFilters')?.addEventListener('click', resetFilters);
    
    // Export button
    document.getElementById('btnExport')?.addEventListener('click', exportTransactions);
    
    // Search input
    document.getElementById('searchTransactions')?.addEventListener('input', debounce(searchTransactions, 500));
}

// Load Statistics
async function loadStatistics(period = 'month') {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/financial/statistics?period=${period}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch statistics');
        
        const result = await response.json();
        renderStatistics(result.data);
    } catch (error) {
        console.error('Load statistics error:', error);
        showError('Không thể tải thống kê');
    }
}

function renderStatistics(data) {
    const { overview, revenueByType, topUsers } = data;
    
    // Update stat cards
    document.getElementById('totalRevenue').textContent = formatCurrency(overview.totalRevenue);
    document.getElementById('totalCommission').textContent = formatCurrency(overview.totalCommission);
    document.getElementById('netRevenue').textContent = formatCurrency(overview.netRevenue);
    document.getElementById('transactionCount').textContent = overview.transactionCount;
    document.getElementById('pendingBookings').textContent = overview.pendingBookingsCount;
    document.getElementById('pendingValue').textContent = formatCurrency(overview.pendingBookingsValue);
    
    // Update growth rate
    const growthBadge = document.getElementById('growthRate');
    if (growthBadge) {
        const rate = overview.growthRate;
        growthBadge.innerHTML = `
            <i class="fas fa-arrow-${rate >= 0 ? 'up' : 'down'}"></i>
            ${Math.abs(rate).toFixed(1)}%
        `;
        growthBadge.className = `stat-badge ${rate >= 0 ? 'up' : 'down'}`;
    }
    
    // Render revenue by type chart
    if (revenueByType && revenueByType.length > 0) {
        renderRevenueByTypeChart(revenueByType);
    }
}

// Load Revenue Chart
async function loadRevenueChart(type = 'monthly', year = new Date().getFullYear()) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/financial/revenue-chart?type=${type}&year=${year}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch chart data');
        
        const result = await response.json();
        renderRevenueChart(result.data, type);
    } catch (error) {
        console.error('Load chart error:', error);
    }
}

function renderRevenueChart(data, type) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (revenueChart) {
        revenueChart.destroy();
    }
    
    let labels, datasets;
    
    if (type === 'monthly') {
        labels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
        datasets = [
            {
                label: 'Doanh thu',
                data: data.data.map(d => d.revenue),
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            },
            {
                label: 'Hoa hồng',
                data: data.data.map(d => d.commission),
                backgroundColor: 'rgba(237, 137, 54, 0.2)',
                borderColor: 'rgba(237, 137, 54, 1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }
        ];
    } else if (type === 'category') {
        labels = data.data.map(d => translateType(d.category));
        datasets = [{
            label: 'Doanh thu theo loại',
            data: data.data.map(d => d.revenue),
            backgroundColor: [
                'rgba(102, 126, 234, 0.8)',
                'rgba(72, 187, 120, 0.8)',
                'rgba(237, 137, 54, 0.8)',
                'rgba(245, 101, 101, 0.8)',
                'rgba(66, 153, 225, 0.8)'
            ],
            borderWidth: 0
        }];
    }
    
    revenueChart = new Chart(ctx, {
        type: type === 'category' ? 'doughnut' : 'line',
        data: { labels, datasets },
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
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            label += formatCurrency(context.parsed.y || context.parsed);
                            return label;
                        }
                    }
                }
            },
            scales: type !== 'category' ? {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            } : {}
        }
    });
}

// Load Transactions
async function loadTransactions(page = 1, filters = {}) {
    try {
        const token = localStorage.getItem('token');
        const queryParams = new URLSearchParams({
            page,
            limit: 20,
            ...filters
        });
        
        const response = await fetch(`${API_URL}/financial/transactions?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch transactions');
        
        const result = await response.json();
        renderTransactions(result.data.transactions);
        renderPagination(result.data.pagination);
        currentPage = page;
    } catch (error) {
        console.error('Load transactions error:', error);
        showError('Không thể tải giao dịch');
    }
}

function renderTransactions(transactions) {
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;
    
    if (transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>Không có giao dịch</h3>
                    <p>Chưa có dữ liệu giao dịch nào</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = transactions.map(tx => `
        <tr onclick="viewTransactionDetails('${tx._id}')">
            <td><span class="transaction-id">#${tx._id.slice(-8)}</span></td>
            <td>${formatDate(tx.createdAt)}</td>
            <td>
                <span class="transaction-type ${tx.type}">
                    ${getTypeIcon(tx.type)} ${translateType(tx.type)}
                </span>
            </td>
            <td>
                <div class="user-info">
                    <div class="user-avatar">${getInitials(tx.user?.name || tx.user?.email)}</div>
                    <div class="user-details">
                        <div class="user-name">${tx.user?.name || 'N/A'}</div>
                        <div class="user-email">${tx.user?.email || 'N/A'}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="transaction-amount ${tx.amount >= 0 ? 'positive' : 'negative'}">
                    ${formatCurrency(tx.amount)}
                </span>
            </td>
            <td>
                <span class="transaction-status ${tx.status}">
                    ${translateStatus(tx.status)}
                </span>
            </td>
            <td>${tx.description.substring(0, 50)}${tx.description.length > 50 ? '...' : ''}</td>
        </tr>
    `).join('');
}

function renderPagination(pagination) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    
    const { currentPage, totalPages, totalItems, itemsPerPage } = pagination;
    
    // Pagination info
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    
    container.innerHTML = `
        <div class="pagination-info">
            Hiển thị ${start} - ${end} trong tổng ${totalItems} giao dịch
        </div>
        <div class="pagination-controls">
            <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} 
                    onclick="loadTransactions(${currentPage - 1}, currentFilters)">
                <i class="fas fa-chevron-left"></i> Trước
            </button>
            ${renderPageNumbers(currentPage, totalPages)}
            <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} 
                    onclick="loadTransactions(${currentPage + 1}, currentFilters)">
                Sau <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}

function renderPageNumbers(current, total) {
    let pages = '';
    const maxPages = 5;
    let start = Math.max(1, current - Math.floor(maxPages / 2));
    let end = Math.min(total, start + maxPages - 1);
    
    if (end - start < maxPages - 1) {
        start = Math.max(1, end - maxPages + 1);
    }
    
    for (let i = start; i <= end; i++) {
        pages += `
            <button class="pagination-btn ${i === current ? 'active' : ''}" 
                    onclick="loadTransactions(${i}, currentFilters)">
                ${i}
            </button>
        `;
    }
    
    return pages;
}

// Filters
function applyFilters() {
    const filters = {
        status: document.getElementById('filterStatus')?.value || '',
        type: document.getElementById('filterType')?.value || '',
        startDate: document.getElementById('filterStartDate')?.value || '',
        endDate: document.getElementById('filterEndDate')?.value || ''
    };
    
    // Remove empty filters
    Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
    });
    
    currentFilters = filters;
    loadTransactions(1, filters);
}

function resetFilters() {
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    
    currentFilters = {};
    loadTransactions(1);
}

function searchTransactions(event) {
    const search = event.target.value.trim();
    if (search) {
        currentFilters.search = search;
    } else {
        delete currentFilters.search;
    }
    loadTransactions(1, currentFilters);
}

// Export
async function exportTransactions() {
    try {
        const token = localStorage.getItem('token');
        const queryParams = new URLSearchParams(currentFilters);
        
        window.location.href = `${API_URL}/financial/export?${queryParams}&token=${token}`;
        
        showSuccess('Đang tải xuống file...');
    } catch (error) {
        console.error('Export error:', error);
        showError('Không thể xuất dữ liệu');
    }
}

// View transaction details
async function viewTransactionDetails(transactionId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/financial/transactions/${transactionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch transaction');
        
        const result = await response.json();
        showTransactionModal(result.data);
    } catch (error) {
        console.error('View transaction error:', error);
        showError('Không thể tải chi tiết giao dịch');
    }
}

function showTransactionModal(transaction) {
    // Implementation for modal - you can create a modal to show transaction details
    console.log('Transaction details:', transaction);
    alert(`Transaction ID: ${transaction._id}\nAmount: ${formatCurrency(transaction.amount)}\nStatus: ${transaction.status}`);
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function translateType(type) {
    const types = {
        'booking': 'Đặt lịch',
        'commission': 'Hoa hồng',
        'refund': 'Hoàn tiền',
        'withdrawal': 'Rút tiền',
        'deposit': 'Nạp tiền',
        'penalty': 'Phạt',
        'bonus': 'Thưởng'
    };
    return types[type] || type;
}

function translateStatus(status) {
    const statuses = {
        'pending': 'Đang xử lý',
        'completed': 'Hoàn thành',
        'failed': 'Thất bại',
        'cancelled': 'Đã hủy',
        'refunded': 'Đã hoàn tiền'
    };
    return statuses[status] || status;
}

function getTypeIcon(type) {
    const icons = {
        'booking': '<i class="fas fa-calendar-check"></i>',
        'commission': '<i class="fas fa-percent"></i>',
        'refund': '<i class="fas fa-undo"></i>',
        'withdrawal': '<i class="fas fa-money-bill-wave"></i>',
        'deposit': '<i class="fas fa-plus-circle"></i>',
        'penalty': '<i class="fas fa-exclamation-triangle"></i>',
        'bonus': '<i class="fas fa-gift"></i>'
    };
    return icons[type] || '<i class="fas fa-dollar-sign"></i>';
}

function showLoading() {
    const container = document.getElementById('financeContainer');
    if (container) {
        container.innerHTML = '<div class="loading-overlay"><div class="loading-spinner"></div></div>';
    }
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.remove();
}

function showError(message) {
    // Simple alert for now - you can implement a better notification system
    alert(message);
}

function showSuccess(message) {
    alert(message);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}