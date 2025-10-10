// Activity Logs Page JavaScript
const API_URL = 'http://localhost:5000/api';
let currentLogsPage = 1;
let currentLogsFilters = {};
let autoRefreshInterval = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    initializeLogsPage();
});

async function initializeLogsPage() {
    try {
        showLogsLoading();
        
        // Load initial data
        await Promise.all([
            loadLogsStatistics('week'),
            loadLogs(1)
        ]);
        
        // Setup event listeners
        setupLogsEventListeners();
        
        // Start auto-refresh every 30 seconds
        startAutoRefresh();
        
        hideLogsLoading();
    } catch (error) {
        console.error('Initialize logs error:', error);
        showLogsError('Không thể tải logs');
        hideLogsLoading();
    }
}

function setupLogsEventListeners() {
    // Search input
    const searchInput = document.getElementById('logsSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchLogs, 500));
    }
    
    // Filter buttons
    document.getElementById('btnSearchLogs')?.addEventListener('click', applyLogsFilters);
    document.getElementById('btnClearLogs')?.addEventListener('click', resetLogsFilters);
    document.getElementById('btnExportLogs')?.addEventListener('click', exportLogs);
    
    // Refresh and cleanup buttons
    document.getElementById('btnRefreshLogs')?.addEventListener('click', () => loadLogs(currentLogsPage));
    document.getElementById('btnCleanupLogs')?.addEventListener('click', cleanupOldLogs);
}

// Load Logs Statistics
async function loadLogsStatistics(period = 'week') {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/logs/statistics?period=${period}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch logs statistics');
        
        const result = await response.json();
        renderLogsStatistics(result.data);
    } catch (error) {
        console.error('Load logs statistics error:', error);
    }
}

function renderLogsStatistics(data) {
    const { overview, activityByType, activityBySeverity } = data;
    
    // Update stat cards
    document.getElementById('totalActivities').textContent = overview.totalActivities || 0;
    document.getElementById('unresolvedErrors').textContent = overview.unresolvedErrors || 0;
    
    // Calculate severity counts
    const severityCounts = {
        info: 0,
        warning: 0,
        error: 0
    };
    
    activityBySeverity.forEach(item => {
        severityCounts[item._id] = item.count;
    });
    
    document.getElementById('infoCount').textContent = severityCounts.info;
    document.getElementById('warningCount').textContent = severityCounts.warning;
    document.getElementById('errorCount').textContent = severityCounts.error;
}

// Load Logs
async function loadLogs(page = 1, filters = {}) {
    try {
        const token = localStorage.getItem('token');
        const queryParams = new URLSearchParams({
            page,
            limit: 50,
            ...filters
        });
        
        const response = await fetch(`${API_URL}/logs?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch logs');
        
        const result = await response.json();
        renderLogs(result.data.logs);
        renderLogsPagination(result.data.pagination);
        currentLogsPage = page;
    } catch (error) {
        console.error('Load logs error:', error);
        showLogsError('Không thể tải logs');
    }
}

function renderLogs(logs) {
    const container = document.getElementById('logsTimeline');
    if (!container) return;
    
    if (logs.length === 0) {
        container.innerHTML = `
            <div class="logs-empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>Không có logs</h3>
                <p>Chưa có hoạt động nào được ghi lại</p>
            </div>
        `;
        return;
    }
    
    const logsHTML = logs.map(log => `
        <div class="timeline-item" data-log-id="${log._id}">
            <div class="timeline-marker ${log.severity}">
                ${getSeverityIcon(log.severity)}
            </div>
            <div class="timeline-content">
                <div class="log-header">
                    <div class="log-title">
                        <span class="log-type-badge ${log.type}">${translateLogType(log.type)}</span>
                        <span class="log-action">${log.action}</span>
                    </div>
                    <span class="log-time" title="${formatFullDate(log.createdAt)}">
                        <i class="fas fa-clock"></i> ${log.timeAgo || formatTimeAgo(log.createdAt)}
                    </span>
                </div>
                
                <div class="log-description">${log.description}</div>
                
                <div class="log-meta">
                    ${log.user ? `
                        <div class="log-meta-item">
                            <i class="fas fa-user"></i>
                            <strong>${log.user.name || log.user.email}</strong>
                            (${log.userRole})
                        </div>
                    ` : '<div class="log-meta-item"><i class="fas fa-robot"></i><strong>System</strong></div>'}
                    
                    <div class="log-meta-item">
                        <i class="fas fa-tag"></i>
                        <span class="log-status-badge ${log.status}">${translateLogStatus(log.status)}</span>
                    </div>
                    
                    ${log.request?.ip ? `
                        <div class="log-meta-item">
                            <i class="fas fa-globe"></i>
                            ${log.request.ip}
                        </div>
                    ` : ''}
                    
                    ${log.request?.device ? `
                        <div class="log-meta-item">
                            <i class="fas fa-mobile-alt"></i>
                            ${log.request.device} - ${log.request.browser}
                        </div>
                    ` : ''}
                </div>
                
                ${(log.severity === 'error' || log.severity === 'critical') && !log.isResolved ? `
                    <div class="log-actions">
                        <button class="btn-log-action resolve" onclick="resolveLog('${log._id}')">
                            <i class="fas fa-check"></i> Đánh dấu đã giải quyết
                        </button>
                        <button class="btn-log-action" onclick="viewLogDetails('${log._id}')">
                            <i class="fas fa-eye"></i> Xem chi tiết
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = `<div class="timeline-list">${logsHTML}</div>`;
}

function renderLogsPagination(pagination) {
    const container = document.getElementById('logsPaginationContainer');
    if (!container) return;
    
    const { currentPage, totalPages, totalItems, itemsPerPage } = pagination;
    
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    
    container.innerHTML = `
        <div class="logs-pagination-info">
            Hiển thị ${start} - ${end} trong tổng ${totalItems} logs
        </div>
        <div class="logs-pagination-controls">
            <button class="logs-page-btn" ${currentPage === 1 ? 'disabled' : ''} 
                    onclick="loadLogs(${currentPage - 1}, currentLogsFilters)">
                <i class="fas fa-chevron-left"></i> Trước
            </button>
            ${renderLogsPageNumbers(currentPage, totalPages)}
            <button class="logs-page-btn" ${currentPage === totalPages ? 'disabled' : ''} 
                    onclick="loadLogs(${currentPage + 1}, currentLogsFilters)">
                Sau <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}

function renderLogsPageNumbers(current, total) {
    let pages = '';
    const maxPages = 5;
    let start = Math.max(1, current - Math.floor(maxPages / 2));
    let end = Math.min(total, start + maxPages - 1);
    
    if (end - start < maxPages - 1) {
        start = Math.max(1, end - maxPages + 1);
    }
    
    for (let i = start; i <= end; i++) {
        pages += `
            <button class="logs-page-btn ${i === current ? 'active' : ''}" 
                    onclick="loadLogs(${i}, currentLogsFilters)">
                ${i}
            </button>
        `;
    }
    
    return pages;
}

// Filters
function applyLogsFilters() {
    const filters = {
        type: document.getElementById('filterLogType')?.value || '',
        severity: document.getElementById('filterSeverity')?.value || '',
        status: document.getElementById('filterLogStatus')?.value || '',
        startDate: document.getElementById('filterLogStartDate')?.value || '',
        endDate: document.getElementById('filterLogEndDate')?.value || ''
    };
    
    // Remove empty filters
    Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
    });
    
    currentLogsFilters = filters;
    loadLogs(1, filters);
}

function resetLogsFilters() {
    document.getElementById('filterLogType').value = '';
    document.getElementById('filterSeverity').value = '';
    document.getElementById('filterLogStatus').value = '';
    document.getElementById('filterLogStartDate').value = '';
    document.getElementById('filterLogEndDate').value = '';
    
    currentLogsFilters = {};
    loadLogs(1);
}

function searchLogs(event) {
    const search = event.target.value.trim();
    if (search) {
        currentLogsFilters.search = search;
    } else {
        delete currentLogsFilters.search;
    }
    loadLogs(1, currentLogsFilters);
}

// Resolve Log
async function resolveLog(logId) {
    const note = prompt('Nhập ghi chú giải quyết (tùy chọn):');
    if (note === null) return; // User cancelled
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/logs/${logId}/resolve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ note })
        });
        
        if (!response.ok) throw new Error('Failed to resolve log');
        
        showLogsSuccess('Đã đánh dấu giải quyết');
        loadLogs(currentLogsPage, currentLogsFilters);
    } catch (error) {
        console.error('Resolve log error:', error);
        showLogsError('Không thể đánh dấu giải quyết');
    }
}

// View Log Details
async function viewLogDetails(logId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/logs/${logId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch log details');
        
        const result = await response.json();
        showLogDetailsModal(result.data);
    } catch (error) {
        console.error('View log details error:', error);
        showLogsError('Không thể tải chi tiết log');
    }
}

function showLogDetailsModal(log) {
    // Simple alert for now - implement proper modal later
    const details = `
        Log ID: ${log._id}
        Type: ${log.type}
        Action: ${log.action}
        User: ${log.user?.email || 'System'}
        Time: ${formatFullDate(log.createdAt)}
        Description: ${log.description}
        Status: ${log.status}
        Severity: ${log.severity}
        IP: ${log.request?.ip || 'N/A'}
    `;
    alert(details);
}

// Cleanup Old Logs
async function cleanupOldLogs() {
    if (!confirm('Bạn có chắc muốn xóa các logs cũ (> 6 tháng)? Hành động này không thể hoàn tác.')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/logs/cleanup`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to cleanup logs');
        
        const result = await response.json();
        showLogsSuccess(`Đã xóa ${result.data.deletedCount} logs cũ`);
        loadLogs(1, currentLogsFilters);
    } catch (error) {
        console.error('Cleanup error:', error);
        showLogsError('Không thể xóa logs cũ');
    }
}

// Export Logs
async function exportLogs() {
    try {
        const token = localStorage.getItem('token');
        const queryParams = new URLSearchParams(currentLogsFilters);
        
        window.location.href = `${API_URL}/logs/export?${queryParams}&token=${token}`;
        
        showLogsSuccess('Đang tải xuống file...');
    } catch (error) {
        console.error('Export logs error:', error);
        showLogsError('Không thể xuất logs');
    }
}

// Auto Refresh
function startAutoRefresh() {
    // Refresh logs every 30 seconds
    autoRefreshInterval = setInterval(() => {
        loadLogs(currentLogsPage, currentLogsFilters);
        loadLogsStatistics('week');
    }, 30000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Utility Functions
function translateLogType(type) {
    const types = {
        'auth': 'Xác thực',
        'user': 'Người dùng',
        'profile': 'Hồ sơ',
        'booking': 'Đặt lịch',
        'transaction': 'Giao dịch',
        'blog': 'Blog',
        'course': 'Khóa học',
        'message': 'Tin nhắn',
        'support': 'Hỗ trợ',
        'admin': 'Quản trị',
        'system': 'Hệ thống',
        'security': 'Bảo mật',
        'error': 'Lỗi'
    };
    return types[type] || type;
}

function translateLogStatus(status) {
    const statuses = {
        'success': 'Thành công',
        'failed': 'Thất bại',
        'pending': 'Đang xử lý'
    };
    return statuses[status] || status;
}

function getSeverityIcon(severity) {
    const icons = {
        'info': '<i class="fas fa-info"></i>',
        'warning': '<i class="fas fa-exclamation"></i>',
        'error': '<i class="fas fa-times"></i>',
        'critical': '<i class="fas fa-skull"></i>'
    };
    return icons[severity] || '<i class="fas fa-circle"></i>';
}

function formatTimeAgo(dateString) {
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' năm trước';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' tháng trước';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' ngày trước';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' giờ trước';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' phút trước';
    
    return 'Vừa xong';
}

function formatFullDate(dateString) {
    return new Date(dateString).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function showLogsLoading() {
    const container = document.getElementById('logsTimeline');
    if (container) {
        container.innerHTML = '<div class="logs-loading"><div class="logs-spinner"></div></div>';
    }
}

function hideLogsLoading() {
    const loading = document.querySelector('.logs-loading');
    if (loading) loading.remove();
}

function showLogsError(message) {
    alert(message);
}

function showLogsSuccess(message) {
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});
