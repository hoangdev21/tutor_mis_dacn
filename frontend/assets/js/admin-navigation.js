// ===== ADMIN NAVIGATION SYSTEM - SPA-LIKE BEHAVIOR =====
// Handles smooth page transitions without reloading the sidebar
// Created: 2025 - Professional Navigation System

// API_BASE_URL is already defined in main.js

// Page mapping - định nghĩa các trang và file HTML tương ứng
const PAGE_MAPPING = {
  dashboard: {
    title: 'Dashboard',
    file: 'dashboard.html',
    icon: 'dashboard.png',
    loadFunction: 'loadDashboard'
  },
  users: {
    title: 'Quản Lý Người Dùng',
    file: 'user.html',
    icon: 'users.png',
    loadFunction: 'loadUsers'
  },
  tutors: {
    title: 'Duyệt Gia Sư',
    file: 'approve.html',
    icon: 'tutors.png',
    loadFunction: 'loadTutorApprovals'
  },
  courses: {
    title: 'Quản Lý Khóa Học',
    file: 'course.html',
    icon: 'courses.png',
    loadFunction: 'loadCourses'
  },
  blog: {
    title: 'Quản Lý Blog',
    file: 'blog_management.html',
    icon: 'blog.png',
    loadFunction: 'loadBlogs'
  },
  reports: {
    title: 'Báo Cáo',
    file: 'report.html',
    icon: 'reports.png',
    loadFunction: 'loadReports'
  },
  finance: {
    title: 'Thống Kê Tài Chính',
    file: 'financial_statistics.html',
    icon: 'finance.png',
    loadFunction: 'loadFinance'
  },
  contact_info: {
    title: 'Thông Tin Liên Hệ',
    file: 'contact_info.html',
    icon: 'contact.png',
    loadFunction: 'loadContactInfo'
  },
  settings: {
    title: 'Cài Đặt',
    file: 'settings.html',
    icon: 'settings.png',
    loadFunction: 'loadSettings'
  },
  logs: {
    title: 'System Logs',
    file: 'logs.html',
    icon: 'logs.png',
    loadFunction: 'loadLogs'
  }
};

// Current state
let currentPage = 'dashboard';
let isNavigating = false;
let pageCache = {};

// Initialize navigation system
function initializeNavigation() {
  console.log('🚀 Initializing Admin Navigation System...');
  
  // Setup menu click handlers
  setupMenuHandlers();
  
  // Setup mobile menu toggle
  setupMobileMenuToggle();
  
  // Handle browser back/forward
  setupBrowserNavigation();
  
  // Load initial page from URL or default to dashboard
  const urlPage = getPageFromURL();
  if (urlPage && PAGE_MAPPING[urlPage]) {
    navigateToPage(urlPage, false);
  } else {
    navigateToPage('dashboard', false);
  }
  
  console.log('✅ Admin Navigation System initialized');
}

// Setup menu click handlers
function setupMenuHandlers() {
  const menuItems = document.querySelectorAll('.menu-item[data-page]');
  
  menuItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const page = this.getAttribute('data-page');
      
      if (page && PAGE_MAPPING[page]) {
        navigateToPage(page);
      }
    });
  });
}

// Setup mobile menu toggle
function setupMobileMenuToggle() {
  const menuToggle = document.getElementById('menuToggle');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebar = document.getElementById('dashboardSidebar');
  
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
  }
  
  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', () => {
      sidebar.classList.remove('active');
    });
  }
  
  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 1024) {
      if (!sidebar.contains(e.target) && !menuToggle?.contains(e.target)) {
        sidebar.classList.remove('active');
      }
    }
  });
}

// Setup browser navigation (back/forward buttons)
function setupBrowserNavigation() {
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.page) {
      navigateToPage(e.state.page, false);
    }
  });
}

// Get page from URL hash
function getPageFromURL() {
  const hash = window.location.hash.substring(1);
  return hash || null;
}

// Navigate to a page
async function navigateToPage(page, pushState = true) {
  // Prevent multiple simultaneous navigations
  if (isNavigating) {
    console.warn('Navigation in progress, please wait...');
    return;
  }
  
  if (!PAGE_MAPPING[page]) {
    console.error(`Page "${page}" not found in mapping`);
    return;
  }
  
  // Skip if already on this page
  if (currentPage === page && !pushState) {
    return;
  }
  
  isNavigating = true;
  
  try {
    console.log(`📄 Navigating to: ${page}`);
    
    // Update active menu item
    updateActiveMenuItem(page);
    
    // Update page title
    updatePageTitle(PAGE_MAPPING[page].title);
    
    // Show loading state
    showLoadingState();
    
    // Load page content
    await loadPageContent(page);
    
    // Update URL and history
    if (pushState) {
      window.history.pushState({ page }, '', `#${page}`);
    }
    
    // Update current page
    currentPage = page;
    
    // Close mobile sidebar
    closeMobileSidebar();
    
    // Scroll to top
    scrollToTop();
    
    console.log(`✅ Navigated to: ${page}`);
    
  } catch (error) {
    console.error(`❌ Error navigating to ${page}:`, error);
    showErrorState(error.message);
  } finally {
    isNavigating = false;
  }
}

// Update active menu item
function updateActiveMenuItem(page) {
  const menuItems = document.querySelectorAll('.menu-item[data-page]');
  
  menuItems.forEach(item => {
    if (item.getAttribute('data-page') === page) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// Update page title in header
function updatePageTitle(title) {
  const pageTitleElement = document.querySelector('.page-title h1');
  if (pageTitleElement) {
    pageTitleElement.textContent = title;
    
    // Add fade animation
    pageTitleElement.style.animation = 'none';
    setTimeout(() => {
      pageTitleElement.style.animation = 'fadeIn 0.3s ease';
    }, 10);
  }
  
  // Update browser title
  document.title = `${title} - Admin | TutorMis`;
}

// Show loading state
function showLoadingState() {
  const contentArea = document.getElementById('dashboardContent');
  if (contentArea) {
    contentArea.innerHTML = `
      <div class="loading-state" style="padding: 100px 20px; text-align: center;">
        <div class="spinner"></div>
        <p style="margin-top: 16px; color: #64748b; font-size: 14px;">Đang tải nội dung...</p>
      </div>
    `;
    
    // Add fade animation
    contentArea.style.opacity = '0';
    setTimeout(() => {
      contentArea.style.opacity = '1';
      contentArea.style.transition = 'opacity 0.3s ease';
    }, 10);
  }
}

// Show error state
function showErrorState(message) {
  const contentArea = document.getElementById('dashboardContent');
  if (contentArea) {
    contentArea.innerHTML = `
      <div class="content-section" style="text-align: center; padding: 60px 20px;">
        <i class="fas fa-exclamation-triangle" style="font-size: 64px; color: #f87171; margin-bottom: 20px;"></i>
        <h3 style="color: #991b1b; margin-bottom: 12px;">Lỗi tải trang</h3>
        <p style="color: #dc2626; margin-bottom: 24px;">${message}</p>
        <button class="action-btn primary" onclick="location.reload()">
          <i class="fas fa-redo"></i>
          Tải lại trang
        </button>
      </div>
    `;
  }
}

// Load page content
async function loadPageContent(page) {
  const pageInfo = PAGE_MAPPING[page];
  const contentArea = document.getElementById('dashboardContent');
  
  if (!contentArea) {
    throw new Error('Content area not found');
  }
  
  try {
    // Check if page is cached
    if (pageCache[page]) {
      console.log(`📦 Loading ${page} from cache`);
      contentArea.innerHTML = pageCache[page];
      
      // Re-initialize page-specific scripts
      await initializePageScripts(page);
      return;
    }
    
    // Fetch page content
    console.log(`🌐 Fetching ${pageInfo.file}...`);
    const response = await fetch(`${pageInfo.file}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Parse and extract content section
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const content = doc.querySelector('.dashboard-content');
    
    if (!content) {
      throw new Error('Content section not found in page');
    }
    
    // Cache the content
    pageCache[page] = content.innerHTML;
    
    // Insert content
    contentArea.innerHTML = content.innerHTML;
    
    // Initialize page-specific scripts
    await initializePageScripts(page);
    
    console.log(`✅ Loaded ${page} successfully`);
    
  } catch (error) {
    console.error(`❌ Error loading ${page}:`, error);
    throw error;
  }
}

// Initialize page-specific scripts
async function initializePageScripts(page) {
  const pageInfo = PAGE_MAPPING[page];
  
  // Call page-specific load function if it exists
  if (pageInfo.loadFunction && typeof window[pageInfo.loadFunction] === 'function') {
    console.log(`🔧 Initializing ${pageInfo.loadFunction}...`);
    try {
      await window[pageInfo.loadFunction]();
    } catch (error) {
      console.error(`Error in ${pageInfo.loadFunction}:`, error);
    }
  }
  
  // Re-attach event listeners
  reattachEventListeners(page);
  
  // Update page-specific UI elements
  updatePageUI(page);
}

// Re-attach event listeners for dynamic content
function reattachEventListeners(page) {
  // Common event listeners that need to be re-attached
  
  // Action buttons
  const actionBtns = document.querySelectorAll('.action-btn[data-action]');
  actionBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const action = this.getAttribute('data-action');
      handleAction(action, this);
    });
  });
  
  // Modal triggers
  const modalTriggers = document.querySelectorAll('[data-modal]');
  modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', function() {
      const modalId = this.getAttribute('data-modal');
      openModal(modalId);
    });
  });
  
  // Filter inputs
  const filterInputs = document.querySelectorAll('.filter-input');
  filterInputs.forEach(input => {
    input.addEventListener('change', handleFilterChange);
  });
  
  // Search inputs
  const searchInputs = document.querySelectorAll('.search-input');
  searchInputs.forEach(input => {
    input.addEventListener('input', debounce(handleSearch, 300));
  });
}

// Handle action buttons
function handleAction(action, element) {
  console.log(`Action triggered: ${action}`, element);
  // This can be extended based on specific needs
}

// Handle filter changes
function handleFilterChange(e) {
  console.log('Filter changed:', e.target.value);
  // Trigger filter logic for current page
  if (typeof window.applyFilters === 'function') {
    window.applyFilters();
  }
}

// Handle search
function handleSearch(e) {
  console.log('Search query:', e.target.value);
  // Trigger search logic for current page
  if (typeof window.performSearch === 'function') {
    window.performSearch(e.target.value);
  }
}

// Debounce function for search
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Update page-specific UI elements
function updatePageUI(page) {
  // Update current date
  const dateElement = document.getElementById('currentDate');
  if (dateElement) {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = today.toLocaleDateString('vi-VN', options);
  }
  
  // Update any other page-specific UI elements
}

// Close mobile sidebar
function closeMobileSidebar() {
  if (window.innerWidth <= 1024) {
    const sidebar = document.getElementById('dashboardSidebar');
    if (sidebar) {
      sidebar.classList.remove('active');
    }
  }
}

// Scroll to top smoothly
function scrollToTop() {
  const mainContent = document.querySelector('.dashboard-main');
  if (mainContent) {
    mainContent.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}

// Modal functions
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Clear page cache (useful for forcing refresh)
function clearPageCache(page = null) {
  if (page) {
    delete pageCache[page];
    console.log(`🗑️ Cleared cache for ${page}`);
  } else {
    pageCache = {};
    console.log('🗑️ Cleared all page cache');
  }
}

// Refresh current page
async function refreshCurrentPage() {
  clearPageCache(currentPage);
  await navigateToPage(currentPage, false);
}

// Logout function
function logout() {
  if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
    // Clear all storage
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    // Clear page cache
    clearPageCache();
    
    console.log('👋 Logging out...');
    
    // Redirect to login
    window.location.href = '../../index.html';
  }
}

// Export functions for global access
window.AdminNavigation = {
  navigateToPage,
  refreshCurrentPage,
  clearPageCache,
  openModal,
  closeModal,
  logout
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNavigation);
} else {
  initializeNavigation();
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  #dashboardContent {
    transition: opacity 0.3s ease;
  }
  
  .menu-item {
    transition: all 0.3s ease;
  }
  
  .menu-item.active {
    animation: slideInFromLeft 0.3s ease;
  }
  
  @keyframes slideInFromLeft {
    from {
      transform: translateX(-5px);
      opacity: 0.5;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

console.log('🎉 Admin Navigation System loaded!');