// ===== CONTACT SUPPORT PAGE JAVASCRIPT =====

// Use global API_BASE_URL from main.js
let currentFilter = 'all';
let allTickets = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    setupFormHandlers();
    setupFilterHandlers();
    loadTickets();
});

// Load user info
function loadUserInfo() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userData.name) {
        userAvatar.src = userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=667eea&color=fff`;
    }
}

// Setup form handlers
function setupFormHandlers() {
    const form = document.getElementById('supportForm');
    const subjectInput = document.getElementById('subject');
    const descriptionInput = document.getElementById('description');
    
    // Character counters
    subjectInput.addEventListener('input', () => {
        document.getElementById('subjectCount').textContent = subjectInput.value.length;
    });
    
    descriptionInput.addEventListener('input', () => {
        document.getElementById('descriptionCount').textContent = descriptionInput.value.length;
    });
    
    // Form submission
    form.addEventListener('submit', handleFormSubmit);
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    // Validate file size
    const files = document.getElementById('attachments').files;
    if (files.length > 5) {
        showNotification('Chỉ được đính kèm tối đa 5 file', 'error');
        return;
    }
    
    for (let file of files) {
        if (file.size > 5 * 1024 * 1024) { // 5MB
            showNotification('Mỗi file không được vượt quá 5MB', 'error');
            return;
        }
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '../../index.html';
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/support/tickets`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccessModal(
                'Thành công!', 
                'Yêu cầu hỗ trợ đã được gửi thành công! Chúng tôi sẽ phản hồi trong vòng 24 giờ.',
                () => {
                    form.reset();
                    document.getElementById('subjectCount').textContent = '0';
                    document.getElementById('descriptionCount').textContent = '0';
                    loadTickets();
                }
            );
        } else {
            showSuccessModal('Lỗi', data.message || 'Gửi yêu cầu thất bại', null);
        }
    } catch (error) {
        console.error('Error:', error);
        showSuccessModal('Lỗi', 'Có lỗi xảy ra. Vui lòng thử lại sau.', null);
    }
}

// Reset form - Make globally accessible
window.resetForm = function() {
    document.getElementById('supportForm').reset();
    document.getElementById('subjectCount').textContent = '0';
    document.getElementById('descriptionCount').textContent = '0';
};

// Setup filter handlers
function setupFilterHandlers() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            filterTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Update filter
            currentFilter = tab.dataset.status;
            renderTickets();
        });
    });
}

// Load tickets from API
async function loadTickets() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '../../index.html';
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/support/tickets`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            allTickets = data.data || [];
            document.getElementById('myTicketsCount').textContent = allTickets.length;
            renderTickets();
        } else {
            showSuccessModal('Lỗi', 'Không thể tải danh sách yêu cầu', null);
        }
    } catch (error) {
        console.error('Error:', error);
        showEmptyState('Có lỗi xảy ra khi tải dữ liệu');
    }
}

// Render tickets
function renderTickets() {
    const container = document.getElementById('ticketsContainer');
    
    // Filter tickets
    let filteredTickets = allTickets;
    if (currentFilter !== 'all') {
        filteredTickets = allTickets.filter(ticket => ticket.status === currentFilter);
    }
    
    // Sort by date (newest first)
    filteredTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (filteredTickets.length === 0) {
        showEmptyState('Không có yêu cầu nào');
        return;
    }
    
    container.innerHTML = filteredTickets.map(ticket => renderTicketCard(ticket)).join('');
}

// Render ticket card
function renderTicketCard(ticket) {
    const statusMap = {
        'pending': { text: 'Đang chờ', class: 'badge-pending' },
        'in-progress': { text: 'Đang xử lý', class: 'badge-in-progress' },
        'resolved': { text: 'Đã giải quyết', class: 'badge-resolved' },
        'closed': { text: 'Đã đóng', class: 'badge-closed' }
    };
    
    const priorityMap = {
        'low': '🟢 Thấp',
        'medium': '🟡 Trung bình',
        'high': '🟠 Cao',
        'urgent': '🔴 Khẩn cấp'
    };
    
    const categoryMap = {
        'bug': '🐛 Báo lỗi',
        'feature': '💡 Tính năng',
        'payment': '💳 Thanh toán',
        'account': '👤 Tài khoản',
        'tutor': '👨‍🏫 Gia sư',
        'student': '👨‍🎓 Học sinh',
        'course': '📚 Khóa học',
        'complaint': '⚠️ Khiếu nại',
        'other': '📋 Khác'
    };
    
    const status = statusMap[ticket.status] || statusMap['pending'];
    const date = new Date(ticket.createdAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `
        <div class="ticket-card">
            <div class="ticket-header">
                <div>
                    <div class="ticket-title">${ticket.subject}</div>
                    <div class="ticket-id">#${ticket._id.slice(-8).toUpperCase()}</div>
                </div>
                <div class="ticket-badges">
                    <span class="ticket-badge ${status.class}">${status.text}</span>
                    ${ticket.priority === 'high' || ticket.priority === 'urgent' ? 
                        `<span class="ticket-badge badge-priority">${priorityMap[ticket.priority]}</span>` : ''}
                </div>
            </div>
            
            <div class="ticket-description">
                <strong>${categoryMap[ticket.category] || ticket.category}:</strong> ${ticket.description}
            </div>
            
            ${ticket.adminResponse ? `
                <div class="ticket-response" style="background: #f0fff4; padding: 12px; border-radius: 8px; margin-top: 12px;">
                    <strong style="color: #38a169;">Phản hồi từ Admin:</strong>
                    <p style="margin: 4px 0 0 0; color: #2d3748;">${ticket.adminResponse}</p>
                </div>
            ` : ''}
            
            <div class="ticket-footer">
                <div class="ticket-date">
                    <i class="fas fa-clock"></i>
                    ${date}
                </div>
                <div class="ticket-actions">
                    ${ticket.status !== 'closed' ? `
                        <button class="ticket-action-btn" onclick="viewTicket('${ticket._id}')">
                            <i class="fas fa-eye"></i> Xem chi tiết
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// View ticket details
function viewTicket(ticketId) {
    const ticket = allTickets.find(t => t._id === ticketId);
    if (!ticket) return;
    
    // Use custom modal system
    showTicketDetailModal(ticket);
}

// Show empty state
function showEmptyState(message) {
    const container = document.getElementById('ticketsContainer');
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <h3>${message}</h3>
            <p>Chưa có yêu cầu hỗ trợ nào được tạo</p>
        </div>
    `;
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}