/**
 * ==================== INTRO ANIMATION CONFIG ====================
 * File: intro-animation-config.js
 * Purpose: Centralized configuration for intro animation
 * ================================================================
 */

const INTRO_ANIMATION_CONFIG = {
  // ==================== TIMING ====================
  timing: {
    duration: 4000,              // Tổng thời gian animation (ms)
    logoDelay: 0.3,              // Delay logo animation (s)
    titleDelay: 0.5,             // Delay title (s)
    subtitleDelay: 0.7,          // Delay subtitle (s)
    descriptionDelay: 0.9,       // Delay description (s)
    progressDelay: 1.2,          // Delay progress bar (s)
    exitDuration: 800,           // Exit animation duration (ms)
    gradientAnimationDuration: 15, // Background gradient animation (s)
  },

  // ==================== COLORS ====================
  colors: {
    gradient: {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      tertiary: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      quaternary: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      quinary: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
    background: ['#ee7752', '#e73c7e', '#23a6d5', '#23d5ab'],
    blob: [
      'rgba(255, 102, 158, 0.6)',
      'rgba(102, 126, 234, 0.6)',
      'rgba(34, 213, 172, 0.6)',
    ],
    particle: 'rgba(255, 255, 255, 0.8)',
    sparkle: '#fff',
  },

  // ==================== PARTICLES ====================
  particles: {
    count: 15,                   // Số lượng particles
    size: 8,                     // Kích thước particle (px)
    minDuration: 3,              // Min animation duration (s)
    maxDuration: 5,              // Max animation duration (s)
  },

  // ==================== SPARKLES ====================
  sparkles: {
    count: 20,                   // Số lượng sparkles
    size: 4,                     // Kích thước sparkle (px)
    minDuration: 1.5,            // Min animation duration (s)
    maxDuration: 3,              // Max animation duration (s)
  },

  // ==================== BLOBS ====================
  blobs: {
    count: 3,                    // Số lượng blob
    sizes: [300, 250, 200],      // Kích thước mỗi blob (px)
    minDuration: 8,              // Min animation duration (s)
    maxDuration: 10,             // Max animation duration (s)
  },

  // ==================== TEXT ====================
  text: {
    title: 'Chào mừng bạn! 🎓',
    subtitle: 'Hành trình học tập mới bắt đầu',
    description: 'Khám phá thế giới tri thức không giới hạn',
    progressText: 'Đang tải...',
  },

  // ==================== LOGO ====================
  logo: {
    src: 'assets/images/logo/logo-3.png',
    alt: 'TutorMis Logo',
    size: 120,                   // Desktop size (px)
    sizeTablet: 90,              // Tablet size (px)
    sizeMobile: 80,              // Mobile size (px)
  },

  // ==================== RESPONSIVE ====================
  responsive: {
    tablet: 768,                 // Breakpoint for tablet
    mobile: 480,                 // Breakpoint for mobile
  },

  // ==================== EFFECTS ====================
  effects: {
    enableParticles: true,
    enableSparkles: true,
    enableBlobs: true,
    enableGlow: true,
    enableGradient: true,
  },

  // ==================== BEHAVIOR ====================
  behavior: {
    autoStart: true,             // Auto start when DOM ready
    skipOnMobile: false,         // Skip on mobile devices
    closeOnClick: false,         // Close when click overlay
    showProgressBar: true,       // Show progress bar
    showLoadingDots: true,       // Show loading dots
  },

  // ==================== CALLBACKS ====================
  callbacks: {
    onInit: () => console.log('Intro animation initialized'),
    onStart: () => console.log('Intro animation started'),
    onProgress: (progress) => console.log(`Progress: ${progress}%`),
    onComplete: () => console.log('Intro animation completed'),
    onExit: () => console.log('Intro animation exiting'),
  },
};

/**
 * ==================== PRESET THEMES ====================
 */

const INTRO_THEMES = {
  // Default theme
  default: INTRO_ANIMATION_CONFIG,

  // Dark theme
  dark: {
    ...INTRO_ANIMATION_CONFIG,
    colors: {
      ...INTRO_ANIMATION_CONFIG.colors,
      background: ['#1a1a2e', '#16213e', '#0f3460', '#533483'],
    },
  },

  // Light theme
  light: {
    ...INTRO_ANIMATION_CONFIG,
    colors: {
      ...INTRO_ANIMATION_CONFIG.colors,
      background: ['#fff5e1', '#ffe0b2', '#ffd54f', '#ffca28'],
    },
  },

  // Ocean theme
  ocean: {
    ...INTRO_ANIMATION_CONFIG,
    colors: {
      ...INTRO_ANIMATION_CONFIG.colors,
      background: ['#001a4d', '#003d7a', '#0066cc', '#0080ff'],
    },
  },

  // Forest theme
  forest: {
    ...INTRO_ANIMATION_CONFIG,
    colors: {
      ...INTRO_ANIMATION_CONFIG.colors,
      background: ['#1b4332', '#2d6a4f', '#40916c', '#52b788'],
    },
  },

  // Sunset theme
  sunset: {
    ...INTRO_ANIMATION_CONFIG,
    colors: {
      ...INTRO_ANIMATION_CONFIG.colors,
      background: ['#ff6b35', '#f7931e', '#fdb833', '#fdc830'],
    },
  },

  // Purple theme
  purple: {
    ...INTRO_ANIMATION_CONFIG,
    colors: {
      ...INTRO_ANIMATION_CONFIG.colors,
      background: ['#5a189a', '#7209b7', '#b5179e', '#f72585'],
    },
  },

  // Minimal theme (less effects)
  minimal: {
    ...INTRO_ANIMATION_CONFIG,
    timing: {
      ...INTRO_ANIMATION_CONFIG.timing,
      duration: 2000,
    },
    particles: {
      ...INTRO_ANIMATION_CONFIG.particles,
      count: 5,
    },
    sparkles: {
      ...INTRO_ANIMATION_CONFIG.sparkles,
      count: 10,
    },
    effects: {
      enableParticles: true,
      enableSparkles: true,
      enableBlobs: false,
      enableGlow: true,
      enableGradient: true,
    },
  },

  // Full effect theme (maximum effects)
  full: {
    ...INTRO_ANIMATION_CONFIG,
    particles: {
      ...INTRO_ANIMATION_CONFIG.particles,
      count: 30,
    },
    sparkles: {
      ...INTRO_ANIMATION_CONFIG.sparkles,
      count: 40,
    },
    blobs: {
      ...INTRO_ANIMATION_CONFIG.blobs,
      count: 5,
    },
  },
};

/**
 * ==================== UTILITY FUNCTIONS ====================
 */

/**
 * Get configuration with optional overrides
 * @param {String} theme - Theme name or 'default'
 * @param {Object} overrides - Config overrides
 * @returns {Object} Merged configuration
 */
function getIntroConfig(theme = 'default', overrides = {}) {
  const baseConfig = INTRO_THEMES[theme] || INTRO_ANIMATION_CONFIG;
  return { ...baseConfig, ...overrides };
}

/**
 * Update global configuration
 * @param {Object} config - New configuration
 */
function updateIntroConfig(config) {
  Object.assign(INTRO_ANIMATION_CONFIG, config);
}

/**
 * Validate configuration
 * @param {Object} config - Configuration to validate
 * @returns {Boolean} Is valid
 */
function validateIntroConfig(config) {
  const required = ['timing', 'colors', 'text', 'logo'];
  return required.every(key => key in config);
}

/**
 * Create custom theme
 * @param {String} name - Theme name
 * @param {Object} config - Theme configuration
 */
function createIntroTheme(name, config) {
  if (validateIntroConfig(config)) {
    INTRO_THEMES[name] = config;
    return true;
  }
  console.error('Invalid theme configuration');
  return false;
}

/**
 * Merge configurations (deep merge)
 * @param {Object} target - Target config
 * @param {Object} source - Source config to merge
 * @returns {Object} Merged config
 */
function mergeIntroConfig(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      result[key] = mergeIntroConfig(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    INTRO_ANIMATION_CONFIG,
    INTRO_THEMES,
    getIntroConfig,
    updateIntroConfig,
    validateIntroConfig,
    createIntroTheme,
    mergeIntroConfig,
  };
}
