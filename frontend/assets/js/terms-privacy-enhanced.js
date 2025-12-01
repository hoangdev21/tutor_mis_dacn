/* ====================================================================
   ENHANCED TERMS & PRIVACY PAGE UTILITIES
   Các tiện ích nâng cao cho trang Điều khoản và Chính sách bảo mật
   ==================================================================== */

class TermsPolicyPageHelper {
    constructor() {
        this.currentSection = null;
        this.init();
    }

    /**
     * Khởi tạo tất cả các tính năng
     */
    init() {
        this.setupTOC();
        this.setupScrollTracking();
        this.setupUtilities();
        this.setupAccessibility();
        this.setupSearch();
    }

    /**
     * Thiết lập Mục lục tương tác
     */
    setupTOC() {
        const tocLinks = document.querySelectorAll('.toc-list a');
        
        tocLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const target = document.querySelector(targetId);
                
                if (target) {
                    // Cuộn mềm
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    
                    // Đánh dấu link active
                    tocLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    
                    // Highlight section
                    this.highlightSection(target);
                }
            });
        });
    }

    /**
     * Theo dõi vị trí cuộn và cập nhật TOC
     */
    setupScrollTracking() {
        const sections = document.querySelectorAll('[id^="section-"]');
        const tocLinks = document.querySelectorAll('.toc-list a');

        window.addEventListener('scroll', () => {
            let current = '';
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                
                if (window.pageYOffset >= sectionTop - 150) {
                    current = section.getAttribute('id');
                    this.currentSection = current;
                }
            });

            tocLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });

            // Hiển thị/ẩn nút "Back to Top"
            this.updateBackToTopButton();
        }, { passive: true });
    }

    /**
     * Đánh dấu section (highlight)
     */
    highlightSection(element) {
        element.style.backgroundColor = 'rgba(99, 102, 241, 0.08)';
        element.style.transition = 'background-color 0.3s ease';
        
        setTimeout(() => {
            element.style.backgroundColor = '';
        }, 2000);
    }

    /**
     * Cập nhật nút "Back to Top"
     */
    updateBackToTopButton() {
        let backToTop = document.getElementById('backToTop');
        
        if (!backToTop) {
            backToTop = this.createBackToTopButton();
            document.body.appendChild(backToTop);
        }

        if (window.pageYOffset > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    }

    /**
     * Tạo nút "Back to Top"
     */
    createBackToTopButton() {
        const button = document.createElement('button');
        button.id = 'backToTop';
        button.innerHTML = '<i class="fas fa-arrow-up"></i>';
        button.setAttribute('aria-label', 'Cuộn lên đầu trang');
        button.className = 'back-to-top-btn';
        
        button.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // Thêm CSS cho button
        const style = document.createElement('style');
        style.textContent = `
            .back-to-top-btn {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 45px;
                height: 45px;
                border-radius: 50%;
                background-color: var(--primary-color, #6366f1);
                color: white;
                border: none;
                cursor: pointer;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 999;
            }

            .back-to-top-btn:hover {
                background-color: var(--secondary-color, #ec4899);
                transform: translateY(-3px);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
            }

            .back-to-top-btn.visible {
                opacity: 1;
                visibility: visible;
            }

            @media (max-width: 768px) {
                .back-to-top-btn {
                    width: 40px;
                    height: 40px;
                    bottom: 20px;
                    right: 20px;
                    font-size: 16px;
                }
            }
        `;
        document.head.appendChild(style);
        
        return button;
    }

    /**
     * Thiết lập các tiện ích bổ sung
     */
    setupUtilities() {
        this.addPrintButton();
        this.addShareButton();
        this.addFontSizeControl();
    }

    /**
     * Thêm nút In trang
     */
    addPrintButton() {
        const printBtn = document.createElement('button');
        printBtn.className = 'util-btn print-btn';
        printBtn.innerHTML = '<i class="fas fa-print"></i> In trang';
        printBtn.title = 'In trang hiện tại';
        printBtn.addEventListener('click', () => window.print());

        const utilities = this.getUtilitiesContainer();
        utilities.appendChild(printBtn);
    }

    /**
     * Thêm nút Chia sẻ
     */
    addShareButton() {
        const shareBtn = document.createElement('button');
        shareBtn.className = 'util-btn share-btn';
        shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> Chia sẻ';
        shareBtn.title = 'Sao chép liên kết trang';
        
        shareBtn.addEventListener('click', () => {
            const url = window.location.href;
            navigator.clipboard.writeText(url).then(() => {
                this.showNotification('✓ Đã sao chép liên kết!', 'success');
            }).catch(() => {
                this.showNotification('✗ Không thể sao chép liên kết', 'error');
            });
        });

        const utilities = this.getUtilitiesContainer();
        utilities.appendChild(shareBtn);
    }

    /**
     * Thêm điều khiển kích thước font
     */
    addFontSizeControl() {
        const container = this.getUtilitiesContainer();
        
        const sizeControl = document.createElement('div');
        sizeControl.className = 'font-size-control';
        sizeControl.innerHTML = `
            <button class="size-btn" id="decreaseFont" title="Giảm kích thước chữ">
                <i class="fas fa-minus"></i>
            </button>
            <span class="size-display" id="fontSizeDisplay">100%</span>
            <button class="size-btn" id="increaseFont" title="Tăng kích thước chữ">
                <i class="fas fa-plus"></i>
            </button>
        `;
        
        container.appendChild(sizeControl);

        let currentSize = 100;
        const contentBody = document.querySelector('.content-body');
        const sizeDisplay = document.getElementById('fontSizeDisplay');

        document.getElementById('decreaseFont').addEventListener('click', () => {
            if (currentSize > 80) {
                currentSize -= 10;
                contentBody.style.fontSize = (currentSize / 100) + 'rem';
                sizeDisplay.textContent = currentSize + '%';
                localStorage.setItem('termsPolicyFontSize', currentSize);
            }
        });

        document.getElementById('increaseFont').addEventListener('click', () => {
            if (currentSize < 150) {
                currentSize += 10;
                contentBody.style.fontSize = (currentSize / 100) + 'rem';
                sizeDisplay.textContent = currentSize + '%';
                localStorage.setItem('termsPolicyFontSize', currentSize);
            }
        });

        // Khôi phục kích thước đã lưu
        const savedSize = localStorage.getItem('termsPolicyFontSize');
        if (savedSize) {
            currentSize = parseInt(savedSize);
            contentBody.style.fontSize = (currentSize / 100) + 'rem';
            sizeDisplay.textContent = currentSize + '%';
        }
    }

    /**
     * Lấy container cho tiện ích
     */
    getUtilitiesContainer() {
        let container = document.querySelector('.page-utilities');
        
        if (!container) {
            container = document.createElement('div');
            container.className = 'page-utilities';
            document.body.appendChild(container);

            // Thêm CSS
            const style = document.createElement('style');
            style.textContent = `
                .page-utilities {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    z-index: 998;
                }

                .util-btn, .size-btn {
                    background-color: var(--primary-color, #6366f1);
                    color: white;
                    border: none;
                    padding: 10px 14px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    white-space: nowrap;
                }

                .util-btn:hover, .size-btn:hover {
                    background-color: var(--secondary-color, #ec4899);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .font-size-control {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background-color: var(--primary-color, #6366f1);
                    padding: 8px;
                    border-radius: 6px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }

                .size-display {
                    color: white;
                    font-weight: 600;
                    font-size: 12px;
                    min-width: 40px;
                    text-align: center;
                }

                .size-btn {
                    padding: 6px 10px;
                    background-color: rgba(255, 255, 255, 0.2);
                    color: white;
                }

                .size-btn:hover {
                    background-color: rgba(255, 255, 255, 0.3);
                }

                @media (max-width: 768px) {
                    .page-utilities {
                        top: auto;
                        bottom: 100px;
                        right: 10px;
                        flex-direction: row;
                        gap: 5px;
                    }

                    .util-btn, .size-btn {
                        padding: 8px 10px;
                        font-size: 12px;
                    }

                    .util-btn span, .size-display {
                        display: none;
                    }

                    .util-btn i, .size-btn i {
                        margin: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        return container;
    }

    /**
     * Thiết lập khả năng tiếp cận (Accessibility)
     */
    setupAccessibility() {
        // Thêm skip-to-content link
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-to-content';
        skipLink.textContent = 'Nhảy đến nội dung chính';
        document.body.insertBefore(skipLink, document.body.firstChild);

        // Đánh dấu content chính
        const mainContent = document.querySelector('.content-body');
        if (mainContent) {
            mainContent.id = 'main-content';
        }

        // Thêm CSS skip link
        const style = document.createElement('style');
        style.textContent = `
            .skip-to-content {
                position: absolute;
                top: -40px;
                left: 0;
                background: #6366f1;
                color: white;
                padding: 8px 16px;
                text-decoration: none;
                z-index: 100;
                border-radius: 0 0 4px 0;
            }

            .skip-to-content:focus {
                top: 0;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Thiết lập tìm kiếm nội dung
     */
    setupSearch() {
        // Tìm kiếm bằng Ctrl+F (trình duyệt hỗ trợ sẵn)
        // Có thể thêm tìm kiếm custom ở đây nếu cần
    }

    /**
     * Hiển thị thông báo
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 14px 20px;
                border-radius: 6px;
                color: white;
                font-weight: 500;
                font-size: 14px;
                z-index: 9999;
                animation: notificationSlide 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            .notification-success {
                background-color: #10b981;
            }

            .notification-error {
                background-color: #ef4444;
            }

            .notification-info {
                background-color: #3b82f6;
            }

            @keyframes notificationSlide {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        
        if (!document.querySelector('style[data-notification]')) {
            style.setAttribute('data-notification', 'true');
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'notificationSlide 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Khởi tạo khi trang được tải
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new TermsPolicyPageHelper();
    });
} else {
    new TermsPolicyPageHelper();
}
