// ===== CUSTOM MODAL UTILITIES =====
// Professional modal/popup system for TutorMis

/**
 * Show success modal
 * @param {string} title - Modal title
 * @param {string} message - Success message
 * @param {function} onClose - Callback when modal closes
 */
function showSuccessModal(title, message, onClose) {
  const modal = document.createElement('div');
  modal.className = 'custom-modal success-modal active';
  modal.innerHTML = `
    <div class="modal-content small">
      <div class="modal-body">
        <div class="success-icon">
          <i class="fas fa-check"></i>
        </div>
        <h3>${title}</h3>
        <p>${message}</p>
        <button class="modal-btn modal-btn-success" onclick="closeModal(this)">
          <i class="fas fa-check"></i>
          Đã hiểu
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModalElement(modal, onClose);
    }
  });
  
  // Auto close after 3 seconds
  setTimeout(() => {
    if (document.body.contains(modal)) {
      closeModalElement(modal, onClose);
    }
  }, 3000);
  
  return modal;
}

/**
 * Show confirm modal
 * @param {string} title - Modal title
 * @param {string} message - Confirm message
 * @param {function} onConfirm - Callback when confirmed
 * @param {function} onCancel - Callback when cancelled
 */
function showConfirmModal(title, message, onConfirm, onCancel) {
  const modal = document.createElement('div');
  modal.className = 'custom-modal confirm-modal active';
  
  const modalId = 'confirm-modal-' + Date.now();
  modal.id = modalId;
  
  modal.innerHTML = `
    <div class="modal-content small">
      <div class="modal-body">
        <div class="confirm-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>${title}</h3>
        <p>${message}</p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-secondary" onclick="closeModalById('${modalId}', 'cancel')">
          <i class="fas fa-times"></i>
          Hủy
        </button>
        <button class="modal-btn modal-btn-primary" onclick="closeModalById('${modalId}', 'confirm')">
          <i class="fas fa-check"></i>
          Xác nhận
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Store callbacks
  modal._onConfirm = onConfirm;
  modal._onCancel = onCancel;
  
  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModalElement(modal, onCancel);
    }
  });
  
  return modal;
}

/**
 * Show ticket detail modal
 * @param {object} ticket - Ticket data
 */
function showTicketDetailModal(ticket) {
  const modal = document.createElement('div');
  modal.className = 'custom-modal ticket-detail-modal active';
  
  // Format dates
  const createdDate = new Date(ticket.createdAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const updatedDate = new Date(ticket.updatedAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Status and priority badges
  const statusBadge = getStatusBadgeHTML(ticket.status);
  const priorityBadge = getPriorityBadgeHTML(ticket.priority);
  const categoryIcon = getCategoryIcon(ticket.category);
  
  // Response section
  let responseHTML = '';
  if (ticket.response && ticket.response.message) {
    const responseDate = new Date(ticket.response.respondedAt).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    responseHTML = `
      <div class="ticket-response">
        <h4>
          <i class="fas fa-reply"></i>
          Phản hồi từ Admin
        </h4>
        <p>${ticket.response.message}</p>
        <div class="response-meta">
          <i class="fas fa-clock"></i> ${responseDate}
          ${ticket.response.respondedBy ? `<span> • ${ticket.response.respondedBy}</span>` : ''}
        </div>
      </div>
    `;
  }
  
  // Attachments section
  let attachmentsHTML = '';
  if (ticket.attachments && ticket.attachments.length > 0) {
    const attachmentsList = ticket.attachments.map(att => `
      <a href="${att.url}" target="_blank" class="attachment-item">
        <i class="fas fa-paperclip"></i>
        <span>${att.filename || 'File đính kèm'}</span>
      </a>
    `).join('');
    
    attachmentsHTML = `
      <div class="ticket-attachments">
        <h4>File đính kèm</h4>
        <div class="attachments-list">
          ${attachmentsList}
        </div>
      </div>
    `;
  }
  
  modal.innerHTML = `
    <div class="modal-content large">
      <div class="modal-header">
        <h3>
          <i class="${categoryIcon}"></i>
          Chi tiết yêu cầu hỗ trợ
        </h3>
        <button class="modal-close" onclick="closeModal(this)">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <!-- Ticket Meta -->
        <div class="ticket-meta">
          <div class="ticket-meta-item">
            <div class="ticket-meta-label">Trạng thái</div>
            <div class="ticket-meta-value">${statusBadge}</div>
          </div>
          <div class="ticket-meta-item">
            <div class="ticket-meta-label">Mức độ ưu tiên</div>
            <div class="ticket-meta-value">${priorityBadge}</div>
          </div>
          <div class="ticket-meta-item">
            <div class="ticket-meta-label">Loại yêu cầu</div>
            <div class="ticket-meta-value">${getCategoryName(ticket.category)}</div>
          </div>
          <div class="ticket-meta-item">
            <div class="ticket-meta-label">Mã yêu cầu</div>
            <div class="ticket-meta-value">#${ticket._id.substring(0, 8).toUpperCase()}</div>
          </div>
        </div>
        
        <!-- Subject -->
        <div class="ticket-description">
          <h4>
            <i class="fas fa-heading"></i>&nbsp;&nbsp;
            Tiêu đề
          </h4>
          <p><strong>${ticket.subject}</strong></p>
        </div>
        
        <!-- Description -->
        <div class="ticket-description">
          <h4>
            <i class="fas fa-align-left"></i>&nbsp;&nbsp;
            Mô tả chi tiết
          </h4>
          <p>${ticket.description}</p>
        </div>
        
        ${attachmentsHTML}
        ${responseHTML}
        
        <!-- Dates -->
        <div class="ticket-meta" style="margin-top: 20px;">
          <div class="ticket-meta-item">
            <div class="ticket-meta-label">Ngày tạo</div>
            <div class="ticket-meta-value">${createdDate}</div>
          </div>
          <div class="ticket-meta-item">
            <div class="ticket-meta-label">Cập nhật lần cuối</div>
            <div class="ticket-meta-value">${updatedDate}</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-secondary" onclick="closeModal(this)">
          <i class="fas fa-times"></i>
          Đóng
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModalElement(modal);
    }
  });
  
  return modal;
}

/**
 * Close modal (called from button)
 */
function closeModal(button) {
  const modal = button.closest('.custom-modal');
  if (modal) {
    closeModalElement(modal);
  }
}

/**
 * Close modal by ID (for confirm modals)
 */
function closeModalById(modalId, action) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  if (action === 'confirm' && modal._onConfirm) {
    modal._onConfirm();
  } else if (action === 'cancel' && modal._onCancel) {
    modal._onCancel();
  }
  
  closeModalElement(modal);
}

/**
 * Close modal element with animation
 */
function closeModalElement(modal, callback) {
  modal.style.animation = 'fadeOut 0.2s ease';
  
  setTimeout(() => {
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
    if (callback) callback();
  }, 200);
}

/**
 * Helper: Get status badge HTML
 */
function getStatusBadgeHTML(status) {
  const badges = {
    'pending': '<span class="ticket-status-badge pending">Đang chờ</span>',
    'in-progress': '<span class="ticket-status-badge in-progress">Đang xử lý</span>',
    'resolved': '<span class="ticket-status-badge resolved">Đã giải quyết</span>',
    'closed': '<span class="ticket-status-badge closed">Đã đóng</span>'
  };
  return badges[status] || status;
}

/**
 * Helper: Get priority badge HTML
 */
function getPriorityBadgeHTML(priority) {
  const badges = {
    'low': '<span class="ticket-priority-badge low">🟢 Thấp</span>',
    'medium': '<span class="ticket-priority-badge medium">🟡 Trung bình</span>',
    'high': '<span class="ticket-priority-badge high">🟠 Cao</span>',
    'urgent': '<span class="ticket-priority-badge urgent">🔴 Khẩn cấp</span>'
  };
  return badges[priority] || priority;
}

/**
 * Helper: Get category icon
 */
function getCategoryIcon(category) {
  const icons = {
    'bug': 'fas fa-bug',
    'feature': 'fas fa-lightbulb',
    'payment': 'fas fa-credit-card',
    'account': 'fas fa-user',
    'student': 'fas fa-user-graduate',
    'course': 'fas fa-book',
    'complaint': 'fas fa-exclamation-triangle',
    'other': 'fas fa-question-circle'
  };
  return icons[category] || 'fas fa-ticket-alt';
}

/**
 * Helper: Get category name
 */
function getCategoryName(category) {
  const names = {
    'bug': '🐛 Báo lỗi',
    'feature': '💡 Đề xuất tính năng',
    'payment': '💳 Thanh toán',
    'account': '👤 Tài khoản',
    'student': '👨‍🎓 Học sinh',
    'course': '📚 Khóa học',
    'complaint': '⚠️ Khiếu nại',
    'other': '📋 Khác'
  };
  return names[category] || category;
}

// Add fadeOut animation to CSS dynamically
if (!document.getElementById('modal-fade-out-style')) {
  const style = document.createElement('style');
  style.id = 'modal-fade-out-style';
  style.textContent = `
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// Make functions globally accessible
window.showSuccessModal = showSuccessModal;
window.showConfirmModal = showConfirmModal;
window.showTicketDetailModal = showTicketDetailModal;
window.closeModal = closeModal;
window.closeModalById = closeModalById;
