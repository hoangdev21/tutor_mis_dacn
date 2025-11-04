// Blog detail page functionality
let currentPostId = null;

// Get post ID from URL
function getPostIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// Load article
async function loadArticle() {
  currentPostId = getPostIdFromUrl();
  
  if (!currentPostId) {
    window.location.href = 'blog.html';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/blogs/${currentPostId}`);
    const data = await response.json();

    if (data.success) {
      renderArticle(data.data);
      loadRelatedPosts(data.data.category);
      loadComments();
      generateTableOfContents();
      incrementViews();
    } else {
      showError('Không tìm thấy bài viết');
    }
  } catch (error) {
    console.error('Error loading article:', error);
    showError('Có lỗi xảy ra khi tải bài viết');
  }
}

// Render article
function renderArticle(post) {
  // Update meta info
  document.getElementById('articleCategory').textContent = getCategoryName(post.category);
  document.getElementById('articleDate').textContent = formatDate(post.createdAt);
  document.getElementById('articleViews').textContent = post.views || 0;
  
  // Update title
  document.getElementById('articleTitle').textContent = post.title;
  document.title = `${post.title} - TutorMis`;

  // Update author
  document.getElementById('authorName').textContent = post.author?.name || 'Admin';
  document.getElementById('authorRole').textContent = post.author?.role || 'Biên tập viên';
  document.getElementById('authorNameFull').textContent = post.author?.name || 'Admin TutorMis';
  document.getElementById('authorBio').textContent = post.author?.bio || 'Biên tập viên chuyên về giáo dục và phương pháp học tập hiệu quả.';

  // Update image
  if (post.image) {
    document.getElementById('articleImage').src = post.image;
  }

  // Update content
  document.getElementById('articleContent').innerHTML = post.content;

  // Update tags
  if (post.tags && post.tags.length > 0) {
    const tagsHtml = post.tags.map(tag => `<a href="blog.html?tag=${tag}" class="tag">${tag}</a>`).join('');
    document.getElementById('articleTags').innerHTML = `<i class="fas fa-tags"></i> ${tagsHtml}`;
  }
}

// Load related posts
async function loadRelatedPosts(category) {
  try {
    const response = await fetch(`${API_URL}/api/blogs?category=${category}&limit=3&exclude=${currentPostId}`);
    const data = await response.json();

    if (data.success && data.data.blogPosts.length > 0) {
      renderRelatedPosts(data.data.blogPosts);
    } else {
      document.querySelector('.related-posts').style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading related posts:', error);
  }
}

// Render related posts
function renderRelatedPosts(posts) {
  const container = document.getElementById('relatedPosts');
  
  container.innerHTML = posts.map(post => `
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
        <a href="blog-detail.html?id=${post._id}" class="read-more">
          Đọc thêm <i class="fas fa-arrow-right"></i>
        </a>
      </div>
    </article>
  `).join('');
}

// Load comments
async function loadComments() {
  try {
    const response = await fetch(`${API_URL}/api/blogs/${currentPostId}/comments`);
    const data = await response.json();

    if (data.success) {
      renderComments(data.data);
    }
  } catch (error) {
    console.error('Error loading comments:', error);
  }
}

// Render comments
function renderComments(comments) {
  const container = document.getElementById('commentsList');
  document.getElementById('commentsCount').textContent = comments.length;

  if (comments.length === 0) {
    container.innerHTML = '<p class="no-comments">Chưa có bình luận nào. Hãy là người đầu tiên!</p>';
    return;
  }

  container.innerHTML = comments.map(comment => `
    <div class="comment">
      <div class="comment-header">
        <span class="comment-author">${comment.author?.name || 'Ẩn danh'}</span>
        <span class="comment-date">${formatDate(comment.createdAt)}</span>
      </div>
      <p class="comment-text">${comment.content}</p>
    </div>
  `).join('');
}

// Submit comment
async function submitComment(event) {
  event.preventDefault();
  
  const form = event.target;
  const textarea = form.querySelector('textarea');
  const content = textarea.value.trim();

  if (!content) {
    return;
  }

  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    showNotification('Vui lòng đăng nhập để bình luận', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/blogs/${currentPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content })
    });

    const data = await response.json();

    if (data.success) {
      showNotification('Bình luận đã được gửi!', 'success');
      textarea.value = '';
      loadComments();
    } else {
      showNotification(data.message || 'Không thể gửi bình luận', 'error');
    }
  } catch (error) {
    console.error('Error submitting comment:', error);
    showNotification('Có lỗi xảy ra. Vui lòng thử lại sau.', 'error');
  }
}

// Generate table of contents
function generateTableOfContents() {
  const content = document.getElementById('articleContent');
  const headings = content.querySelectorAll('h2, h3');
  const tocList = document.getElementById('tocList');

  if (headings.length === 0) {
    document.querySelector('.toc-widget').style.display = 'none';
    return;
  }

  tocList.innerHTML = Array.from(headings).map((heading, index) => {
    const id = `heading-${index}`;
    heading.id = id;
    
    const level = heading.tagName === 'H2' ? '' : 'style="padding-left: 15px;"';
    return `<li ${level}><a href="#${id}">${heading.textContent}</a></li>`;
  }).join('');

  // Add smooth scroll
  tocList.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// Increment views
async function incrementViews() {
  try {
    await fetch(`${API_URL}/api/blogs/${currentPostId}/view`, {
      method: 'POST'
    });
  } catch (error) {
    console.error('Error incrementing views:', error);
  }
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
      showNotification('Đăng ký thành công!', 'success');
      form.reset();
    } else {
      showNotification(data.message || 'Đăng ký thất bại', 'error');
    }
  } catch (error) {
    console.error('Error subscribing:', error);
    showNotification('Có lỗi xảy ra. Vui lòng thử lại sau.', 'error');
  }
}

// Helper functions
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

function showError(message) {
  const content = document.getElementById('articleContent');
  content.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-circle"></i>
      <p>${message}</p>
      <a href="blog.html" class="btn btn--primary">Quay lại Blog</a>
    </div>
  `;
}

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
      .notification--success { border-left: 4px solid #10b981; color: #10b981; }
      .notification--error { border-left: 4px solid #ef4444; color: #ef4444; }
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadArticle();
  loadPopularPosts();
});