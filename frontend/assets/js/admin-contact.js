// ===== ADMIN CONTACT INFORMATION MANAGEMENT =====

let currentPage = 1;
let totalPages = 1;
let currentFilter = 'all';
let currentSearch = '';
let submissions = [];

// Main initialization function - called by navigation system
function loadContactInfo() {
  console.log('🚀 Loading Contact Info page...');
  
  // Setup event listeners first
  setupEventListeners();
  
  // Then load data
  loadStats();
  loadSubmissions();
  
  console.log('✅ Contact Info initialized');
}

// Also support DOMContentLoaded for standalone page
document.addEventListener('DOMContentLoaded', () => {
  // Only run if we're on contact_info page directly
  if (window.location.pathname.includes('contact_info.html')) {
    loadContactInfo();
  }
});

// Setup event listeners
function setupEventListeners() {
  console.log('⚙️ Setting up event listeners...');
  
  // Filter change
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      currentPage = 1;
      loadSubmissions();
    });
  } else {
    console.warn('⚠️ statusFilter element not found');
  }

  // Search
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        loadSubmissions();
      }, 500);
    });
  } else {
    console.warn('⚠️ searchInput element not found');
  }
  
  console.log('✅ Event listeners setup complete');
}

// Load statistics
async function loadStats() {
  console.log('📊 Loading contact stats...');
  try {
    const token = TokenManager.getAccessToken();
    console.log('🔑 Token retrieved:', token ? 'Yes' : 'No');
    
    const url = `${API_BASE_URL}/contact/stats`;
    console.log('🌐 Fetching:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📡 Response status:', response.status);
    
    if (!response.ok) throw new Error('Failed to load stats');

    const result = await response.json();
    console.log('📦 Stats data:', result);
    const stats = result.data;

    document.getElementById('totalSubmissions').textContent = stats.total || 0;
    document.getElementById('pendingSubmissions').textContent = stats.pending || 0;
    document.getElementById('readSubmissions').textContent = stats.read || 0;
    document.getElementById('repliedSubmissions').textContent = stats.replied || 0;
    
    console.log('✅ Stats loaded successfully');

  } catch (error) {
    console.error('❌ Load stats error:', error);
    showNotification('Không thể tải thống kê', 'error');
  }
}

// Load submissions
async function loadSubmissions() {
  console.log('📋 Loading contact submissions...');
  try {
    const token = TokenManager.getAccessToken();
    console.log('🔑 Token retrieved:', token ? 'Yes' : 'No');
    
    const params = new URLSearchParams({
      page: currentPage,
      limit: 20,
      status: currentFilter
    });

    if (currentSearch) {
      params.append('search', currentSearch);
    }

    const url = `${API_BASE_URL}/contact/submissions?${params}`;
    console.log('🌐 Fetching:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to load submissions');
    }

    const result = await response.json();
    console.log('📦 Submissions data:', result);
    
    // Handle response structure
    submissions = result.data || [];
    totalPages = result.pagination?.totalPages || 1;
    currentPage = result.pagination?.currentPage || currentPage;

    console.log(`📝 Found ${submissions.length} submissions, page ${currentPage}/${totalPages}`);

    renderSubmissions();
    renderPagination();
    
    console.log('✅ Submissions loaded successfully');

  } catch (error) {
    console.error('❌ Load submissions error:', error);
    showNotification('Không thể tải danh sách liên hệ', 'error');
    document.getElementById('submissionsTableBody').innerHTML = `
      <tr>
        <td colspan="7" class="text-center" style="color: #ef4444;">
          <i class="fas fa-exclamation-circle"></i> Không thể tải dữ liệu
        </td>
      </tr>
    `;
  }
}

// Render submissions table
function renderSubmissions() {
  const tbody = document.getElementById('submissionsTableBody');

  if (!submissions || submissions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center" style="color: #6b7280;">
          <i class="fas fa-inbox"></i> Không có liên hệ nào
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = submissions.map(submission => {
    const date = new Date(submission.createdAt);
    const formattedDate = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const statusBadge = getStatusBadge(submission.status);
    const truncatedMessage = submission.message.length > 50 
      ? submission.message.substring(0, 50) + '...'
      : submission.message;

    return `
      <tr>
        <td>${formattedDate}</td>
        <td><strong>${submission.name}</strong></td>
        <td>${submission.email}</td>
        <td>${submission.phone}</td>
        <td>${truncatedMessage}</td>
        <td>${statusBadge}</td>
        <td class="table-actions">
          <button 
            class="btn-icon btn-icon--info" 
            onclick="viewSubmission('${submission._id}')"
            title="Xem chi tiết"
          >
            <i class="fas fa-eye"></i>
          </button>
          <button 
            class="btn-icon btn-icon--success" 
            onclick="updateStatus('${submission._id}', 'replied')"
            title="Đánh dấu đã phản hồi"
            ${submission.status === 'replied' ? 'disabled' : ''}
          >
            <i class="fas fa-check"></i>
          </button>
          <button 
            class="btn-icon btn-icon--danger" 
            onclick="deleteSubmission('${submission._id}')"
            title="Xóa"
          >
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Get status badge HTML
function getStatusBadge(status) {
  const badges = {
    'pending': '<span class="badge badge--warning"><i class="fas fa-clock"></i> Chưa xử lý</span>',
    'read': '<span class="badge badge--info"><i class="fas fa-eye"></i> Đã xem</span>',
    'replied': '<span class="badge badge--success"><i class="fas fa-check"></i> Đã phản hồi</span>',
    'archived': '<span class="badge badge--secondary"><i class="fas fa-archive"></i> Đã lưu trữ</span>'
  };
  return badges[status] || badges['pending'];
}

// View submission details
async function viewSubmission(id) {
  try {
    const token = TokenManager.getAccessToken();
    const response = await fetch(`${API_BASE_URL}/contact/submissions/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load submission');

    const result = await response.json();
    const submission = result.data;

    // Auto-mark as read if still pending
    if (submission.status === 'pending') {
      await updateStatus(id, 'read', false);
      submission.status = 'read';
    }

    renderSubmissionDetails(submission);
    document.getElementById('viewModal').classList.add('active');

  } catch (error) {
    console.error('View submission error:', error);
    showNotification('Không thể tải chi tiết', 'error');
  }
}

// Render submission details in modal
function renderSubmissionDetails(submission) {
  const date = new Date(submission.createdAt);
  const formattedDate = date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const repliedInfo = submission.repliedAt 
    ? `
      <div class="detail-row">
        <div class="detail-label"><i class="fas fa-clock"></i> Đã phản hồi lúc:</div>
        <div class="detail-value">${new Date(submission.repliedAt).toLocaleString('vi-VN')}</div>
      </div>
      ${submission.repliedBy ? `
        <div class="detail-row">
          <div class="detail-label"><i class="fas fa-user"></i> Người phản hồi:</div>
          <div class="detail-value">${submission.repliedBy.email}</div>
        </div>
      ` : ''}
    `
    : '';

  document.getElementById('viewModalBody').innerHTML = `
    <div class="submission-details">
      <div class="detail-row">
        <div class="detail-label"><i class="fas fa-calendar"></i> Thời gian gửi:</div>
        <div class="detail-value">${formattedDate}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label"><i class="fas fa-user"></i> Người gửi:</div>
        <div class="detail-value"><strong>${submission.name}</strong></div>
      </div>
      <div class="detail-row">
        <div class="detail-label"><i class="fas fa-envelope"></i> Email:</div>
        <div class="detail-value"><a href="mailto:${submission.email}">${submission.email}</a></div>
      </div>
      <div class="detail-row">
        <div class="detail-label"><i class="fas fa-phone"></i> Số điện thoại:</div>
        <div class="detail-value"><a href="tel:${submission.phone}">${submission.phone}</a></div>
      </div>
      <div class="detail-row">
        <div class="detail-label"><i class="fas fa-info-circle"></i> Trạng thái:</div>
        <div class="detail-value">${getStatusBadge(submission.status)}</div>
      </div>
      ${repliedInfo}
      <div class="detail-row">
        <div class="detail-label"><i class="fas fa-comment-dots"></i> Nội dung:</div>
        <div class="detail-value">
          <div class="message-content">${submission.message}</div>
        </div>
      </div>
      ${submission.adminNote ? `
        <div class="detail-row">
          <div class="detail-label"><i class="fas fa-sticky-note"></i> Ghi chú:</div>
          <div class="detail-value">
            <div class="admin-note">${submission.adminNote}</div>
          </div>
        </div>
      ` : ''}

      <div class="action-buttons" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end; background-color: #a0c3e7ff; padding: 15px; border-radius: 8px;">
        <button class="btn btn--success" onclick="updateStatus('${submission._id}', 'replied')">
          <i class="fas fa-check"></i> Đánh dấu đã phản hồi
        </button>
        <button class="btn btn--secondary" onclick="updateStatus('${submission._id}', 'archived')">
          <i class="fas fa-archive"></i> Lưu trữ
        </button>
      </div>
    </div>

    <style>
      .submission-details {
        padding: 20px 0;
      }
      .detail-row {
        display: grid;
        grid-template-columns: 200px 1fr;
        gap: 20px;
        padding: 15px 0;
        border-bottom: 1px solid #e5e7eb;
      }
      .detail-row:last-child {
        border-bottom: none;
      }
      .detail-label {
        font-weight: 600;
        color: #374151;
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }
      .detail-label i {
        color: #6366f1;
        margin-top: 2px;
      }
      .detail-value {
        color: #1f2937;
      }
      .message-content, .admin-note {
        background: #f9fafb;
        padding: 15px;
        border-radius: 8px;
        border-left: 3px solid #6366f1;
        white-space: pre-wrap;
        line-height: 1.6;
      }
      .admin-note {
        border-left-color: #f59e0b;
      }
    </style>
  `;
}

// Update submission status
async function updateStatus(id, status, reload = true) {
  try {
    const token = TokenManager.getAccessToken();
    const response = await fetch(`${API_BASE_URL}/contact/submissions/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) throw new Error('Failed to update status');

    if (reload) {
      showNotification('Cập nhật trạng thái thành công', 'success');
      closeViewModal();
      loadStats();
      loadSubmissions();
    }

  } catch (error) {
    console.error('Update status error:', error);
    showNotification('Không thể cập nhật trạng thái', 'error');
  }
}

// Delete submission
async function deleteSubmission(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa liên hệ này?')) return;

  try {
    const token = TokenManager.getAccessToken();
    const response = await fetch(`${API_BASE_URL}/contact/submissions/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to delete submission');

    showNotification('Đã xóa liên hệ thành công', 'success');
    loadStats();
    loadSubmissions();

  } catch (error) {
    console.error('Delete submission error:', error);
    showNotification('Không thể xóa liên hệ', 'error');
  }
}

// Close view modal
function closeViewModal() {
  document.getElementById('viewModal').classList.remove('active');
}

// Render pagination
function renderPagination() {
  const pagination = document.getElementById('pagination');
  
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = '<div class="pagination-buttons">';

  // Previous button
  html += `
    <button 
      class="pagination-btn" 
      onclick="changePage(${currentPage - 1})"
      ${currentPage === 1 ? 'disabled' : ''}
    >
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      html += `
        <button 
          class="pagination-btn ${i === currentPage ? 'active' : ''}" 
          onclick="changePage(${i})"
        >
          ${i}
        </button>
      `;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += '<span class="pagination-ellipsis">...</span>';
    }
  }

  // Next button
  html += `
    <button 
      class="pagination-btn" 
      onclick="changePage(${currentPage + 1})"
      ${currentPage === totalPages ? 'disabled' : ''}
    >
      <i class="fas fa-chevron-right"></i>
    </button>
  `;

  html += '</div>';
  pagination.innerHTML = html;
}

// Change page
function changePage(page) {
  if (page < 1 || page > totalPages || page === currentPage) return;
  currentPage = page;
  loadSubmissions();
}

// Show notification
function showNotification(message, type = 'info') {
  // You can implement your own notification system here
  // For now, using alert
  if (type === 'error') {
    alert('❌ ' + message);
  } else if (type === 'success') {
    alert('✅ ' + message);
  } else {
    alert('ℹ️ ' + message);
  }
}

// Export functions to window for admin-navigation.js
window.loadContactInfo = loadContactInfo;
window.viewSubmission = viewSubmission;
window.updateStatus = updateStatus;
window.deleteSubmission = deleteSubmission;
window.closeViewModal = closeViewModal;
window.changePage = changePage;
