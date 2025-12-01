/* ====================================================================
   TERMS & POLICY MODAL HANDLER
   Xử lý hiển thị Điều khoản sử dụng và Chính sách bảo mật
   ==================================================================== */

/**
 * Mở trang Điều khoản sử dụng từ modal
 */
function showTermsPage() {
    if (window.location.pathname.includes('pages/')) {
        // Đã ở trang terms, không cần làm gì
        return;
    }
    // Mở trong tab mới
    window.open('pages/terms.html', '_blank');
}

/**
 * Mở trang Chính sách bảo mật từ modal
 */
function showPrivacyPage() {
    if (window.location.pathname.includes('pages/')) {
        // Đã ở trang privacy, không cần làm gì
        return;
    }
    // Mở trong tab mới
    window.open('pages/privacy.html', '_blank');
}

/**
 * Xử lý khi người dùng nhấp vào link Điều khoản trong modal
 */
document.addEventListener('DOMContentLoaded', function() {
    // Tìm link "Điều khoản sử dụng" trong modal
    const termsLinks = document.querySelectorAll('#show-terms');
    termsLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showTermsPage();
        });
    });

    // Tìm link "Chính sách bảo mật" trong modal
    const policyLinks = document.querySelectorAll('#show-policy');
    policyLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showPrivacyPage();
        });
    });

    // Xử lý nếu người dùng nhấp vào các link trong footer
    const footerTermsLinks = document.querySelectorAll('a[href="pages/terms.html"]');
    footerTermsLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (!link.target) {
                e.preventDefault();
                window.location.href = 'pages/terms.html';
            }
        });
    });

    const footerPrivacyLinks = document.querySelectorAll('a[href="pages/privacy.html"]');
    footerPrivacyLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (!link.target) {
                e.preventDefault();
                window.location.href = 'pages/privacy.html';
            }
        });
    });
});

/**
 * Điều hướng trở lại trang chủ từ trang Terms/Privacy
 */
function goToHome() {
    window.location.href = '/';
}

/**
 * Mở modal đăng nhập từ trang Terms/Privacy
 */
function openLoginFromPage() {
    // Gọi hàm global từ index.html nếu tồn tại
    if (typeof showLoginModal === 'function') {
        showLoginModal();
    } else {
        window.location.href = '/#login';
    }
}

/**
 * Mở modal đăng ký từ trang Terms/Privacy
 */
function openRegisterFromPage() {
    // Gọi hàm global từ index.html nếu tồn tại
    if (typeof showRegisterModal === 'function') {
        showRegisterModal();
    } else {
        window.location.href = '/#register';
    }
}

/**
 * Hàm hỗ trợ nhảy đến section cụ thể trong trang
 */
function jumpToSection(sectionId) {
    const element = document.querySelector(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Highlight section
        element.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
        setTimeout(() => {
            element.style.backgroundColor = '';
        }, 2000);
    }
}

/**
 * Theo dõi vị trí scroll và cập nhật TOC active state
 */
function trackScrollPosition() {
    const sections = document.querySelectorAll('[id^="section-"]');
    const tocLinks = document.querySelectorAll('.toc-list a');

    window.addEventListener('scroll', function() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        tocLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

// Khởi tạo khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    trackScrollPosition();
});

/**
 * Hàm in trang Điều khoản hoặc Chính sách
 */
function printPage() {
    window.print();
}

/**
 * Hàm tải xuống trang dưới dạng PDF
 * Sử dụng window.print() với tùy chọn "Save as PDF"
 */
function downloadAsPDF() {
    const filename = document.title + '.pdf';
    // Yêu cầu người dùng lưu dưới dạng PDF qua dialog in
    const originalTitle = document.title;
    document.title = filename.replace('.pdf', '');
    
    window.print();
    
    document.title = originalTitle;
}

/**
 * Hàm sao chép liên kết trang hiện tại
 */
function copyPageLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        // Hiển thị thông báo thành công
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background-color: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            font-size: 14px;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = 'Đã sao chép liên kết!';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    });
}

/**
 * Hàm tìm kiếm nội dung trong trang
 */
function searchContent() {
    const searchTerm = prompt('Tìm kiếm nội dung:');
    if (!searchTerm) return;

    const content = document.body.innerText.toLowerCase();
    const regex = new RegExp(searchTerm.toLowerCase(), 'g');
    
    if (regex.test(content)) {
        const matches = content.match(regex);
        alert(`Tìm thấy "${searchTerm}" ${matches.length} lần trong trang`);
    } else {
        alert(`Không tìm thấy "${searchTerm}" trong trang`);
    }
}

/**
 * Thêm CSS cho animations
 */
const styleElement = document.createElement('style');
styleElement.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    .toc-list a.active {
        background-color: rgba(99, 102, 241, 0.15) !important;
        border-left-color: var(--primary-color) !important;
        color: var(--primary-color) !important;
        font-weight: 600;
    }
`;
document.head.appendChild(styleElement);
