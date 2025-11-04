/**
 * ==================== INTRO ANIMATION SCRIPT ====================
 * File: intro-animation.js
 * Purpose: Handle smooth, professional intro animation after login
 * Features:
 *  - Gradient animated background
 *  - Floating particles and blobs
 *  - Animated text with stagger effect
 *  - Progress bar animation
 *  - Sparkle effects
 *  - Smooth transition to dashboard
 * Version: 2.0 - Fixed redirect issue
 * ================================================================
 */

class IntroAnimation {
  constructor(options = {}) {
    this.duration = options.duration || 4000; // 4 seconds
    this.onComplete = options.onComplete || (() => {});
    this.containerElement = null;
    this.isAnimating = false;
    this.autoStart = options.autoStart !== false;
    this.redirectTimer = null;
  }

  /**
   * Initialize and display the intro animation
   */
  init() {
    if (this.isAnimating) return;

    // Ẩn toàn bộ nội dung trang hiện tại ngay lập tức
    this.hidePageContent();
    
    this.createAnimationDOM();
    this.createParticles();
    this.createSparkles();
    document.body.classList.add('intro-active');

    this.isAnimating = true;

    // Set redirect timer - redirect TRƯỚC khi animation kết thúc
    this.redirectTimer = setTimeout(() => {
      this.performRedirect();
    }, this.duration - 300); // Redirect 300ms trước khi animation kết thúc
  }

  /**
   * Hide page content immediately
   */
  hidePageContent() {
    // Tạo style để ẩn tất cả nội dung trang
    const hideStyle = document.createElement('style');
    hideStyle.id = 'intro-hide-content';
    hideStyle.innerHTML = `
      body > *:not(.intro-animation-container) {
        display: none !important;
      }
      body {
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(hideStyle);
  }

  /**
   * Create the main DOM structure for intro animation
   */
  createAnimationDOM() {
    const container = document.createElement('div');
    container.className = 'intro-animation-container';
    container.innerHTML = `
      <div class="intro-animated-background">
        <div class="intro-blob intro-blob-1"></div>
        <div class="intro-blob intro-blob-2"></div>
        <div class="intro-blob intro-blob-3"></div>
      </div>
      <div class="intro-particles" id="particlesContainer"></div>
      <div class="intro-sparkles" id="sparklesContainer"></div>
      
      <div class="intro-content-wrapper">
        <div class="intro-logo-container">
          <img src="assets/images/logo/logo-3.png" alt="TutorMis Logo" class="intro-logo">
        </div>
        
        <h1 class="intro-title intro-glow">
          Chào mừng bạn! 🎓
        </h1>
        
        <p class="intro-subtitle">
          Hành trình học tập mới bắt đầu
        </p>
        
        <p class="intro-description">
          Khám phá thế giới tri thức không giới hạn
        </p>
        
        <div class="intro-progress-container">
          <div class="intro-progress-bar">
            <div class="intro-progress-fill"></div>
          </div>
          <p class="intro-progress-text">Đang tải...</p>
        </div>
        
        <div class="intro-loading-dots">
          <div class="intro-dot"></div>
          <div class="intro-dot"></div>
          <div class="intro-dot"></div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    this.containerElement = container;
  }

  /**
   * Create floating particles
   */
  createParticles() {
    const container = document.getElementById('particlesContainer');
    if (!container) return;

    const particleCount = 15;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'intro-particle';

      const randomX = Math.random() * 100;
      const randomY = Math.random() * 100;
      const randomDelay = Math.random() * 2;
      const randomDuration = 3 + Math.random() * 2;

      particle.style.left = randomX + '%';
      particle.style.top = randomY + '%';
      particle.style.animationDelay = randomDelay + 's';
      particle.style.animationDuration = randomDuration + 's';

      container.appendChild(particle);
    }
  }

  /**
   * Create sparkle effects
   */
  createSparkles() {
    const container = document.getElementById('sparklesContainer');
    if (!container) return;

    const sparkleCount = 20;
    for (let i = 0; i < sparkleCount; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'intro-sparkle';

      const randomX = Math.random() * 100;
      const randomY = Math.random() * 100;
      const randomDelay = Math.random() * 2;
      const randomDuration = 1.5 + Math.random() * 1.5;

      sparkle.style.left = randomX + '%';
      sparkle.style.top = randomY + '%';
      sparkle.style.animationDelay = randomDelay + 's';
      sparkle.style.animationDuration = randomDuration + 's';

      container.appendChild(sparkle);
    }
  }

  /**
   * Perform redirect - called before animation ends
   */
  performRedirect() {
    console.log('[IntroAnimation] Starting redirect...');
    
    // Fade to white trước khi redirect
    if (this.containerElement) {
      const bgElement = this.containerElement.querySelector('.intro-animated-background');
      if (bgElement) {
        bgElement.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
        bgElement.style.opacity = '0.3';
        bgElement.style.filter = 'brightness(2)';
      }
    }

    // Thực hiện callback redirect NGAY LẬP TỨC
    setTimeout(() => {
      console.log('[IntroAnimation] Executing redirect callback...');
      this.onComplete();
      // Không cleanup - để browser tự xử lý khi redirect
    }, 200);
  }

  /**
   * Cleanup DOM and state
   */
  cleanup() {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
      this.redirectTimer = null;
    }
    
    if (this.containerElement) {
      this.containerElement.remove();
      this.containerElement = null;
    }

    // Remove hide content style
    const hideStyle = document.getElementById('intro-hide-content');
    if (hideStyle) {
      hideStyle.remove();
    }

    document.body.classList.remove('intro-active');
    this.isAnimating = false;
  }

  /**
   * Stop the animation prematurely
   */
  stop() {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
    }
    this.cleanup();
    this.onComplete();
  }

  /**
   * Restart the animation
   */
  restart() {
    if (this.containerElement) {
      this.cleanup();
    }
    this.init();
  }

  /**
   * Change duration
   */
  setDuration(ms) {
    this.duration = ms;
  }
}

/**
 * ==================== GLOBAL HELPERS ====================
 */

/**
 * Show intro animation after successful login
 * @param {Function} onComplete - Callback when animation completes
 * @param {Number} duration - Animation duration in milliseconds (default: 4000)
 */
function showIntroAnimation(onComplete, duration = 4000) {
  const intro = new IntroAnimation({
    duration: duration,
    onComplete: onComplete || (() => {
      // Default: Navigate to dashboard
      const userRole = localStorage.getItem('userRole') || 'student';
      window.location.href = `/${userRole}-dashboard`;
    })
  });

  intro.init();
  return intro;
}

/**
 * Quick intro with custom message
 */
function quickIntro(message = 'Đang tải...') {
  const intro = new IntroAnimation({
    duration: 3000,
    onComplete: () => window.location.reload()
  });

  intro.init();

  // Optional: Update message
  const progressText = document.querySelector('.intro-progress-text');
  if (progressText) {
    progressText.textContent = message;
  }

  return intro;
}

/**
 * ==================== AUTO-INITIALIZATION ====================
 * Listen for successful login events
 */

// Event listener for login success
document.addEventListener('loginSuccess', (e) => {
  const { callback, duration } = e.detail || {};
  showIntroAnimation(callback, duration);
});

// Event listener for registration success
document.addEventListener('registrationSuccess', (e) => {
  const { callback, duration } = e.detail || {};
  showIntroAnimation(callback, duration);
});

/**
 * ==================== UTILITY FUNCTIONS ====================
 */

/**
 * Pause all animations
 */
function pauseIntroAnimations() {
  const style = document.createElement('style');
  style.id = 'intro-pause-style';
  style.innerHTML = `
    .intro-animation-container * {
      animation-play-state: paused !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Resume all animations
 */
function resumeIntroAnimations() {
  const style = document.getElementById('intro-pause-style');
  if (style) style.remove();
}

/**
 * Get animation status
 */
function getIntroAnimationStatus() {
  return document.querySelector('.intro-animation-container') !== null;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    IntroAnimation,
    showIntroAnimation,
    quickIntro,
    pauseIntroAnimations,
    resumeIntroAnimations,
    getIntroAnimationStatus
  };
}
