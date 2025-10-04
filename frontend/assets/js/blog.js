// Blog page functionality
const API_BASE_URL = 'http://localhost:5000/api';
const API_URL = 'http://localhost:5000';
let currentPage = 1;
let currentCategory = 'all';
let searchQuery = '';
const postsPerPage = 6;

// Load blog posts
async function loadBlogPosts() {
  try {
    const response = await fetch(`${API_URL}/api/blogs?page=${currentPage}&limit=${postsPerPage}&category=${currentCategory}&search=${searchQuery}`);
    
    if (!response.ok) {
      // Use mock data if API not available
      console.warn('Blog API not available, using mock data');
      const mockPosts = generateMockPosts();
      renderBlogPosts(mockPosts);
      renderPagination(1, 1);
      return;
    }
    
    const data = await response.json();

    if (data.success) {
      renderBlogPosts(data.data.blogPosts);
      renderPagination(data.data.page, data.data.pages);
    } else {
      showError('Không thể tải bài viết');
    }
  } catch (error) {
    console.error('Error loading blog posts:', error);
    // Use mock data on error
    const mockPosts = generateMockPosts();
    renderBlogPosts(mockPosts);
  }
}

// Generate mock posts for demo
function generateMockPosts() {
  return [
    {
      _id: '1',
      title: 'Phương pháp học tập hiệu quả cho học sinh THPT',
      content: 'Chia sẻ những phương pháp học tập đã được chứng minh mang lại hiệu quả cao cho học sinh trung học phổ thông...',
      category: 'education',
      author: { fullName: 'Admin' },
      createdAt: new Date().toISOString(),
      image: 'https://via.placeholder.com/400x200'
    },
    {
      _id: '2',
      title: 'Cách chuẩn bị cho kỳ thi đại học',
      content: 'Hướng dẫn chi tiết về cách lập kế hoạch ôn thi và những lưu ý quan trọng khi thi đại học...',
      category: 'tips',
      author: { fullName: 'Tutor' },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      image: 'https://via.placeholder.com/400x200'
    },
    {
      _id: '3',
      title: 'Kinh nghiệm học Toán hiệu quả',
      content: 'Chia sẻ từ gia sư có kinh nghiệm về cách học Toán đạt điểm cao...',
      category: 'experience',
      author: { fullName: 'Experienced Tutor' },
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      image: 'https://via.placeholder.com/400x200'
    }
  ];
}

// Render blog posts
function renderBlogPosts(posts) {
  const blogGrid = document.getElementById('blogGrid');
  
  if (posts.length === 0) {
    blogGrid.innerHTML = '<div class="no-posts">Không tìm thấy bài viết nào</div>';
    return;
  }

  blogGrid.innerHTML = posts.map(post => `
    <article class="blog-card">
      <div class="blog-card-image">
        <img src="${post.image || 'https://via.placeholder.com/400x200'}" alt="${post.title}">
      </div>
      <div class="blog-card-content">
        <div class="post-meta">
          <span class="post-category">${getCategoryName(post.category)}</span>
          <span class="post-date"><i class="far fa-clock"></i> ${formatDate(post.createdAt)}</span>
        </div>
        <h3><a href="blog-detail.html?id=${post._id}">${post.title}</a></h3>
        <p>${post.excerpt || post.content.substring(0, 150)}...</p>
        <a href="blog-detail.html?id=${post._id}" class="read-more">
          Đọc thêm <i class="fas fa-arrow-right"></i>
        </a>
      </div>
    </article>
  `).join('');
}

// Render pagination
function renderPagination(current, total) {
  const pagination = document.getElementById('pagination');
  
  if (total <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = '<div class="pagination-controls">';
  
  // Previous button
  if (current > 1) {
    html += `<button onclick="changePage(${current - 1})" class="pagination-btn"><i class="fas fa-chevron-left"></i></button>`;
  }

  // Page numbers
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
      html += `<button onclick="changePage(${i})" class="pagination-btn ${i === current ? 'active' : ''}">${i}</button>`;
    } else if (i === current - 2 || i === current + 2) {
      html += '<span class="pagination-dots">...</span>';
    }
  }

  // Next button
  if (current < total) {
    html += `<button onclick="changePage(${current + 1})" class="pagination-btn"><i class="fas fa-chevron-right"></i></button>`;
  }

  html += '</div>';
  pagination.innerHTML = html;
}

// Change page
function changePage(page) {
  currentPage = page;
  loadBlogPosts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Filter by category
function filterByCategory(event, category) {
  event.preventDefault();
  
  // Update active state
  document.querySelectorAll('.category-list a').forEach(link => {
    link.classList.remove('active');
  });
  event.target.classList.add('active');

  currentCategory = category;
  currentPage = 1;
  loadBlogPosts();
}

// Search posts
function searchPosts() {
  searchQuery = document.getElementById('searchInput').value;
  currentPage = 1;
  loadBlogPosts();
}

// Load popular posts
async function loadPopularPosts() {
  try {
    const response = await fetch(`${API_URL}/api/blogs/popular?limit=5`);
    const data = await response.json();

    if (data.success) {
      renderPopularPosts(data.data);
    }
  } catch (error) {
    console.error('Error loading popular posts:', error);
  }
}

// Render popular posts
function renderPopularPosts(posts) {
  const container = document.getElementById('popularPosts');
  
  if (posts.length === 0) {
    container.innerHTML = '<p>Chưa có bài viết phổ biến</p>';
    return;
  }

  container.innerHTML = posts.map(post => `
    <div class="popular-post">
      <div class="popular-post-image">
        <img src="${post.image || 'https://via.placeholder.com/80'}" alt="${post.title}">
      </div>
      <div class="popular-post-content">
        <h4><a href="blog-detail.html?id=${post._id}">${post.title}</a></h4>
        <span class="popular-post-date">${formatDate(post.createdAt)}</span>
      </div>
    </div>
  `).join('');
}

// Subscribe newsletter
async function subscribeNewsletter(event) {
  event.preventDefault();
  
  const form = event.target;
  const email = form.querySelector('input[type="email"]').value;

  try {
    const response = await fetch(`${API_URL}/api/newsletter/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (data.success) {
      showNotification('Đăng ký thành công! Cảm ơn bạn đã theo dõi.', 'success');
      form.reset();
    } else {
      showNotification(data.message || 'Đăng ký thất bại', 'error');
    }
  } catch (error) {
    console.error('Error subscribing:', error);
    showNotification('Có lỗi xảy ra. Vui lòng thử lại sau.', 'error');
  }
}

// Get category name
function getCategoryName(category) {
  const categories = {
    'education': 'Giáo dục',
    'tips': 'Mẹo học tập',
    'experience': 'Kinh nghiệm',
    'career': 'Định hướng',
    'news': 'Tin tức'
  };
  return categories[category] || 'Khác';
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày trước`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng trước`;
  return `${Math.floor(diffDays / 365)} năm trước`;
}

// Show error
function showError(message) {
  const container = document.getElementById('blogPostsContainer');
  if (container) {
    container.innerHTML = `
      <div class="error-message" style="text-align: center; padding: 40px; color: #666;">
        <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #ef4444; margin-bottom: 16px;"></i>
        <p style="font-size: 16px;">${message}</p>
      </div>
    `;
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    <span>${message}</span>
  `;

  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        background: white;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
      }
      .notification--success {
        border-left: 4px solid #10b981;
        color: #10b981;
      }
      .notification--error {
        border-left: 4px solid #ef4444;
        color: #ef4444;
      }
      .notification i { font-size: 20px; }
      .notification span { color: #333; font-size: 14px; }
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Create new post
function createNewPost() {
  const modal = document.getElementById('createPostModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

// Close create post modal
function closeCreatePostModal() {
  const modal = document.getElementById('createPostModal');
  if (modal) {
    modal.style.display = 'none';
    // Reset form
    const form = document.getElementById('createPostForm');
    if (form) form.reset();
  }
}

// Submit new post
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('createPostForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showNotification('Tính năng đang được phát triển', 'info');
      closeCreatePostModal();
    });
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadBlogPosts();

  // Add search on Enter key
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchPosts();
      }
    });
  }
  
  // Filter buttons
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.filter;
      currentPage = 1;
      loadBlogPosts();
    });
  });
});
