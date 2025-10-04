// ===== SETTINGS PAGE JAVASCRIPT =====

const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../../index.html';
        return;
    }
    
    // Get user data
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    currentUser = userData;
    
    // Render settings
    renderSettings();
});

// Render settings
function renderSettings() {
    const container = document.getElementById('settingsContainer');
    
    container.innerHTML = `
        <div class="settings-tabs">
            <button class="tab-btn active" data-tab="account">
                <i class="fas fa-user"></i>
                Tài Khoản
            </button>
            <button class="tab-btn" data-tab="security">
                <i class="fas fa-lock"></i>
                Bảo Mật
            </button>
            <button class="tab-btn" data-tab="notifications">
                <i class="fas fa-bell"></i>
                Thông Báo
            </button>
            <button class="tab-btn" data-tab="privacy">
                <i class="fas fa-shield-alt"></i>
                Quyền Riêng Tư
            </button>
        </div>
        
        <div class="settings-content">
            <div class="tab-content active" id="account-tab">
                ${renderAccountSettings()}
            </div>
            
            <div class="tab-content" id="security-tab">
                ${renderSecuritySettings()}
            </div>
            
            <div class="tab-content" id="notifications-tab">
                ${renderNotificationSettings()}
            </div>
            
            <div class="tab-content" id="privacy-tab">
                ${renderPrivacySettings()}
            </div>
        </div>
    `;
    
    // Setup tab switching
    setupTabs();
}

// Setup tabs
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

// Render account settings
function renderAccountSettings() {
    return `
        <div class="settings-section">
            <div class="section-header">
                <h3>Thông Tin Tài Khoản</h3>
                <p>Quản lý thông tin tài khoản của bạn</p>
            </div>
            
            <form id="accountForm" class="settings-form">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" value="${currentUser.email || ''}" readonly>
                    <small>Email không thể thay đổi</small>
                </div>
                
                <div class="form-group">
                    <label>Tên hiển thị</label>
                    <input type="text" name="displayName" value="${currentUser.name || ''}" placeholder="Nhập tên hiển thị">
                </div>
                
                <div class="form-group">
                    <label>Ngôn ngữ</label>
                    <select name="language">
                        <option value="vi" selected>Tiếng Việt</option>
                        <option value="en">English</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Múi giờ</label>
                    <select name="timezone">
                        <option value="Asia/Ho_Chi_Minh" selected>GMT+7 (Hồ Chí Minh)</option>
                        <option value="Asia/Bangkok">GMT+7 (Bangkok)</option>
                    </select>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i>
                        Lưu Thay Đổi
                    </button>
                </div>
            </form>
        </div>
        
        <div class="settings-section danger-zone">
            <div class="section-header">
                <h3>Vùng Nguy Hiểm</h3>
                <p>Các hành động này không thể hoàn tác</p>
            </div>
            
            <div class="danger-actions">
                <button class="btn btn-danger" onclick="deactivateAccount()">
                    <i class="fas fa-user-times"></i>
                    Vô Hiệu Hóa Tài Khoản
                </button>
                <button class="btn btn-danger" onclick="deleteAccount()">
                    <i class="fas fa-trash"></i>
                    Xóa Tài Khoản
                </button>
            </div>
        </div>
    `;
}

// Render security settings
function renderSecuritySettings() {
    return `
        <div class="settings-section">
            <div class="section-header">
                <h3>Đổi Mật Khẩu</h3>
                <p>Cập nhật mật khẩu để bảo vệ tài khoản</p>
            </div>
            
            <form id="passwordForm" class="settings-form">
                <div class="form-group">
                    <label>Mật khẩu hiện tại <span class="required">*</span></label>
                    <input type="password" name="currentPassword" required>
                </div>
                
                <div class="form-group">
                    <label>Mật khẩu mới <span class="required">*</span></label>
                    <input type="password" name="newPassword" required minlength="8">
                    <small>Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt</small>
                </div>
                
                <div class="form-group">
                    <label>Xác nhận mật khẩu mới <span class="required">*</span></label>
                    <input type="password" name="confirmPassword" required>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-key"></i>
                        Đổi Mật Khẩu
                    </button>
                </div>
            </form>
        </div>
        
        <div class="settings-section">
            <div class="section-header">
                <h3>Xác Thực Hai Yếu Tố (2FA)</h3>
                <p>Tăng cường bảo mật cho tài khoản</p>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Xác thực qua SMS</h4>
                    <p>Nhận mã xác thực qua tin nhắn điện thoại</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" id="sms2fa">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Xác thực qua Email</h4>
                    <p>Nhận mã xác thực qua email</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" id="email2fa">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="section-header">
                <h3>Phiên Đăng Nhập</h3>
                <p>Quản lý các thiết bị đang đăng nhập</p>
            </div>
            
            <div class="sessions-list">
                <div class="session-item active">
                    <div class="session-icon">
                        <i class="fas fa-desktop"></i>
                    </div>
                    <div class="session-info">
                        <h4>Windows PC - Chrome</h4>
                        <p>Hà Nội, Việt Nam • Đang hoạt động</p>
                        <p class="session-time">Đăng nhập: ${new Date().toLocaleString('vi-VN')}</p>
                    </div>
                    <div class="session-action">
                        <span class="badge badge-success">Hiện tại</span>
                    </div>
                </div>
            </div>
            
            <button class="btn btn-secondary" style="margin-top: 15px;">
                <i class="fas fa-sign-out-alt"></i>
                Đăng Xuất Tất Cả Thiết Bị Khác
            </button>
        </div>
    `;
}

// Render notification settings
function renderNotificationSettings() {
    return `
        <div class="settings-section">
            <div class="section-header">
                <h3>Thông Báo Email</h3>
                <p>Chọn loại thông báo bạn muốn nhận qua email</p>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Tin nhắn mới</h4>
                    <p>Nhận thông báo khi có tin nhắn mới</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Yêu cầu mới</h4>
                    <p>Nhận thông báo khi có yêu cầu học mới</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Cập nhật lịch dạy</h4>
                    <p>Nhận thông báo về thay đổi lịch dạy</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Bài viết blog mới</h4>
                    <p>Nhận thông báo về bài viết blog mới</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="section-header">
                <h3>Thông Báo Đẩy</h3>
                <p>Nhận thông báo trực tiếp trên trình duyệt</p>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Bật thông báo đẩy</h4>
                    <p>Nhận thông báo ngay cả khi không mở trang web</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" id="pushNotifications">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="section-header">
                <h3>Tóm Tắt Email</h3>
                <p>Nhận email tóm tắt các hoạt động</p>
            </div>
            
            <div class="form-group">
                <label>Tần suất gửi</label>
                <select>
                    <option value="daily">Hàng ngày</option>
                    <option value="weekly" selected>Hàng tuần</option>
                    <option value="monthly">Hàng tháng</option>
                    <option value="never">Không bao giờ</option>
                </select>
            </div>
        </div>
    `;
}

// Render privacy settings
function renderPrivacySettings() {
    return `
        <div class="settings-section">
            <div class="section-header">
                <h3>Quyền Riêng Tư Hồ Sơ</h3>
                <p>Kiểm soát ai có thể xem thông tin của bạn</p>
            </div>
            
            <div class="form-group">
                <label>Hiển thị hồ sơ với</label>
                <select>
                    <option value="public">Công khai (Mọi người)</option>
                    <option value="users" selected>Chỉ người dùng đã đăng nhập</option>
                    <option value="connections">Chỉ người đã kết nối</option>
                    <option value="private">Riêng tư (Chỉ mình tôi)</option>
                </select>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Hiển thị số điện thoại</h4>
                    <p>Cho phép người khác xem số điện thoại của bạn</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Hiển thị email</h4>
                    <p>Cho phép người khác xem địa chỉ email của bạn</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Hiển thị trạng thái online</h4>
                    <p>Cho người khác biết khi bạn đang online</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="section-header">
                <h3>Dữ Liệu & Quyền Riêng Tư</h3>
                <p>Quản lý dữ liệu cá nhân của bạn</p>
            </div>
            
            <div class="privacy-actions">
                <button class="btn btn-secondary">
                    <i class="fas fa-download"></i>
                    Tải Xuống Dữ Liệu Của Tôi
                </button>
                <button class="btn btn-secondary">
                    <i class="fas fa-file-export"></i>
                    Xuất Dữ Liệu
                </button>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="section-header">
                <h3>Lịch Sử Hoạt Động</h3>
                <p>Quản lý lịch sử sử dụng của bạn</p>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Lưu lịch sử tìm kiếm</h4>
                    <p>Lưu các từ khóa tìm kiếm để cải thiện trải nghiệm</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <button class="btn btn-secondary" style="margin-top: 15px;">
                <i class="fas fa-trash"></i>
                Xóa Lịch Sử Hoạt Động
            </button>
        </div>
    `;
}

// Deactivate account
function deactivateAccount() {
    if (!confirm('Bạn có chắc chắn muốn vô hiệu hóa tài khoản? Bạn có thể kích hoạt lại sau.')) return;
    
    showNotification('Chức năng đang được phát triển', 'info');
}

// Delete account
function deleteAccount() {
    const confirmation = prompt('Nhập "XOA TAI KHOAN" để xác nhận xóa tài khoản:');
    if (confirmation !== 'XOA TAI KHOAN') {
        showNotification('Xác nhận không chính xác', 'error');
        return;
    }
    
    if (!confirm('Hành động này KHÔNG THỂ HOÀN TÁC! Tất cả dữ liệu sẽ bị xóa vĩnh viễn. Bạn có chắc chắn?')) return;
    
    showNotification('Chức năng đang được phát triển', 'info');
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
