// ===== DASHBOARD SIDEBAR JAVASCRIPT =====
// Xử lý sidebar động cho các trang chung (profile, settings, blog, messages)

// Load sidebar menu based on user role
function loadDynamicSidebar(activePage) {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const role = userData.role || 'student';
    
    const sidebarMenu = document.getElementById('sidebarMenu');
    if (!sidebarMenu) return;
    
    // Sidebar menus for each role
    const menus = {
        student: [
            {
                title: 'Menu Chính',
                items: [
                    { icon: 'fas fa-home', text: 'Dashboard', page: 'dashboard', path: '../pages/student/dashboard.html' },
                    { icon: 'fas fa-book', text: 'Khóa Học', page: 'courses', path: '../pages/student/course.html' },
                    { icon: 'fas fa-paper-plane', text: 'Yêu Cầu Gia Sư', page: 'requests', path: '../pages/student/tutor_request.html' },
                    { icon: 'fas fa-search', text: 'Tìm Gia Sư', page: 'find-tutor', path: '../pages/student/find_tutor.html' }
                ]
            },
            {
                title: 'Giao Tiếp',
                items: [
                    { icon: 'fas fa-comments', text: 'Tin Nhắn', page: 'messages', path: '/pages/student/messages.html' }
                ]
            },
            {
                title: 'Nội Dung',
                items: [
                    { icon: 'fas fa-blog', text: 'Blog', page: 'blog', path: '/pages/student/blog.html' }
                ]
            },
            {
                title: 'Cài Đặt',
                items: [
                    { icon: 'fas fa-user', text: 'Hồ Sơ', page: 'profile', path: '/pages/student/profile_student.html' },
                    { icon: 'fas fa-cog', text: 'Cài Đặt', page: 'settings', path: 'setting.html' },
                    { icon: 'fas fa-sign-out-alt', text: 'Đăng Xuất', page: 'logout', action: 'logout' }
                ]
            }
        ],
        tutor: [
            {
                title: 'Menu Chính',
                items: [
                    { icon: 'fas fa-home', text: 'Dashboard', page: 'dashboard', path: '../pages/tutor/dashboard.html' },
                    { icon: 'fas fa-users', text: 'Học Sinh', page: 'students', path: '../pages/tutor/student_management.html' },
                    { icon: 'fas fa-clipboard-list', text: 'Yêu Cầu Mới', page: 'requests', path: '../pages/tutor/new_request.html' },
                    { icon: 'fas fa-calendar-alt', text: 'Lịch Dạy', page: 'schedule', path: '../pages/tutor/schedule.html' },
                    { icon: 'fas fa-chart-line', text: 'Thu Nhập', page: 'income', path: '../pages/tutor/income.html' }
                ]
            },
            {
                title: 'Giao Tiếp',
                items: [
                    { icon: 'fas fa-comments', text: 'Tin Nhắn', page: 'messages', path: 'tutor/messages.html' }
                ]
            },
            {
                title: 'Nội Dung',
                items: [
                    { icon: 'fas fa-blog', text: 'Blog', page: 'blog', path: 'tutor/blog.html' }
                ]
            },
            {
                title: 'Cài Đặt',
                items: [
                    { icon: 'fas fa-user', text: 'Hồ Sơ', page: 'profile', path: 'profile.html' },
                    { icon: 'fas fa-cog', text: 'Cài Đặt', page: 'settings', path: 'setting.html' },
                    { icon: 'fas fa-sign-out-alt', text: 'Đăng Xuất', page: 'logout', action: 'logout' }
                ]
            }
        ],
        admin: [
            {
                title: 'Menu Chính',
                items: [
                    { icon: 'fas fa-chart-line', text: 'Dashboard', page: 'dashboard', path: '../pages/admin/dashboard.html' },
                    { icon: 'fas fa-users', text: 'Người Dùng', page: 'users', path: '../pages/admin/user.html' },
                    { icon: 'fas fa-user-graduate', text: 'Duyệt Gia Sư', page: 'tutors', path: '../pages/admin/approve.html' },
                    { icon: 'fas fa-book', text: 'Khóa Học', page: 'courses', path: '../pages/admin/course.html' }
                ]
            },
            {
                title: 'Nội Dung',
                items: [
                    { icon: 'fas fa-blog', text: 'Quản Lý Blog', page: 'blog', path: '../admin/blog_management.html' },
                    { icon: 'fas fa-flag', text: 'Báo Cáo', page: 'reports', path: '../admin/report.html' }
                ]
            },
            {
                title: 'Tài Chính',
                items: [
                    { icon: 'fas fa-dollar-sign', text: 'Thống Kê Tài Chính', page: 'finance', path: '../admin/financial_statistics.html' },
                    { icon: 'fas fa-exchange-alt', text: 'Giao Dịch', page: 'transactions', path: '../admin/transaction.html' }
                ]
            },
            {
                title: 'Hệ Thống',
                items: [
                    { icon: 'fas fa-cog', text: 'Cài Đặt', page: 'settings', path: '../admin/settings.html' },
                    { icon: 'fas fa-file-alt', text: 'Logs', page: 'logs', path: '../admin/logs.html' },
                    { icon: 'fas fa-sign-out-alt', text: 'Đăng Xuất', page: 'logout', action: 'logout' }
                ]
            }
        ]
    };
    
    // Get menu for current role
    const roleMenu = menus[role] || menus.student;
    
    // Build menu HTML
    let menuHTML = '';
    roleMenu.forEach(section => {
        menuHTML += `<div class="menu-section">`;
        menuHTML += `<div class="menu-section-title">${section.title}</div>`;
        
        section.items.forEach(item => {
            const activeClass = activePage === item.page ? 'active' : '';
            
            if (item.action === 'logout') {
                menuHTML += `
                    <div class="menu-item ${activeClass}" onclick="logout()">
                        <i class="${item.icon}"></i>
                        <span>${item.text}</span>
                    </div>
                `;
            } else {
                menuHTML += `
                    <div class="menu-item ${activeClass}" onclick="navigateToPage('${item.path}')">
                        <i class="${item.icon}"></i>
                        <span>${item.text}</span>
                    </div>
                `;
            }
        });
        
        menuHTML += `</div>`;
    });
    
    sidebarMenu.innerHTML = menuHTML;
}

// Navigate to page
function navigateToPage(path) {
    window.location.href = path;
}

// Logout function
function logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        window.location.href = '../../index.html';
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadDynamicSidebar };
}