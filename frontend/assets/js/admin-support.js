// Admin Support Ticket Management
// Use global API_BASE_URL from main.js

let currentFilter = 'all';
let tickets = [];
let currentTicketId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadTickets();
    setupFilterTabs();
});

// Load all support tickets
async function loadTickets() {
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE_URL}/support/tickets/all`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load tickets');
        }

        const data = await response.json();
        tickets = data.tickets || [];
        
        // Update statistics
        updateStats(data.stats);
        
        // Render tickets based on current filter
        renderTickets(currentFilter);
        
    } catch (error) {
        console.error('Error loading tickets:', error);
        showError('Không thể tải danh sách yêu cầu hỗ trợ');
    }
}

// Update statistics cards
function updateStats(stats) {
    document.getElementById('totalTickets').textContent = stats.total || 0;
    document.getElementById('pendingTickets').textContent = stats.pending || 0;
    document.getElementById('inProgressTickets').textContent = stats.inProgress || 0;
    document.getElementById('resolvedTickets').textContent = stats.resolved || 0;
}

// Setup filter tabs
function setupFilterTabs() {
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Update active state
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Update filter
            currentFilter = this.dataset.status;
            renderTickets(currentFilter);
        });
    });
}

// Render tickets based on filter
function renderTickets(filter) {
    const container = document.getElementById('ticketsContainer');
    
    // Filter tickets
    let filteredTickets = tickets;
    if (filter !== 'all') {
        filteredTickets = tickets.filter(ticket => ticket.status === filter);
    }

    // Sort by date (newest first)
    filteredTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (filteredTickets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>Không có yêu cầu nào</h3>
                <p>Không tìm thấy yêu cầu hỗ trợ với bộ lọc này.</p>
            </div>
        `;
        return;
    }

    // Render ticket cards
    const ticketsHTML = filteredTickets.map(ticket => createTicketCard(ticket)).join('');
    container.innerHTML = `<div class="tickets-grid">${ticketsHTML}</div>`;
}

// Create ticket card HTML
function createTicketCard(ticket) {
    const priorityClass = getPriorityClass(ticket.priority);
    const statusClass = getStatusClass(ticket.status);
    const categoryIcon = getCategoryIcon(ticket.category);
    
    const userName = ticket.user ? `${ticket.user.firstName} ${ticket.user.lastName}` : 'Unknown User';
    const userRole = ticket.user ? ticket.user.role : 'unknown';
    const userEmail = ticket.user ? ticket.user.email : 'N/A';
    
    const createdDate = new Date(ticket.createdAt).toLocaleDateString('vi-VN');
    const hasResponse = ticket.adminResponse && ticket.adminResponse.trim() !== '';
    
    return `
        <div class="ticket-card ${statusClass}">
            <div class="ticket-header">
                <div class="ticket-user">
                    <div class="user-avatar">
                        ${userName.charAt(0).toUpperCase()}
                    </div>
                    <div class="user-info">
                        <h4>${userName}</h4>
                        <span class="user-role">${getRoleName(userRole)}</span>
                        <span class="user-email">${userEmail}</span>
                    </div>
                </div>
                <div class="ticket-meta">
                    <span class="ticket-priority ${priorityClass}">
                        <i class="fas fa-flag"></i> ${getPriorityName(ticket.priority)}
                    </span>
                    <span class="ticket-status ${statusClass}">
                        <i class="fas fa-circle"></i> ${getStatusName(ticket.status)}
                    </span>
                </div>
            </div>
            
            <div class="ticket-body">
                <div class="ticket-category">
                    <i class="${categoryIcon}"></i> ${getCategoryName(ticket.category)}
                </div>
                <h3 class="ticket-subject">${ticket.subject}</h3>
                <p class="ticket-description">${truncateText(ticket.description, 150)}</p>
                
                ${ticket.attachments && ticket.attachments.length > 0 ? `
                    <div class="ticket-attachments">
                        <i class="fas fa-paperclip"></i>
                        <span>${ticket.attachments.length} tệp đính kèm</span>
                    </div>
                ` : ''}
                
                ${hasResponse ? `
                    <div class="ticket-response-indicator">
                        <i class="fas fa-reply"></i>
                        <span>Đã phản hồi</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="ticket-footer">
                <span class="ticket-date">
                    <i class="fas fa-clock"></i> ${createdDate}
                </span>
                <div class="ticket-actions">
                    <button class="btn-respond" onclick="viewTicketDetail('${ticket._id}')" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>&nbsp;
                    <button class="btn-respond" onclick="openResponseModal('${ticket._id}')" title="Phản hồi">
                        <i class="fas fa-reply"></i>Phản hồi
                    </button>
                </div>
            </div>
        </div>
    `;
}

// View ticket detail
window.viewTicketDetail = function(ticketId) {
    const ticket = tickets.find(t => t._id === ticketId);
    if (!ticket) return;
    
    // Add user info to ticket object for modal
    showTicketDetailModal(ticket);
}

// Open response modal
window.openResponseModal = function(ticketId) {
    const ticket = tickets.find(t => t._id === ticketId);
    if (!ticket) return;
    
    currentTicketId = ticketId;
    
    // Populate ticket details
    const userName = ticket.user ? `${ticket.user.firstName} ${ticket.user.lastName}` : 'Unknown User';
    const userEmail = ticket.user ? ticket.user.email : 'N/A';
    const createdDate = new Date(ticket.createdAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    document.getElementById('ticketDetails').innerHTML = `
        <div class="ticket-detail-info">
            <div class="detail-row">
                <strong>Người Gửi:</strong> ${userName} (${userEmail})
            </div>
            <div class="detail-row">
                <strong>Danh mục:</strong> ${getCategoryName(ticket.category)}
            </div>
            <div class="detail-row">
                <strong>Ưu tiên:</strong> <span class="${getPriorityClass(ticket.priority)}">${getPriorityName(ticket.priority)}</span>
            </div>
            <div class="detail-row">
                <strong>Ngày gửi:</strong> ${createdDate}
            </div>
            <div class="detail-row">
                <strong>Chủ đề:</strong> ${ticket.subject}
            </div>
            <div class="detail-row">
                <strong>Mô tả:</strong>
                <p class="ticket-description-full">${ticket.description}</p>
            </div>
            ${ticket.attachments && ticket.attachments.length > 0 ? `
                <div class="detail-row">
                    <strong>Tệp đính kèm:</strong>
                    <div class="attachments-list">
                        ${ticket.attachments.map(att => `
                            <a href="${att}" target="_blank" class="attachment-link">
                                <i class="fas fa-file"></i> Xem tệp
                            </a>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    // Set form values
    document.getElementById('ticketStatus').value = ticket.status;
    document.getElementById('adminResponse').value = ticket.adminResponse || '';
    
    // Show modal
    document.getElementById('responseModal').classList.add('active');
    document.body.style.overflow = 'hidden';
};

// Close response modal
window.closeResponseModal = function() {
    document.getElementById('responseModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    currentTicketId = null;
    document.getElementById('responseForm').reset();
};

// Handle response form submission
document.getElementById('responseForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentTicketId) return;
    
    const status = document.getElementById('ticketStatus').value;
    const adminResponse = document.getElementById('adminResponse').value;
    
    // Show confirmation modal instead of direct submission
    showConfirmModal(
        'Xác nhận gửi phản hồi',
        'Bạn có chắc chắn muốn gửi phản hồi này? Người dùng sẽ nhận được thông báo qua email.',
        async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/support/tickets/${currentTicketId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        status,
                        adminResponse
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to update ticket');
                }

                // Show success message
                showSuccessModal('Thành công!', 'Đã gửi phản hồi thành công!', () => {
                    closeResponseModal();
                    loadTickets();
                });
                
            } catch (error) {
                console.error('Error updating ticket:', error);
                showSuccessModal('Lỗi', 'Không thể gửi phản hồi. Vui lòng thử lại.', null);
            }
        },
        null
    );
});

// Helper functions
function getPriorityClass(priority) {
    const classes = {
        low: 'priority-low',
        medium: 'priority-medium',
        high: 'priority-high',
        urgent: 'priority-urgent'
    };
    return classes[priority] || '';
}

function getStatusClass(status) {
    const classes = {
        pending: 'status-pending',
        'in-progress': 'status-in-progress',
        resolved: 'status-resolved',
        closed: 'status-closed'
    };
    return classes[status] || '';
}

function getCategoryIcon(category) {
    const icons = {
        bug: 'fas fa-bug',
        feature: 'fas fa-lightbulb',
        payment: 'fas fa-credit-card',
        account: 'fas fa-user',
        course: 'fas fa-book',
        booking: 'fas fa-calendar-check',
        other: 'fas fa-question-circle'
    };
    return icons[category] || 'fas fa-question-circle';
}

function getPriorityName(priority) {
    const names = {
        low: 'Thấp',
        medium: 'Trung bình',
        high: 'Cao',
        urgent: 'Khẩn cấp'
    };
    return names[priority] || priority;
}

function getStatusName(status) {
    const names = {
        pending: 'Đang chờ',
        'in-progress': 'Đang xử lý',
        resolved: 'Đã giải quyết',
        closed: 'Đã đóng'
    };
    return names[status] || status;
}

function getCategoryName(category) {
    const names = {
        bug: 'Lỗi kỹ thuật',
        feature: 'Yêu cầu tính năng',
        payment: 'Vấn đề thanh toán',
        account: 'Tài khoản',
        course: 'Khóa học',
        booking: 'Đặt lịch',
        other: 'Khác'
    };
    return names[category] || category;
}

function getRoleName(role) {
    const names = {
        student: 'Học viên',
        tutor: 'Gia sư',
        admin: 'Quản trị viên'
    };
    return names[role] || role;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function showLoading() {
    document.getElementById('ticketsContainer').innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
        </div>
    `;
}

function showError(message) {
    // You can implement a toast notification system here
    alert(message);
}

function showSuccess(message) {
    // You can implement a toast notification system here
    alert(message);
}
