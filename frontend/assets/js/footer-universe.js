/**
 * Footer Universe Background Animation
 * Creates a dynamic starfield with animated particles, nebulae, and shooting stars
 */

class FooterUniverse {
  constructor() {
    this.footer = document.querySelector('.footer');
    this.starsContainer = null;
    this.particleContainer = null;
    this.animationRunning = true;
    this.init();
  }

  init() {
    // Create containers if they don't exist
    if (!document.querySelector('.stars-container')) {
      this.createStarsContainer();
    }
    
    // Generate stars with more diverse distribution
    this.generateStars(180);
    
    // Add nebula effects
    this.addNebulas();
    
    // Add shooting stars with continuous generation
    this.addShootingStars();
    this.generateShootingStars();
    
    // Create floating particles
    this.createFloatingParticles();
    
    // Animate on scroll
    this.animateOnScroll();
    
    // Add interactive effects
    this.addInteractiveEffects();
  }

  createStarsContainer() {
    this.starsContainer = document.createElement('div');
    this.starsContainer.className = 'stars-container';
    this.footer.insertBefore(this.starsContainer, this.footer.firstChild);
  }

  generateStars(count) {
    if (!this.starsContainer) return;
    
    const starTypes = ['small', 'medium', 'large'];
    const starCounts = [
      Math.floor(count * 0.6),    // 60% small stars
      Math.floor(count * 0.3),    // 30% medium stars
      Math.floor(count * 0.1)     // 10% large stars
    ];

    starCounts.forEach((typeCount, typeIndex) => {
      for (let i = 0; i < typeCount; i++) {
        const star = document.createElement('div');
        star.className = `star ${starTypes[typeIndex]}`;
        
        // Random position with better distribution
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        
        // Varied animation duration for more natural twinkling
        const duration = 2 + Math.random() * 6;
        star.style.animationDuration = duration + 's';
        
        // Random animation delay
        const delay = Math.random() * 15;
        star.style.animationDelay = delay + 's';
        
        this.starsContainer.appendChild(star);
      }
    });
  }

  addNebulas() {
    const nebulas = ['nebula-1', 'nebula-2', 'nebula-3'];
    
    nebulas.forEach(nebula => {
      if (!document.querySelector('.' + nebula)) {
        const nebulaDom = document.createElement('div');
        nebulaDom.className = `nebula ${nebula}`;
        this.footer.insertBefore(nebulaDom, this.starsContainer);
      }
    });
  }

  addShootingStars() {
    if (!this.starsContainer) return;
    
    const shootingStarsContainer = document.createElement('div');
    shootingStarsContainer.style.position = 'absolute';
    shootingStarsContainer.style.top = '0';
    shootingStarsContainer.style.left = '0';
    shootingStarsContainer.style.width = '100%';
    shootingStarsContainer.style.height = '100%';
    shootingStarsContainer.style.zIndex = '2';
    shootingStarsContainer.className = 'shooting-stars-container';
    
    for (let i = 0; i < 3; i++) {
      const shootingStar = document.createElement('div');
      shootingStar.className = `shooting-star`;
      shootingStar.style.left = Math.random() * 100 + '%';
      shootingStar.style.top = Math.random() * 50 + '%';
      
      const duration = 3 + Math.random() * 2;
      const delay = Math.random() * 15;
      shootingStar.style.setProperty('--duration', duration + 's');
      shootingStar.style.setProperty('--delay', delay + 's');
      
      const rotation = Math.random() * 360;
      shootingStar.style.animation = `shoot ${duration}s linear infinite`;
      shootingStar.style.animationDelay = delay + 's';
      shootingStar.style.transform = `rotate(${rotation}deg)`;
      
      shootingStarsContainer.appendChild(shootingStar);
    }
    
    this.footer.insertBefore(shootingStarsContainer, this.starsContainer);
  }

  generateShootingStars() {
    // Continuously generate new shooting stars
    if (!this.animationRunning) return;
    
    const container = document.querySelector('.shooting-stars-container');
    if (!container) return;

    const generateNew = () => {
      if (this.animationRunning && container.parentNode) {
        const shootingStar = document.createElement('div');
        shootingStar.className = `shooting-star`;
        shootingStar.style.left = Math.random() * 100 + '%';
        shootingStar.style.top = Math.random() * 50 + '%';
        
        const duration = 3 + Math.random() * 2;
        shootingStar.style.animation = `shoot ${duration}s linear forwards`;
        
        const rotation = Math.random() * 360;
        shootingStar.style.transform = `rotate(${rotation}deg)`;
        
        container.appendChild(shootingStar);
        
        // Remove after animation completes
        setTimeout(() => {
          if (shootingStar.parentNode) {
            shootingStar.remove();
          }
        }, (duration + 1) * 1000);

        // Schedule next shooting star
        setTimeout(generateNew, 8000 + Math.random() * 12000);
      }
    };

    setTimeout(generateNew, 5000);
  }

  createFloatingParticles() {
    const particleContainer = document.createElement('div');
    particleContainer.style.position = 'absolute';
    particleContainer.style.top = '0';
    particleContainer.style.left = '0';
    particleContainer.style.width = '100%';
    particleContainer.style.height = '100%';
    particleContainer.style.overflow = 'hidden';
    particleContainer.style.pointerEvents = 'none';
    particleContainer.style.zIndex = '1';
    
    // Create 30-50 floating particles for richer effect
    const particleCount = 40 + Math.floor(Math.random() * 20);
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      const dotSize = 1 + Math.random() * 4;
      const dotDiv = document.createElement('div');
      dotDiv.className = 'particle-dot';
      dotDiv.style.width = dotSize + 'px';
      dotDiv.style.height = dotSize + 'px';
      
      // Random starting position
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      
      // Varied animation duration
      const duration = 20 + Math.random() * 30;
      dotDiv.style.animationDuration = duration + 's';
      
      // Random animation delay
      const delay = Math.random() * 40;
      dotDiv.style.animationDelay = delay + 's';
      
      // Random direction with more variety
      const angleX = (Math.random() - 0.5) * 150;
      const angleY = -80 - Math.random() * 120;
      dotDiv.style.setProperty('--x', angleX + 'px');
      dotDiv.style.setProperty('--y', angleY + 'px');
      
      particle.appendChild(dotDiv);
      particleContainer.appendChild(particle);
    }
    
    this.footer.insertBefore(particleContainer, this.starsContainer);
  }

  animateOnScroll() {
    // Add parallax effect on scroll with smooth transitions
    if (this.starsContainer) {
      window.addEventListener('scroll', () => {
        const scrollPos = window.scrollY;
        const footerTop = this.footer.offsetTop;
        
        if (scrollPos > footerTop - window.innerHeight) {
          const parallax = (scrollPos - footerTop + window.innerHeight) * 0.3;
          this.starsContainer.style.transform = `translateY(${parallax}px)`;
        }
      }, { passive: true });
    }
  }

  addInteractiveEffects() {
    // Add hover effects to footer sections
    const sections = this.footer.querySelectorAll('.footer__section');
    
    sections.forEach((section, index) => {
      section.addEventListener('mouseenter', () => {
        section.style.transform = 'scale(1.02) translateY(-5px)';
        section.style.transition = 'all 0.3s ease';
      });

      section.addEventListener('mouseleave', () => {
        section.style.transform = 'scale(1) translateY(0)';
      });
    });
  }

  // Method to add more stars dynamically
  addMoreStars(count) {
    if (!this.starsContainer) return;
    
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      const types = ['small', 'medium', 'large'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      star.className = `star ${type}`;
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      
      const duration = 2 + Math.random() * 6;
      star.style.animationDuration = duration + 's';
      
      const delay = Math.random() * 15;
      star.style.animationDelay = delay + 's';
      
      this.starsContainer.appendChild(star);
    }
  }

  // Method to change background intensity
  setIntensity(level) {
    // level: 'low', 'medium', 'high'
    if (!this.starsContainer) return;
    
    const stars = this.starsContainer.querySelectorAll('.star');
    let opacityModifier = 1;
    
    switch(level) {
      case 'low':
        opacityModifier = 0.5;
        break;
      case 'medium':
        opacityModifier = 0.8;
        break;
      case 'high':
        opacityModifier = 1.2;
        break;
    }
    
    stars.forEach(star => {
      const computedStyle = window.getComputedStyle(star);
      const originalOpacity = computedStyle.opacity;
      star.style.opacity = (parseFloat(originalOpacity) * opacityModifier).toString();
    });
  }

  // Method to pause/resume animations
  toggleAnimation() {
    this.animationRunning = !this.animationRunning;
    if (this.footer) {
      this.footer.style.animationPlayState = this.animationRunning ? 'running' : 'paused';
    }
  }

  // Method to destroy and clean up
  destroy() {
    this.animationRunning = false;
    if (this.starsContainer && this.starsContainer.parentNode) {
      this.starsContainer.remove();
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new FooterUniverse();
  });
} else {
  new FooterUniverse();
}
