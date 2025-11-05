/**
 * ============================================
 * CERTIFICATES CAROUSEL - Swiper.js Configuration
 * ============================================
 * 
 * Carousel hiển thị 6 chứng chỉ với hiệu ứng:
 * - Autoplay 3 giây/slide
 * - Vòng lặp vô hạn
 * - Scale và opacity cho cards
 * - Responsive (Desktop/Tablet/Mobile)
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
        spaceBetween: 20,       // Khoảng cách giữa các slides (px)
        centeredSlides: true,   // Căn giữa slide active
        loop: true,             // Vòng lặp vô hạn
        
        // ============ Cấu hình AUTOPLAY ============
        autoplay: {
            delay: 3000,        // 3 giây/slide (milli-giây)
            disableOnInteraction: false, // Tiếp tục autoplay sau khi người dùng tương tác
            pauseOnMouseEnter: true // Tạm dừng khi hover
        },

        // ============ Cấu hình TRANSITION ============
        speed: 800,             // Tốc độ chuyển động (milli-giây)
        effect: 'slide',        // Hiệu ứng: 'slide', 'fade', 'coverflow'

        // ============ Cấu hình RESPONSIVE ============
        breakpoints: {
            // Mobile (<768px): 1 card
            320: {
                slidesPerView: 1,
                spaceBetween: 10
            },
            // Tablet (768px - 1024px): 2 cards
            768: {
                slidesPerView: 2,
                spaceBetween: 15
            },
            // Desktop (>1024px): 3 cards
            1024: {
                slidesPerView: 3,
                spaceBetween: 20
            }
        },

        // ============ Cấu hình NAVIGATION ============
        // Sử dụng custom buttons (không dùng built-in Swiper buttons)
        // navigation: {
        //     nextEl: '.certificates__swiper .swiper-button-next',
        //     prevEl: '.certificates__swiper .swiper-button-prev',
        // },

        // ============ Cấu hình PAGINATION ============
        pagination: {
            el: '.certificates__swiper .swiper-pagination',
            type: 'bullets',           // Kiểu: 'bullets', 'fraction', 'progressbar'
            clickable: true,           // Cho phép click vào dots
            dynamicBullets: true,      // Hiển thị động các dots
            dynamicMainBullets: 3      // Số lượng dots chính
        },

        // ============ Cấu hình EFFECTS ============
        on: {
            // Khi slide thay đổi
            slideChange: function() {
                updateCertificateScale(this);
            },
            // Khi Swiper được khởi tạo
            init: function() {
                updateCertificateScale(this);
            },
            // Khi hover (tạm dừng autoplay)
            touchStart: function() {
                // Autoplay sẽ được quản lý bởi Swiper
            }
        },

        // ============ Cấu hình MOUSE ============
        grabCursor: true,       // Đổi cursor thành grab khi hover
        touchRatio: 1,          // Độ nhạy cảm touch
        longSwipesRatio: 0.5   // Tỷ lệ swipe tối thiểu
    });

    // ============ CUSTOM EVENT HANDLERS ============
    setupCustomNavigationHandlers();
}

/**
 * Update scale và opacity cho các certificate cards
 * Center slide: scale 1.1-1.15, opacity 100%
 * Side slides: scale 0.85-0.9, opacity 60-70%
 */
function updateCertificateScale(swiper) {
    const slides = swiper.slides;
    
    slides.forEach((slide, index) => {
        const card = slide.querySelector('.certificate__card');
        if (!card) return;

        // Xác định vị trí slide
        if (slide.classList.contains('swiper-slide-active')) {
            // Active slide (center)
            slide.style.transform = 'scale(1.12)';
            card.style.opacity = '1';
            card.style.boxShadow = '0 12px 40px rgba(30, 64, 175, 0.25)';
            card.style.zIndex = '10';
        } else if (
            slide.classList.contains('swiper-slide-prev') ||
            slide.classList.contains('swiper-slide-next')
        ) {
            // Adjacent slides
            slide.style.transform = 'scale(0.88)';
            card.style.opacity = '0.65';
            card.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
            card.style.zIndex = '5';
        } else {
            // Other slides
            slide.style.transform = 'scale(0.85)';
            card.style.opacity = '0.5';
            card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
            card.style.zIndex = '1';
        }
    });
}

/**
 * Setup custom handlers cho navigation buttons
 * Handles both custom buttons (.custom-swiper-button-prev/next)
 * và built-in Swiper buttons (.swiper-button-prev/next)
 */
function setupCustomNavigationHandlers() {
    // Xử lý CUSTOM buttons (nút với hình ảnh)
    const customPrevBtn = document.querySelector('.custom-swiper-button-prev');
    const customNextBtn = document.querySelector('.custom-swiper-button-next');

    if (customPrevBtn) {
        customPrevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (certificatesSwiper) {
                certificatesSwiper.slidePrev();
            }
        });
    }

    if (customNextBtn) {
        customNextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (certificatesSwiper) {
                certificatesSwiper.slideNext();
            }
        });
    }

    // Xử lý BUILT-IN Swiper buttons (nếu có)
    const swiper_prevBtn = document.querySelector('.certificates__swiper .swiper-button-prev');
    const swiper_nextBtn = document.querySelector('.certificates__swiper .swiper-button-next');

    if (swiper_prevBtn) {
        swiper_prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (certificatesSwiper) {
                certificatesSwiper.slidePrev();
            }
        });
    }

    if (swiper_nextBtn) {
        swiper_nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (certificatesSwiper) {
                certificatesSwiper.slideNext();
            }
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
    // Chờ Swiper library load
    const checkSwiperLoaded = setInterval(() => {
        if (typeof Swiper !== 'undefined') {
            clearInterval(checkSwiperLoaded);
            initCertificatesSwiper();
            pauseAutoplayOnHover();
            console.log('✓ Certificates Swiper initialized successfully');
        }
    }, 100);

    // Timeout sau 5 giây
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

/**
 * ============================================
 * CONFIGURATION PARAMETERS EXPLANATION
 * ============================================
 * 
 * slidesPerView:
 *   - 'auto' cho phép Swiper tự động tính chiều rộng của slides
 *   - Kết hợp với breakpoints để responsive
 * 
 * spaceBetween:
 *   - Khoảng cách giữa các slides (pixel)
 *   - Giúp cards không bị sát nhau
 * 
 * centeredSlides: true
 *   - Đặt slide active ở center
 *   - Giúp hiệu ứng scale đều đặn
 * 
 * loop: true
 *   - Tạo vòng lặp vô hạn
 *   - Cuối cùng sẽ quay lại card đầu tiên
 * 
 * autoplay.delay: 3000
 *   - 3000 milli-giây = 3 giây
 *   - Thời gian chờ trước khi chuyển slide
 * 
 * autoplay.disableOnInteraction: false
 *   - Autoplay tiếp tục sau khi người dùng click/swipe
 *   - Không bị reset
 * 
 * speed: 800
 *   - Tốc độ chuyển động (milli-giây)
 *   - Càng nhỏ = càng nhanh
 * 
 * grabCursor: true
 *   - Đổi cursor thành grab khi hover
 *   - Tăng UX
 * 
 * breakpoints:
 *   - 320: Mobile (1 card)
 *   - 768: Tablet (2 cards)
 *   - 1024: Desktop (3 cards)
 * 
 * ============================================
 */
