// ===== MAIN JAVASCRIPT =====

// Global variables - Expose to window for other scripts
window.API_BASE_URL = '/api';
const API_BASE_URL = window.API_BASE_URL;

// DOM elements
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarClose = document.getElementById('sidebar-close');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

// ===== SIDEBAR NAVIGATION =====
function openSidebar() {
  if (sidebar) {
    sidebar.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeSidebar() {
  if (sidebar) {
    sidebar.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Sidebar toggle button
if (sidebarToggle) {
  sidebarToggle.addEventListener('click', openSidebar);
}

// Sidebar close button
if (sidebarClose) {
  sidebarClose.addEventListener('click', closeSidebar);
}

// Close sidebar when clicking overlay
if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', closeSidebar);
}

// Close sidebar when clicking on nav links
document.querySelectorAll('.sidebar__link').forEach(link => {
  link.addEventListener('click', (e) => {
    // Add active state to clicked link
    document.querySelectorAll('.sidebar__link').forEach(l => l.classList.remove('active'));
    e.target.closest('.sidebar__link').classList.add('active');
    
    // Close sidebar after a short delay for smooth animation
    setTimeout(closeSidebar, 300);
  });
});

// Close sidebar with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sidebar && sidebar.classList.contains('active')) {
    closeSidebar();
  }
});

// ===== SMOOTH SCROLLING =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    // Ignore empty anchors or just '#'
    if (!href || href === '#') {
      return;
    }
    
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// ===== HEADER SCROLL EFFECT =====
window.addEventListener('scroll', () => {
  const header = document.querySelector('.header');
  if (header) {
    if (window.scrollY > 100) {
      header.style.background = 'rgba(255, 255, 255, 0.98)';
      header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    } else {
      header.style.background = 'rgba(255, 255, 255, 0.95)';
      header.style.boxShadow = 'none';
    }
  }
});

// ===== INTERSECTION OBSERVER FOR ANIMATIONS =====
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observe all sections for animation
document.querySelectorAll('section').forEach(section => {
  section.style.opacity = '0';
  section.style.transform = 'translateY(30px)';
  section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(section);
});

// ===== MODAL FUNCTIONS =====
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Focus first input
    const firstInput = modal.querySelector('input');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Reset form if exists
    const form = modal.querySelector('form');
    if (form) {
      form.reset();
      clearFormErrors(form);
    }
  }
}

function switchModal(currentModalId, targetModalId) {
  closeModal(currentModalId);
  setTimeout(() => showModal(targetModalId), 200);
}

function showLoginModal() {
  showModal('loginModal');
}

function showRegisterModal(role = null) {
  showModal('registerModal');
  if (role) {
    const roleInput = document.querySelector(`input[name="role"][value="${role}"]`);
    if (roleInput) {
      roleInput.checked = true;
    }
  }
}

function showSuccessModal(message, onClose = null) {
  document.getElementById('successMessage').textContent = message;
  showModal('successModal');
  
  if (onClose) {
    // Override the close button to call onClose
    const closeBtn = document.querySelector('#successModal .btn');
    const originalOnClick = closeBtn.onclick;
    closeBtn.onclick = () => {
      closeModal('successModal');
      if (onClose) onClose();
      // Restore original onclick if needed
    };
  }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal__overlay')) {
    const modal = e.target.closest('.modal');
    if (modal) {
      closeModal(modal.id);
    }
  }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const activeModal = document.querySelector('.modal.active');
    if (activeModal) {
      closeModal(activeModal.id);
    }
  }
});

// ===== UTILITY FUNCTIONS =====
function togglePassword(button) {
  const input = button.parentElement.querySelector('input');
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

function showFormError(form, field, message) {
  const formGroup = form.querySelector(`[name="${field}"]`).closest('.form__group');
  formGroup.classList.add('error');
  
  let errorElement = formGroup.querySelector('.form__error');
  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.className = 'form__error';
    formGroup.appendChild(errorElement);
  }
  
  errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
}

function clearFormErrors(form) {
  form.querySelectorAll('.form__group.error').forEach(group => {
    group.classList.remove('error');
  });
  form.querySelectorAll('.form__error').forEach(error => {
    error.remove();
  });
}

function setFormLoading(form, loading) {
  const submitButton = form.querySelector('button[type="submit"]');
  const inputs = form.querySelectorAll('input, button');
  
  if (loading) {
    form.classList.add('loading');
    submitButton.classList.add('btn--loading');
    inputs.forEach(input => input.disabled = true);
  } else {
    form.classList.remove('loading');
    submitButton.classList.remove('btn--loading');
    inputs.forEach(input => input.disabled = false);
  }
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.innerHTML = `
    <div class="notification__content">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    </div>
    <button class="notification__close" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => notification.classList.add('show'), 100);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// ===== API FUNCTIONS =====
async function apiRequest(endpoint, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  // Add auth token if available
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();
    
    if (!response.ok) {
      // Include validation errors in error message if available
      if (data.errors && Array.isArray(data.errors)) {
        const errorDetails = JSON.stringify({ errors: data.errors });
        throw new Error(data.message + errorDetails);
      }
      throw new Error(data.message || 'Something went wrong');
    }
    
    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

// ===== PASSWORD STRENGTH CHECKER =====
function checkPasswordStrength(password) {
  const strengthElement = document.getElementById('passwordStrength');
  if (!strengthElement) return;
  
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  
  strengthElement.className = 'password__strength';
  
  if (strength < 3) {
    strengthElement.classList.add('weak');
  } else if (strength < 5) {
    strengthElement.classList.add('medium');
  } else {
    strengthElement.classList.add('strong');
  }
  
  strengthElement.style.display = password.length > 0 ? 'block' : 'none';
}

// Add password strength checker
document.addEventListener('DOMContentLoaded', () => {
  const passwordInput = document.querySelector('input[name="password"]');
  if (passwordInput) {
    passwordInput.addEventListener('input', (e) => {
      checkPasswordStrength(e.target.value);
    });
  }
});

// ===== FORM VALIDATION =====
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  const phoneRegex = /^[0-9]{10,11}$/;
  return phoneRegex.test(phone);
}

function validatePassword(password) {
  return password.length >= 6 && 
         /[a-z]/.test(password) && 
         /[A-Z]/.test(password) && 
         /[0-9]/.test(password);
}

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎓 TutorMis Frontend Initialized');
  
  // Only validate and redirect on landing pages (not dashboard pages)
  const isDashboardPage = window.location.pathname.includes('/pages/');
  
  if (!isDashboardPage) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Validate token and redirect to dashboard
      validateSession();
    }
  }
});

async function validateSession() {
  try {
    const response = await apiRequest('/auth/me');
    if (response.success) {
      // Redirect to appropriate dashboard
      const role = response.data.user.role;
      window.location.href = `/pages/${role}/dashboard.html`;
    }
  } catch (error) {
    // Token invalid, remove it
    localStorage.removeItem('accessToken');
    console.error('Session validation failed:', error.message);
  }
}

// Typed.js effects - only run if Typed library is available
if (typeof Typed !== 'undefined') {
    // Tôi đang dùng thư viện Typed.js, yêu cầu viết hàm và tạo vòng lặp chữ cho hiệu tứng Typing effect cho feature__title trong section Features
    document.addEventListener('DOMContentLoaded', function() {
        var options = {
            strings: ["Tìm kiếm dễ dàng", "Tìm kiếm thông minh", "Kết nối nhanh chóng", "Lọc theo nhu cầu"],
            typeSpeed: 50,  // Tốc độ gõ chữ (ms)
            backSpeed: 25,  // Tốc độ xóa chữ (ms)
            backDelay: 1000, // Thời gian chờ trước khi xóa (ms)
            loop: true,      // Lặp lại vô hạn
            showCursor: false // Hiển thị con trỏ nhấp nháy
        };
        var typed = new Typed('.feature__title', options);
    });
  
    // Tôi đang dùng thư viện Typed.js, yêu cầu viết hàm và tạo vòng lặp chữ cho hiệu tứng Typing effect cho feature__title trong section Features
    document.addEventListener('DOMContentLoaded', function() {
        var options = {
            strings: ["Gia sư chất lượng","Gia sư tận tâm","Gia sư uy tín","Gia sư chuyên nghiệp"],
            typeSpeed: 50,  // Tốc độ gõ chữ (ms)
            backSpeed: 25,  // Tốc độ xóa chữ (ms)
            backDelay: 1000, // Thời gian chờ trước khi xóa (ms)
            loop: true,      // Lặp lại vô hạn
            showCursor: false // Hiển thị con trỏ nhấp nháy
        };
        var typed = new Typed('.feature__title_1', options);
    });

    // Tôi đang dùng thư viện Typed.js, yêu cầu viết hàm và tạo vòng lặp chữ cho hiệu tứng Typing effect cho feature__title trong section Features
    document.addEventListener('DOMContentLoaded', function() {
        var options = {
            strings: ["An toàn và bảo mật","Bảo vệ dữ liệu cá nhân","Hệ thống bảo mật tiên tiến","Cam kết bảo mật tuyệt đối"],
            typeSpeed: 50,  // Tốc độ gõ chữ (ms)
            backSpeed: 25,  // Tốc độ xóa chữ (ms)
            backDelay: 1000, // Thời gian chờ trước khi xóa (ms)
            loop: true,      // Lặp lại vô hạn
            showCursor: false // Hiển thị con trỏ nhấp nháy
        };
        var typed = new Typed('.feature__title_2', options);
    });

    // Tôi đang dùng thư viện Typed.js, yêu cầu viết hàm và tạo vòng lặp chữ cho hiệu tứng Typing effect cho feature__title trong section Features
    document.addEventListener('DOMContentLoaded', function() {
        var options = {
            strings: ["Hỗ trợ 24/7","Hỗ trợ mọi lúc mọi nơi","Đội ngũ hỗ trợ chuyên nghiệp","Luôn sẵn sàng giúp đỡ"],
            typeSpeed: 50,  // Tốc độ gõ chữ (ms)
            backSpeed: 25,  // Tốc độ xóa chữ (ms)
            backDelay: 1000, // Thời gian chờ trước khi xóa (ms)
            loop: true,      // Lặp lại vô hạn
            showCursor: false // Hiển thị con trỏ nhấp nháy
        };
        var typed = new Typed('.feature__title_3', options);
    });
}

        