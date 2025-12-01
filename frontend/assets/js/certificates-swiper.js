/**
 * ============================================
 * CERTIFICATES CAROUSEL - Swiper.js Configuration
 * ============================================
 * 
 * Carousel hiển thị chứng chỉ với hiệu ứng 3D Coverflow:
 * - Autoplay 3 giây/slide
 * - Vòng lặp vô hạn
 * - Hiệu ứng Glassmorphism + 3D
 * - Responsive
 */

let certificatesSwiper = null;

// Khởi tạo Swiper cho certificates
function initCertificatesSwiper() {
    // Kiểm tra xem Swiper library đã được load chưa
    if (typeof Swiper === 'undefined') {
        console.error('Swiper library is not loaded');
        return;
    }

    const swiperContainer = document.querySelector('.certificates__swiper');
    if (!swiperContainer) {
        console.error('Certificates swiper container not found');
        return;
    }

    certificatesSwiper = new Swiper('.certificates__swiper', {
        // ============ Cấu hình SLIDE ============
        slidesPerView: 'auto',  // Tự động tính toán số slides
        centeredSlides: true,   // Căn giữa slide active
        loop: true,             // Vòng lặp vô hạn
        
        // ============ Cấu hình AUTOPLAY ============
        autoplay: {
            delay: 3000,        // 3 giây/slide
            disableOnInteraction: false,
            pauseOnMouseEnter: true
        },

        // ============ Cấu hình TRANSITION ============
        speed: 1000,            // Tốc độ chuyển động mượt mà hơn
        effect: 'coverflow',    // Hiệu ứng 3D Coverflow

        // ============ Cấu hình COVERFLOW ============
        coverflowEffect: {
            rotate: 0,          // Không xoay để giữ text dễ đọc
            stretch: 0,         // Không kéo giãn
            depth: 150,         // Độ sâu 3D
            modifier: 1.5,      // Mức độ ảnh hưởng của hiệu ứng
            slideShadows: false // Tắt shadow mặc định để dùng custom CSS shadow
        },

        // ============ Cấu hình RESPONSIVE ============
        breakpoints: {
            // Mobile
            320: {
                slidesPerView: 1.2, // Hiển thị 1 phần slide kế bên
                spaceBetween: 20,
                coverflowEffect: {
                    depth: 100,
                    modifier: 1
                }
            },
            // Tablet
            768: {
                slidesPerView: 'auto',
                spaceBetween: 30,
                coverflowEffect: {
                    depth: 150,
                    modifier: 1.2
                }
            },
            // Desktop
            1024: {
                slidesPerView: 3,
                spaceBetween: 40,
                coverflowEffect: {
                    depth: 200,
                    modifier: 1.5
                }
            }
        },

        // ============ Cấu hình PAGINATION ============
        pagination: {
            el: '.certificates__swiper .swiper-pagination',
            type: 'bullets',
            clickable: true,
            dynamicBullets: true,
        },

        // ============ Cấu hình MOUSE ============
        grabCursor: true,
        mousewheel: {
            forceToAxis: true,
        },
        keyboard: {
            enabled: true,
        },
    });

    // ============ CUSTOM EVENT HANDLERS ============
    setupCustomNavigationHandlers();
}

/**
 * Setup custom handlers cho navigation buttons
 */
function setupCustomNavigationHandlers() {
    // Xử lý CUSTOM buttons
    const customPrevBtn = document.querySelector('.custom-swiper-button-prev');
    const customNextBtn = document.querySelector('.custom-swiper-button-next');

    if (customPrevBtn) {
        customPrevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (certificatesSwiper) certificatesSwiper.slidePrev();
        });
    }

    if (customNextBtn) {
        customNextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (certificatesSwiper) certificatesSwiper.slideNext();
        });
    }
}

/**
 * Hàm dừng autoplay khi hover
 */
function pauseAutoplayOnHover() {
    const swiperContainer = document.querySelector('.certificates__swiper');
    if (!swiperContainer || !certificatesSwiper) return;

    swiperContainer.addEventListener('mouseenter', () => {
        if (certificatesSwiper.autoplay) {
            certificatesSwiper.autoplay.stop();
        }
    });

    swiperContainer.addEventListener('mouseleave', () => {
        if (certificatesSwiper.autoplay) {
            certificatesSwiper.autoplay.start();
        }
    });
}

// Khởi tạo khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    const checkSwiperLoaded = setInterval(() => {
        if (typeof Swiper !== 'undefined') {
            clearInterval(checkSwiperLoaded);
            initCertificatesSwiper();
            pauseAutoplayOnHover();
            console.log('✓ Certificates Swiper initialized with Coverflow effect');
        }
    }, 100);

    setTimeout(() => {
        if (!certificatesSwiper) {
            console.warn('⚠ Swiper library did not load within 5 seconds');
        }
    }, 5000);
});

// Re-initialize nếu Swiper được load sau
window.addEventListener('load', () => {
    if (typeof Swiper !== 'undefined' && !certificatesSwiper) {
        initCertificatesSwiper();
        pauseAutoplayOnHover();
    }
});

