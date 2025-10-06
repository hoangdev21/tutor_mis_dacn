// ===== SETTINGS PAGE JAVASCRIPT =====
(function() {
    'use strict';

    const API_BASE_URL = 'http://localhost:5000/api';
    let settingsUser = null;
    let userPreferences = {
        language: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        theme: 'light',
        emailNotifications: {
            newMessages: true,
            newRequests: true,
            scheduleUpdates: true,
            blogPosts: false,
            systemUpdates: true
        },
        pushNotifications: false,
        emailDigest: 'weekly',
        privacy: {
            profileVisibility: 'users',
            showPhone: true,
            showEmail: false,
            showOnlineStatus: true,
            saveSearchHistory: true
        }
    };

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
        settingsUser = userData;
        
        console.log('Settings page initialized for user:', settingsUser.email);
        
        // Load user preferences
        loadUserPreferences();
        
        // Render settings
        renderSettings();
        
        // Setup event listeners after rendering
        setTimeout(() => {
            setupEventListeners();
        }, 100);
    });

// Load user preferences
async function loadUserPreferences() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/settings/preferences`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            userPreferences = { ...userPreferences, ...data.preferences };
        }
    } catch (error) {
        console.log('Using default preferences');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Account form
    const accountForm = document.getElementById('accountForm');
    if (accountForm) {
        accountForm.addEventListener('submit', handleAccountUpdate);
    }
    
    // Password form
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
        
        // Password strength checker
        const newPasswordInput = passwordForm.querySelector('input[name="newPassword"]');
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', checkPasswordStrength);
        }
    }
    
    // Toggle switches
    document.querySelectorAll('.toggle-switch input').forEach(toggle => {
        toggle.addEventListener('change', handleToggleChange);
    });
    
    // Push notifications
    const pushToggle = document.getElementById('pushNotifications');
    if (pushToggle) {
        pushToggle.addEventListener('change', handlePushNotificationToggle);
    }
}

// Render settings
function renderSettings() {
    const container = document.getElementById('settingsContainer');
    
    // Determine tabs based on role
    const tabs = getTabsForRole();
    
    container.innerHTML = `
        <div class="settings-tabs">
            ${tabs.map((tab, index) => `
                <button class="tab-btn ${index === 0 ? 'active' : ''}" data-tab="${tab.id}">
                    <i class="${tab.icon}"></i>
                    ${tab.label}
                </button>
            `).join('')}
        </div>
        
        <div class="settings-content">
            ${tabs.map((tab, index) => `
                <div class="tab-content ${index === 0 ? 'active' : ''}" id="${tab.id}-tab">
                    ${tab.render()}
                </div>
            `).join('')}
        </div>
    `;
    
    // Setup tab switching
    setupTabs();
}

// Get tabs for role
function getTabsForRole() {
    const role = settingsUser.role;
    
    const commonTabs = [
        { id: 'account', label: 'Tài Khoản', icon: 'fas fa-user', render: renderAccountSettings },
        { id: 'security', label: 'Bảo Mật', icon: 'fas fa-lock', render: renderSecuritySettings },
        { id: 'notifications', label: 'Thông Báo', icon: 'fas fa-bell', render: renderNotificationSettings },
        { id: 'privacy', label: 'Quyền Riêng Tư', icon: 'fas fa-shield-alt', render: renderPrivacySettings }
    ];
    
    if (role === 'admin') {
        return [
            ...commonTabs,
            { id: 'system', label: 'Hệ Thống', icon: 'fas fa-cogs', render: renderSystemSettings },
            { id: 'billing', label: 'Thanh Toán', icon: 'fas fa-credit-card', render: renderBillingSettings }
        ];
    } else if (role === 'tutor') {
        return [
            ...commonTabs,
            { id: 'teaching', label: 'Giảng Dạy', icon: 'fas fa-chalkboard-teacher', render: renderTeachingSettings },
            { id: 'payment', label: 'Thanh Toán', icon: 'fas fa-wallet', render: renderPaymentSettings }
        ];
    } else {
        return [
            ...commonTabs,
            { id: 'learning', label: 'Học Tập', icon: 'fas fa-graduation-cap', render: renderLearningSettings }
        ];
    }
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
                    <input type="email" value="${settingsUser.email || ''}" readonly>
                    <small>Email không thể thay đổi</small>
                </div>
                
                <div class="form-group">
                    <label>Tên hiển thị</label>
                    <input type="text" name="displayName" value="${settingsUser.name || ''}" placeholder="Nhập tên hiển thị">
                </div>
                
                <div class="form-group">
                    <label>Số điện thoại</label>
                    <input type="tel" name="phone" value="${settingsUser.phone || ''}" placeholder="Nhập số điện thoại">
                </div>
                
                <div class="form-group">
                    <label>Ngôn ngữ</label>
                    <select name="language">
                        <option value="vi" ${userPreferences.language === 'vi' ? 'selected' : ''}>Tiếng Việt</option>
                        <option value="en" ${userPreferences.language === 'en' ? 'selected' : ''}>English</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Múi giờ</label>
                    <select name="timezone">
                        <option value="Asia/Ho_Chi_Minh" ${userPreferences.timezone === 'Asia/Ho_Chi_Minh' ? 'selected' : ''}>GMT+7 (Hồ Chí Minh)</option>
                        <option value="Asia/Bangkok" ${userPreferences.timezone === 'Asia/Bangkok' ? 'selected' : ''}>GMT+7 (Bangkok)</option>
                        <option value="Asia/Singapore">GMT+8 (Singapore)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Giao diện</label>
                    <select name="theme">
                        <option value="light" ${userPreferences.theme === 'light' ? 'selected' : ''}>Sáng</option>
                        <option value="dark" ${userPreferences.theme === 'dark' ? 'selected' : ''}>Tối</option>
                        <option value="auto" ${userPreferences.theme === 'auto' ? 'selected' : ''}>Tự động</option>
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
                    <div style="position: relative;">
                        <input type="password" name="currentPassword" id="currentPassword" required>
                        <button type="button" class="toggle-password" onclick="togglePasswordVisibility('currentPassword')" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer;">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Mật khẩu mới <span class="required">*</span></label>
                    <div style="position: relative;">
                        <input type="password" name="newPassword" id="newPassword" required minlength="8">
                        <button type="button" class="toggle-password" onclick="togglePasswordVisibility('newPassword')" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer;">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                    <small>Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt</small>
                    <div class="password-strength" id="passwordStrength" style="display: none;">
                        <div class="password-strength-bar">
                            <div class="password-strength-fill" id="strengthFill"></div>
                        </div>
                        <div class="password-strength-text" id="strengthText"></div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Xác nhận mật khẩu mới <span class="required">*</span></label>
                    <div style="position: relative;">
                        <input type="password" name="confirmPassword" id="confirmPassword" required>
                        <button type="button" class="toggle-password" onclick="togglePasswordVisibility('confirmPassword')" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer;">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
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
                        <input type="checkbox" id="sms2fa" data-setting="sms2fa">
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
                        <input type="checkbox" id="email2fa" data-setting="email2fa">
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
            
            <div class="sessions-list" id="sessionsList">
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
            
            <button class="btn btn-secondary" style="margin-top: 15px;" onclick="logoutAllDevices()">
                <i class="fas fa-sign-out-alt"></i>
                Đăng Xuất Tất Cả Thiết Bị Khác
            </button>
        </div>
        
        <div class="settings-section">
            <div class="section-header">
                <h3>Lịch Sử Hoạt Động Bảo Mật</h3>
                <p>Các hoạt động bảo mật gần đây</p>
            </div>
            
            <div class="activity-log">
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="activity-content">
                        <h4>Đăng nhập thành công</h4>
                        <p>Chrome trên Windows • 118.69.*.* </p>
                    </div>
                    <div class="activity-time">
                        Hôm nay
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render notification settings
function renderNotificationSettings() {
    const role = settingsUser.role;
    
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
                        <input type="checkbox" data-setting="emailNotifications.newMessages" ${userPreferences.emailNotifications.newMessages ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>${role === 'tutor' ? 'Yêu cầu học mới' : 'Phản hồi yêu cầu'}</h4>
                    <p>Nhận thông báo về ${role === 'tutor' ? 'yêu cầu học mới từ học sinh' : 'phản hồi từ gia sư'}</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="emailNotifications.newRequests" ${userPreferences.emailNotifications.newRequests ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Cập nhật lịch ${role === 'tutor' ? 'dạy' : 'học'}</h4>
                    <p>Nhận thông báo về thay đổi lịch ${role === 'tutor' ? 'dạy' : 'học'}</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="emailNotifications.scheduleUpdates" ${userPreferences.emailNotifications.scheduleUpdates ? 'checked' : ''}>
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
                        <input type="checkbox" data-setting="emailNotifications.blogPosts" ${userPreferences.emailNotifications.blogPosts ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            ${role === 'admin' ? `
            <div class="settings-item">
                <div class="item-info">
                    <h4>Cập nhật hệ thống</h4>
                    <p>Nhận thông báo về cập nhật và bảo trì hệ thống</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="emailNotifications.systemUpdates" ${userPreferences.emailNotifications.systemUpdates ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            ` : ''}
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
                        <input type="checkbox" id="pushNotifications" data-setting="pushNotifications" ${userPreferences.pushNotifications ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            ${userPreferences.pushNotifications ? `
            <div class="settings-card" style="margin-top: 20px; padding: 16px; background: #e8f5e9; border-color: #4caf50;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fas fa-check-circle" style="color: #4caf50; font-size: 24px;"></i>
                    <div>
                        <h4 style="margin: 0 0 4px 0; color: #2e7d32;">Thông báo đẩy đã được bật</h4>
                        <p style="margin: 0; font-size: 13px; color: #558b2f;">Bạn sẽ nhận được thông báo quan trọng ngay lập tức</p>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
        
        <div class="settings-section">
            <div class="section-header">
                <h3>Tóm Tắt Email</h3>
                <p>Nhận email tóm tắt các hoạt động</p>
            </div>
            
            <div class="form-group">
                <label>Tần suất gửi</label>
                <select name="emailDigest" data-setting="emailDigest" onchange="handleSettingChange(this)">
                    <option value="daily" ${userPreferences.emailDigest === 'daily' ? 'selected' : ''}>Hàng ngày</option>
                    <option value="weekly" ${userPreferences.emailDigest === 'weekly' ? 'selected' : ''}>Hàng tuần</option>
                    <option value="monthly" ${userPreferences.emailDigest === 'monthly' ? 'selected' : ''}>Hàng tháng</option>
                    <option value="never" ${userPreferences.emailDigest === 'never' ? 'selected' : ''}>Không bao giờ</option>
                </select>
            </div>
            
            <div style="margin-top: 16px; padding: 12px; background: var(--bg-color); border-radius: 8px; font-size: 13px; color: var(--text-secondary);">
                <i class="fas fa-info-circle"></i>
                Email tóm tắt sẽ bao gồm: tin nhắn mới, yêu cầu, lịch học/dạy sắp tới và các thông báo quan trọng khác.
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
                <select name="profileVisibility" data-setting="privacy.profileVisibility" onchange="handleSettingChange(this)">
                    <option value="public" ${userPreferences.privacy.profileVisibility === 'public' ? 'selected' : ''}>Công khai (Mọi người)</option>
                    <option value="users" ${userPreferences.privacy.profileVisibility === 'users' ? 'selected' : ''}>Chỉ người dùng đã đăng nhập</option>
                    <option value="connections" ${userPreferences.privacy.profileVisibility === 'connections' ? 'selected' : ''}>Chỉ người đã kết nối</option>
                    <option value="private" ${userPreferences.privacy.profileVisibility === 'private' ? 'selected' : ''}>Riêng tư (Chỉ mình tôi)</option>
                </select>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Hiển thị số điện thoại</h4>
                    <p>Cho phép người khác xem số điện thoại của bạn</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="privacy.showPhone" ${userPreferences.privacy.showPhone ? 'checked' : ''}>
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
                        <input type="checkbox" data-setting="privacy.showEmail" ${userPreferences.privacy.showEmail ? 'checked' : ''}>
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
                        <input type="checkbox" data-setting="privacy.showOnlineStatus" ${userPreferences.privacy.showOnlineStatus ? 'checked' : ''}>
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
                <button class="btn btn-secondary" onclick="downloadMyData()">
                    <i class="fas fa-download"></i>
                    Tải Xuống Dữ Liệu Của Tôi
                </button>
                <button class="btn btn-secondary" onclick="exportMyData()">
                    <i class="fas fa-file-export"></i>
                    Xuất Dữ Liệu
                </button>
            </div>
            
            <div style="margin-top: 16px; padding: 12px; background: var(--bg-color); border-radius: 8px; font-size: 13px; color: var(--text-secondary);">
                <i class="fas fa-info-circle"></i>
                Bạn có thể tải xuống tất cả dữ liệu cá nhân của mình bất cứ lúc nào. Dữ liệu sẽ được gửi qua email dưới dạng file JSON.
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
                        <input type="checkbox" data-setting="privacy.saveSearchHistory" ${userPreferences.privacy.saveSearchHistory ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <button class="btn btn-secondary" style="margin-top: 15px;" onclick="clearActivityHistory()">
                <i class="fas fa-trash"></i>
                Xóa Lịch Sử Hoạt Động
            </button>
        </div>
        
        <div class="settings-section">
            <div class="section-header">
                <h3>Cookie & Theo Dõi</h3>
                <p>Quản lý cookie và công nghệ theo dõi</p>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Cookie cần thiết</h4>
                    <p>Cookie để trang web hoạt động bình thường (không thể tắt)</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" checked disabled>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Cookie phân tích</h4>
                    <p>Giúp chúng tôi cải thiện trải nghiệm người dùng</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="privacy.analytticsCookies" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
    `;
}

// Render teaching settings (for tutors)
function renderTeachingSettings() {
    return `
        <div class="settings-section">
            <div class="section-header">
                <h3>Cài Đặt Giảng Dạy</h3>
                <p>Quản lý tùy chọn giảng dạy của bạn</p>
            </div>
            
            <div class="form-group">
                <label>Khoảng cách dạy tối đa (km)</label>
                <input type="number" name="maxDistance" value="10" min="1" max="100">
                <small>Khoảng cách tối đa bạn sẵn sàng di chuyển để dạy</small>
            </div>
            
            <div class="form-group">
                <label>Số học sinh tối đa</label>
                <input type="number" name="maxStudents" value="5" min="1" max="20">
                <small>Số lượng học sinh tối đa bạn muốn dạy cùng lúc</small>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Chấp nhận yêu cầu tự động</h4>
                    <p>Tự động chấp nhận yêu cầu phù hợp với tiêu chí của bạn</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="teaching.autoAccept">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Nhận yêu cầu khẩn cấp</h4>
                    <p>Nhận thông báo về các yêu cầu học khẩn cấp</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="teaching.urgentRequests" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="section-header">
                <h3>Lịch Dạy Mặc Định</h3>
                <p>Thiết lập thời gian bạn thường có thể dạy</p>
            </div>
            
            <div class="settings-card" style="padding: 20px;">
                <p style="margin: 0 0 16px 0; color: var(--text-secondary); font-size: 14px;">
                    Đang phát triển: Tính năng quản lý lịch dạy chi tiết
                </p>
                <button class="btn btn-secondary">
                    <i class="fas fa-calendar"></i>
                    Cấu Hình Lịch Dạy
                </button>
            </div>
        </div>
    `;
}

// Render learning settings (for students)
function renderLearningSettings() {
    return `
        <div class="settings-section">
            <div class="section-header">
                <h3>Cài Đặt Học Tập</h3>
                <p>Tùy chỉnh trải nghiệm học tập của bạn</p>
            </div>
            
            <div class="form-group">
                <label>Mục tiêu học tập</label>
                <select name="learningGoal">
                    <option value="improve_grades">Cải thiện điểm số</option>
                    <option value="exam_prep">Ôn thi</option>
                    <option value="skill_building">Xây dựng kỹ năng</option>
                    <option value="hobby">Sở thích</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Thời gian học ưa thích</label>
                <select name="preferredTime">
                    <option value="morning">Buổi sáng (6h-12h)</option>
                    <option value="afternoon">Buổi chiều (12h-18h)</option>
                    <option value="evening">Buổi tối (18h-22h)</option>
                    <option value="flexible">Linh hoạt</option>
                </select>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Nhắc nhở học tập</h4>
                    <p>Nhận nhắc nhở về bài tập và lịch học</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="learning.reminders" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Gợi ý gia sư</h4>
                    <p>Nhận gợi ý về gia sư phù hợp với nhu cầu của bạn</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="learning.tutorSuggestions" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
    `;
}

// Render payment settings (for tutors)
function renderPaymentSettings() {
    return `
        <div class="settings-section">
            <div class="section-header">
                <h3>Phương Thức Thanh Toán</h3>
                <p>Quản lý cách bạn nhận thanh toán</p>
            </div>
            
            <div class="payment-methods" id="paymentMethods">
                <div class="payment-method-item primary">
                    <div class="payment-icon">
                        <i class="fas fa-university"></i>
                    </div>
                    <div class="payment-details">
                        <h4>Ngân hàng Vietcombank</h4>
                        <p>**** **** **** 1234</p>
                    </div>
                    <div class="payment-actions">
                        <span class="badge badge-success">Mặc định</span>
                    </div>
                </div>
            </div>
            
            <button class="btn btn-primary" style="margin-top: 16px;" onclick="addPaymentMethod()">
                <i class="fas fa-plus"></i>
                Thêm Phương Thức Thanh Toán
            </button>
        </div>
        
        <div class="settings-section">
            <div class="section-header">
                <h3>Mức Giá Mặc Định</h3>
                <p>Thiết lập mức giá cho các môn học</p>
            </div>
            
            <div class="form-group">
                <label>Giá mặc định (VNĐ/giờ)</label>
                <input type="number" name="defaultRate" value="150000" min="50000" step="10000">
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Cho phép thương lượng giá</h4>
                    <p>Học sinh có thể đề xuất mức giá khác</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="payment.allowNegotiation" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
    `;
}

// Render billing settings (for admin)
function renderBillingSettings() {
    return `
        <div class="settings-section">
            <div class="section-header">
                <h3>Thanh Toán Hệ Thống</h3>
                <p>Quản lý thanh toán và hóa đơn</p>
            </div>
            
            <div class="settings-card">
                <div class="settings-card-header">
                    <div class="settings-card-icon">
                        <i class="fas fa-credit-card"></i>
                    </div>
                    <div class="settings-card-title">
                        <h4>Phương thức thanh toán đang hoạt động</h4>
                        <p>Quản lý cổng thanh toán</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render system settings (for admin)
function renderSystemSettings() {
    return `
        <div class="settings-section">
            <div class="section-header">
                <h3>Cài Đặt Hệ Thống</h3>
                <p>Cấu hình hệ thống và bảo trì</p>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Chế độ bảo trì</h4>
                    <p>Tạm dừng hệ thống để bảo trì</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="system.maintenanceMode">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Cho phép đăng ký mới</h4>
                    <p>Người dùng mới có thể đăng ký tài khoản</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="system.allowRegistration" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-item">
                <div class="item-info">
                    <h4>Tự động duyệt gia sư</h4>
                    <p>Tự động phê duyệt gia sư đăng ký mới</p>
                </div>
                <div class="item-action">
                    <label class="toggle-switch">
                        <input type="checkbox" data-setting="system.autoApproveTutors">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="section-header">
                <h3>Logs & Giám Sát</h3>
                <p>Cấu hình ghi log và giám sát</p>
            </div>
            
            <div class="form-group">
                <label>Mức độ log</label>
                <select name="logLevel">
                    <option value="error">Chỉ lỗi</option>
                    <option value="warn">Cảnh báo & lỗi</option>
                    <option value="info" selected>Thông tin</option>
                    <option value="debug">Debug (chi tiết)</option>
                </select>
            </div>
            
            <button class="btn btn-secondary" style="margin-top: 16px;">
                <i class="fas fa-file-download"></i>
                Tải Xuống Logs
            </button>
        </div>
    `;
}

// Handle account update
async function handleAccountUpdate(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/settings/account`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Update local user data
            const userData = JSON.parse(localStorage.getItem('userData'));
            localStorage.setItem('userData', JSON.stringify({
                ...userData,
                ...data
            }));
            
            showNotification('Cập nhật tài khoản thành công!', 'success');
        } else {
            showNotification(result.message || 'Không thể cập nhật tài khoản', 'error');
        }
    } catch (error) {
        showNotification('Lỗi kết nối. Vui lòng thử lại!', 'error');
    }
}

// Handle password change
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');
    
    if (newPassword !== confirmPassword) {
        showNotification('Mật khẩu xác nhận không khớp!', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showNotification('Mật khẩu phải có ít nhất 8 ký tự!', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/settings/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Đổi mật khẩu thành công!', 'success');
            e.target.reset();
            document.getElementById('passwordStrength').style.display = 'none';
        } else {
            showNotification(result.message || 'Không thể đổi mật khẩu', 'error');
        }
    } catch (error) {
        showNotification('Lỗi kết nối. Vui lòng thử lại!', 'error');
    }
}

// Check password strength
function checkPasswordStrength(e) {
    const password = e.target.value;
    const strengthDiv = document.getElementById('passwordStrength');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    if (!password) {
        strengthDiv.style.display = 'none';
        return;
    }
    
    strengthDiv.style.display = 'block';
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    
    strengthFill.className = 'password-strength-fill';
    
    if (strength <= 1) {
        strengthFill.classList.add('weak');
        strengthText.textContent = 'Mật khẩu yếu';
        strengthText.style.color = '#e53e3e';
    } else if (strength <= 3) {
        strengthFill.classList.add('medium');
        strengthText.textContent = 'Mật khẩu trung bình';
        strengthText.style.color = '#dd6b20';
    } else {
        strengthFill.classList.add('strong');
        strengthText.textContent = 'Mật khẩu mạnh';
        strengthText.style.color = '#38a169';
    }
}

// Handle toggle change
async function handleToggleChange(e) {
    const setting = e.target.dataset.setting;
    const value = e.target.checked;
    
    if (!setting) return;
    
    // Update local preferences
    const keys = setting.split('.');
    let obj = userPreferences;
    for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    
    // Save to backend
    await savePreferences();
}

// Handle setting change
async function handleSettingChange(e) {
    const setting = e.target.dataset.setting;
    const value = e.target.value;
    
    if (!setting) return;
    
    // Update local preferences
    const keys = setting.split('.');
    let obj = userPreferences;
    for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    
    // Save to backend
    await savePreferences();
}

// Save preferences
async function savePreferences() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/settings/preferences`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ preferences: userPreferences })
        });
        
        if (response.ok) {
            showNotification('Đã lưu cài đặt', 'success');
        }
    } catch (error) {
        console.error('Error saving preferences:', error);
    }
}

// Handle push notification toggle
async function handlePushNotificationToggle(e) {
    if (e.target.checked) {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                e.target.checked = false;
                showNotification('Bạn cần cấp quyền thông báo!', 'error');
                return;
            }
        } else {
            e.target.checked = false;
            showNotification('Trình duyệt không hỗ trợ thông báo đẩy!', 'error');
            return;
        }
    }
    
    await handleToggleChange(e);
}

// Toggle password visibility
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Logout all devices
async function logoutAllDevices() {
    if (!confirm('Đăng xuất tất cả thiết bị khác? Bạn sẽ cần đăng nhập lại trên các thiết bị đó.')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/settings/logout-all`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showNotification('Đã đăng xuất tất cả thiết bị khác!', 'success');
        }
    } catch (error) {
        showNotification('Lỗi kết nối. Vui lòng thử lại!', 'error');
    }
}

// Download my data
async function downloadMyData() {
    try {
        const token = localStorage.getItem('token');
        showNotification('Đang chuẩn bị dữ liệu... Vui lòng kiểm tra email.', 'info');
        
        await fetch(`${API_BASE_URL}/settings/download-data`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    } catch (error) {
        showNotification('Lỗi kết nối. Vui lòng thử lại!', 'error');
    }
}

// Export my data
async function exportMyData() {
    await downloadMyData();
}

// Clear activity history
async function clearActivityHistory() {
    if (!confirm('Xóa tất cả lịch sử hoạt động? Hành động này không thể hoàn tác.')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/settings/clear-history`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showNotification('Đã xóa lịch sử hoạt động!', 'success');
        }
    } catch (error) {
        showNotification('Lỗi kết nối. Vui lòng thử lại!', 'error');
    }
}

// Add payment method
function addPaymentMethod() {
    showNotification('Chức năng đang được phát triển', 'info');
}

// Deactivate account
async function deactivateAccount() {
    if (!confirm('Bạn có chắc chắn muốn vô hiệu hóa tài khoản? Bạn có thể kích hoạt lại sau.')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/settings/deactivate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showNotification('Tài khoản đã được vô hiệu hóa!', 'success');
            setTimeout(() => {
                localStorage.clear();
                window.location.href = '../../index.html';
            }, 2000);
        }
    } catch (error) {
        showNotification('Lỗi kết nối. Vui lòng thử lại!', 'error');
    }
}

// Delete account
async function deleteAccount() {
    const confirmation = prompt('Nhập "XOA TAI KHOAN" để xác nhận xóa tài khoản:');
    if (confirmation !== 'XOA TAI KHOAN') {
        showNotification('Xác nhận không chính xác', 'error');
        return;
    }
    
    if (!confirm('Hành động này KHÔNG THỂ HOÀN TÁC! Tất cả dữ liệu sẽ bị xóa vĩnh viễn. Bạn có chắc chắn?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/settings/delete-account`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showNotification('Tài khoản đã được xóa!', 'success');
            setTimeout(() => {
                localStorage.clear();
                window.location.href = '../../index.html';
            }, 2000);
        }
    } catch (error) {
        showNotification('Lỗi kết nối. Vui lòng thử lại!', 'error');
    }
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

})(); // End of IIFE
