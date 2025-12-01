// ===== TUTOR PROFILE PAGE JAVASCRIPT (FOR STUDENT) =====

// API_BASE_URL is already defined in main.js
// const API_BASE_URL = 'http://localhost:5000/api';
let currentTutor = null;
let tutorId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Get tutor ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  tutorId = urlParams.get('id');

  console.log('🔍 Loading tutor profile, ID:', tutorId);

  if (!tutorId) {
    showError('Không tìm thấy ID gia sư');
    return;
  }

  loadTutorProfile();
});

// Load tutor profile
async function loadTutorProfile() {
  const container = document.getElementById('profileContainer');

  try {
    console.log('📡 Fetching tutor from:', `${API_BASE_URL}/auth/tutor/${tutorId}`);

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/auth/tutor/${tutorId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Tutor data received:', data);

    if (!data.success || !data.data) {
      throw new Error('Invalid response data');
    }

    currentTutor = data.data;
    renderProfile();
    loadTutorReviews(); // Load reviews after profile rendered

  } catch (error) {
    console.error('❌ Load profile error:', error);
    container.innerHTML = `
      <div class="alert alert-error">
        <i class="fas fa-exclamation-circle"></i>
        <p>Không thể tải thông tin gia sư. ${error.message}</p>
        <button class="btn btn-primary" onclick="goBack()" style="margin-top: 12px;">
          <i class="fas fa-arrow-left"></i>
          Quay Lại
        </button>
      </div>
    `;
  }
}

// Render profile
function renderProfile() {
  const container = document.getElementById('profileContainer');
  const profile = currentTutor.profile || {};

  console.log('🎨 Rendering profile:', profile);

  // Format basic info
  const name = profile.fullName || 'Gia sư';
  const avatar = profile.avatar || currentTutor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff`;
  const bio = profile.bio || 'Chưa có giới thiệu.';

  // Format rating
  const rating = profile.averageRating || 0;
  const reviewCount = profile.totalReviews || 0;

  // Format stats
  const yearsOfExp = profile.yearsOfExperience || 0;
  const totalStudents = profile.totalStudents || 0;
  const totalLessons = profile.totalLessons || 0;
  const hourlyRate = profile.hourlyRate || 0;

  // Format address
  let addressStr = 'Chưa cập nhật';
  if (profile.address) {
    if (typeof profile.address === 'string') {
      addressStr = profile.address;
    } else {
      const parts = [
        profile.address.street,
        profile.address.ward,
        profile.address.district,
        profile.address.city
      ].filter(Boolean);
      addressStr = parts.length > 0 ? parts.join(', ') : 'Chưa cập nhật';
    }
  }

  // Format teaching locations
  const teachingLocations = profile.teachingLocation || [];
  let locationsStr = 'Chưa cập nhật';
  if (teachingLocations.length > 0) {
    const locationMap = {
      'home': 'Tại nhà gia sư',
      'student_home': 'Tại nhà học sinh',
      'online': 'Online'
    };
    locationsStr = teachingLocations.map(loc => locationMap[loc] || loc).join(', ');
  }

  // Render HTML
  container.innerHTML = `
    <!-- Hero Section -->
    <div class="profile-hero">
      <div class="hero-card">
        <div class="hero-avatar-wrapper">
          <img src="${avatar}" alt="${name}" class="hero-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff'">
          ${profile.universityImage ? `
          <div class="hero-badge" title="Trường đại học">
            <img src="${profile.universityImage}" alt="University" onerror="this.style.display='none'">
          </div>
          ` : ''}
        </div>
        
        <div class="hero-info">
          <div class="hero-name-row">
            <h1 class="hero-name">${name}</h1>
            ${currentTutor.approvalStatus === 'approved' ? `
            <div class="verified-badge">
              <i class="fas fa-check-circle"></i> Đã xác thực
            </div>
            ` : ''}
          </div>
          
          <div class="hero-title">${profile.title || 'Gia sư chuyên nghiệp'}</div>
          
          <div class="hero-stats-row">
            <div class="hero-stat">
              <i class="fas fa-star rating-star"></i>
              <strong>${rating.toFixed(1)}</strong>
              <span>(${reviewCount} đánh giá)</span>
            </div>
            
            <div class="hero-stat">
              <i class="fas fa-briefcase"></i>
              <strong>${yearsOfExp}</strong>
              <span>năm kinh nghiệm</span>
            </div>
            
            <div class="hero-stat">
              <i class="fas fa-user-graduate"></i>
              <strong>${totalStudents}</strong>
              <span>học sinh</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Grid Layout -->
    <div class="profile-grid">
      <!-- Left Column: Main Content -->
      <div class="profile-main">
        
        <!-- About Section -->
        <div class="content-card">
          <div class="card-header">
            <div class="card-icon"><i class="fas fa-user"></i></div>
            <h3 class="card-title">Giới Thiệu</h3>
          </div>
          <div class="about-text">${bio}</div>
        </div>
        
        <!-- Subjects Section -->
        <div class="content-card">
          <div class="card-header">
            <div class="card-icon"><i class="fas fa-book"></i></div>
            <h3 class="card-title">Môn Học Giảng Dạy</h3>
          </div>
          <div class="subjects-wrapper">
            ${renderSubjects(profile.subjects || [])}
          </div>
        </div>
        
        <!-- Education & Experience Section -->
        ${(profile.education && profile.education.length > 0) || (profile.workExperience && profile.workExperience.length > 0) ? `
        <div class="content-card">
          <div class="card-header">
            <div class="card-icon"><i class="fas fa-graduation-cap"></i></div>
            <h3 class="card-title">Hồ Sơ Năng Lực</h3>
          </div>
          
          <div class="timeline">
            ${renderEducation(profile.education || [])}
            ${renderWorkExperience(profile.workExperience || [])}
          </div>
        </div>
        ` : ''}

        <!-- Reviews Section -->
        <div class="content-card" id="reviewsContainer">
          <!-- Reviews will be loaded here -->
        </div>
      </div>
      
      <!-- Right Column: Sidebar -->
      <aside class="profile-sidebar">
        
        <!-- Booking Card -->
        <div class="booking-card">
          <div class="price-tag">
            <span class="price-label">Học phí tham khảo</span>
            <div class="price-amount">${formatCurrency(hourlyRate)}<span class="price-unit">/giờ</span></div>
          </div>
          
          <div class="action-buttons">
            <button class="btn-book" onclick="requestTutor()">
              <i class="fas fa-paper-plane"></i>
              Gửi Yêu Cầu
            </button>
            <button class="btn-message" onclick="contactTutor()">
              <i class="fas fa-comment-dots"></i>
              Nhắn Tin
            </button>
          </div>
        </div>
        
        <!-- Information Card -->
        <div class="content-card" style="padding: 1.5rem;">
          <div class="info-list">
            <div class="info-item">
              <div class="info-icon"><i class="fas fa-map-marker-alt"></i></div>
              <div class="info-content">
                <h6>Địa chỉ</h6>
                <p>${addressStr}</p>
                <button class="btn-link" onclick="openLocationInMap('${encodeURIComponent(addressStr)}')" style="font-size: 0.85rem; color: #667eea; margin-top: 4px; background: none; border: none; cursor: pointer; padding: 0;">Xem bản đồ</button>
              </div>
            </div>
            
            <div class="info-item">
              <div class="info-icon"><i class="fas fa-chalkboard-teacher"></i></div>
              <div class="info-content">
                <h6>Hình thức dạy</h6>
                <p>${locationsStr}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Availability Card -->
        ${(profile.availability && profile.availability.length > 0) ? `
        <div class="content-card" style="padding: 1.5rem;">
          <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Lịch Rảnh</h4>
          <div class="info-list">
            ${renderAvailability(profile.availability)}
          </div>
        </div>
        ` : ''}
        
      </aside>
    </div>
  `;
}

// Render subjects (Modern Chips)
function renderSubjects(subjects) {
  if (!subjects || subjects.length === 0) {
    return '<p class="text-muted">Chưa có môn học nào</p>';
  }

  return subjects.map(subject => {
    let subjectName = '';
    let level = '';

    if (typeof subject === 'string') {
      subjectName = subject;
    } else {
      subjectName = subject.subject || subject.name || '';
      level = subject.level || '';
    }

    return `
      <div class="subject-tag">
        <i class="fas fa-check"></i>
        <span>${subjectName} ${level ? `(${level})` : ''}</span>
      </div>
    `;
  }).join('');
}

// Render education (Timeline Item)
function renderEducation(education) {
  return education.map(edu => {
    const schoolName = edu.institution || edu.university || 'Trường';
    const yearEnd = edu.endYear || edu.graduationYear;

    let yearRange = '';
    if (edu.startYear && yearEnd) {
      yearRange = `${edu.startYear} - ${yearEnd}`;
    } else if (edu.startYear) {
      yearRange = `${edu.startYear} - Hiện tại`;
    } else if (yearEnd) {
      yearRange = `Tốt nghiệp: ${yearEnd}`;
    }

    return `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <h4>${edu.degree || 'Học vị'}</h4>
        <div class="place">${schoolName}</div>
        ${yearRange ? `<div class="time">${yearRange}</div>` : ''}
        ${edu.major ? `<p>Chuyên ngành: ${edu.major}</p>` : ''}
        ${edu.description ? `<p>${edu.description}</p>` : ''}
      </div>
    </div>
  `;
  }).join('');
}

// Render work experience (Timeline Item)
function renderWorkExperience(experience) {
  return experience.map(exp => `
    <div class="timeline-item">
      <div class="timeline-dot" style="border-color: #f6d365;"></div>
      <div class="timeline-content">
        <h4>${exp.position || 'Vị trí'}</h4>
        <div class="place">${exp.company || 'Công ty'}</div>
        <div class="time">
          ${exp.startYear || ''} ${exp.endYear ? `- ${exp.endYear}` : '- Hiện tại'}
        </div>
        ${exp.description ? `<p>${exp.description}</p>` : ''}
      </div>
    </div>
  `).join('');
}

// Render certificates - Not used in this layout or can be added if needed
function renderCertificates(certificates) {
  return '';
}

// Render availability (List Item)
function renderAvailability(availability) {
  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

  return days.map((day, index) => {
    const dayData = availability.find(a => a.day === (index + 1));
    if (!dayData || !dayData.slots || dayData.slots.length === 0) return '';

    return `
      <div class="info-item" style="padding: 0.75rem; background: #f8fafc; border-radius: 8px;">
        <div style="flex: 1;">
          <strong style="display: block; font-size: 0.9rem; margin-bottom: 4px;">${day}</strong>
          <span style="font-size: 0.85rem; color: #667eea;">
            ${dayData.slots.map(slot => `${slot.start || ''} - ${slot.end || ''}`).join(', ')}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// Contact tutor - redirect to messages
function contactTutor() {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

  if (!token) {
    alert('Vui lòng đăng nhập để liên hệ gia sư');
    window.location.href = '../../index.html';
    return;
  }

  if (!tutorId) {
    alert('Không tìm thấy thông tin gia sư');
    return;
  }

  console.log('💬 Redirecting to messages with tutorId:', tutorId);

  // Redirect to messages page with tutor ID and tutor info
  const tutorName = currentTutor?.profile?.fullName || 'Gia sư';
  const tutorAvatar = currentTutor?.profile?.avatar || currentTutor?.avatar || '';

  // Store recipient info for messages page
  localStorage.setItem('chatRecipient', JSON.stringify({
    id: tutorId,
    name: tutorName,
    avatar: tutorAvatar,
    role: 'tutor'
  }));

  // Redirect to messages page (relative path from pages/student/)
  window.location.href = `./messages.html?recipientId=${tutorId}`;
}

// Request tutor - redirect to booking request page
function requestTutor() {
  console.log('🔥 requestTutor() called - VERSION 2.0');
  console.log('📍 Current location:', window.location.href);

  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  console.log('🔑 Token exists:', !!token);

  if (!token) {
    console.error('❌ No token found');
    alert('Vui lòng đăng nhập để gửi yêu cầu');
    window.location.href = '../../index.html';
    return;
  }

  console.log('👨‍🏫 Current tutorId:', tutorId);
  if (!tutorId) {
    console.error('❌ No tutorId found');
    alert('Không tìm thấy thông tin gia sư');
    return;
  }

  // Store tutor ID and tutor info for the booking form
  localStorage.setItem('selectedTutorId', tutorId);
  console.log('💾 Stored tutorId to localStorage:', tutorId);

  // Store complete tutor data for reference
  if (currentTutor) {
    localStorage.setItem('selectedTutorData', JSON.stringify(currentTutor));
    console.log(' Stored tutor data:', currentTutor.profile?.fullName);
  }

  const targetUrl = `./tutor_request.html?tutorId=${tutorId}`;
  console.log('🚀 REDIRECTING TO:', targetUrl);
  console.log('🔗 Full URL will be:', new URL(targetUrl, window.location.href).href);

  // Force redirect
  window.location.href = targetUrl;
}

// Helper functions
function generateStars(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  return `
    ${'<i class="fas fa-star"></i>'.repeat(fullStars)}
    ${halfStar ? '<i class="fas fa-star-half-alt"></i>' : ''}
    ${'<i class="far fa-star"></i>'.repeat(emptyStars)}
  `;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

function showError(message) {
  const container = document.getElementById('profileContainer');
  container.innerHTML = `
    <div class="alert alert-error">
      <i class="fas fa-exclamation-circle"></i>
      <p>${message}</p>
      <button class="btn btn-primary" onclick="goBack()" style="margin-top: 12px;">
        <i class="fas fa-arrow-left"></i>
        Quay Lại
      </button>
    </div>
  `;
}

// Go back to previous page
function goBack() {
  if (document.referrer && document.referrer.includes('find_tutor.html')) {
    window.history.back();
  } else {
    window.location.href = 'find_tutor.html';
  }
}

// Open location in Google Maps
function openLocationInMap(encodedAddress) {
  if (!encodedAddress || encodedAddress === 'Chưa+cập+nhật') {
    alert('Địa chỉ chưa được cập nhật');
    return;
  }

  // Decode the address for display
  const address = decodeURIComponent(encodedAddress);

  // Open Google Maps with the address
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  window.open(mapsUrl, '_blank');
}

// ===== REVIEWS FUNCTIONS =====

// Load tutor reviews
async function loadTutorReviews() {
  const container = document.getElementById('reviewsContainer');

  try {
    console.log('📡 Loading tutor reviews for:', tutorId);

    const response = await fetch(`${API_BASE_URL}/reviews/tutor/${tutorId}`);

    if (!response.ok) {
      console.warn('⚠️ Could not load reviews:', response.status);
      return;
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      console.log('ℹ️ No reviews data');
      return;
    }

    const reviews = data.data.reviews || [];
    const stats = data.data.stats || {};

    console.log('✅ Reviews loaded:', reviews.length, 'reviews');
    renderReviewsSection(reviews, stats);

  } catch (error) {
    console.error('❌ Error loading reviews:', error);
    // Don't show error to user, just skip reviews section
  }
}

// Render reviews section
function renderReviewsSection(reviews, stats) {
  const container = document.getElementById('reviewsContainer');

  if (!reviews || reviews.length === 0) {
    container.innerHTML = `
      <div class="card-header">
        <div class="card-icon"><i class="fas fa-star"></i></div>
        <h3 class="card-title">Đánh Giá</h3>
      </div>
      <div class="no-reviews" style="text-align: center; padding: 2rem; color: #9ca3af;">
        <i class="fas fa-comment-slash" style="font-size: 2rem; margin-bottom: 1rem;"></i>
        <p>Chưa có đánh giá nào</p>
        <p style="font-size: 0.9rem;">Hãy làm bài tập với gia sư này để có thể để lại đánh giá!</p>
      </div>
    `;
    return;
  }

  // Calculate average rating and count
  const avgRating = stats.averageRating || 0;
  const reviewCount = reviews.length;
  const avgCriteria = stats.averageCriteria || {};

  let reviewsHTML = `
    <div class="card-header">
      <div class="card-icon"><i class="fas fa-star"></i></div>
      <h3 class="card-title">Đánh Giá Của Học Sinh</h3>
    </div>
    
    <div class="reviews-summary" style="display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; padding: 1.5rem; background: #f8fafc; border-radius: 1rem;">
      <div class="review-rating-display" style="text-align: center;">
        <div class="rating-value" style="font-size: 2.5rem; font-weight: 800; color: #1f2937; line-height: 1;">${avgRating.toFixed(1)}</div>
        <div class="stars" style="color: #fbbf24; font-size: 1rem; margin: 0.5rem 0;">${generateStars(avgRating)}</div>
        <div class="review-count" style="font-size: 0.9rem; color: #6b7280;">${reviewCount} đánh giá</div>
      </div>
      
      ${Object.keys(avgCriteria).length > 0 ? `
      <div class="criteria-breakdown" style="flex: 1; border-left: 1px solid #e5e7eb; padding-left: 1.5rem;">
        ${renderCriteriaBreakdown(avgCriteria)}
      </div>
      ` : ''}
    </div>
    
    <div class="reviews-list">
      ${reviews.map(review => renderReviewItem(review)).join('')}
    </div>
  `;

  container.innerHTML = reviewsHTML;
}

// Render single review item
function renderReviewItem(review) {
  const rating = review.rating || 0;
  const createdAt = new Date(review.createdAt).toLocaleDateString('vi-VN');
  const reviewerName = review.reviewer?.profile?.fullName || review.reviewer?.email || 'Học sinh';
  const reviewerAvatar = review.reviewer?.profile?.avatar || review.reviewer?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewerName)}&background=667eea&color=fff`;

  let html = `
    <div class="review-card">
      <div class="review-header">
        <div class="reviewer-info">
          <img src="${reviewerAvatar}" alt="${reviewerName}" class="reviewer-avatar" 
            onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(reviewerName)}&background=667eea&color=fff'">
          <div class="reviewer-details">
            <h5>${reviewerName}</h5>
            <span>${createdAt}</span>
          </div>
        </div>
        <div class="review-rating">
          ${generateStars(rating)}
        </div>
      </div>
      
      <div class="review-body">
        ${review.comment ? `<p>${escapeHtml(review.comment)}</p>` : ''}
        
        ${review.criteria && Object.keys(review.criteria).length > 0 ? `
          <div class="review-criteria" style="margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
            ${renderReviewCriteria(review.criteria)}
          </div>
        ` : ''}
      </div>
  `;

  // Add tutor response if exists
  if (review.tutorResponse && review.tutorResponse.message) {
    html += `
      <div class="tutor-response" style="margin-top: 1rem; padding: 1rem; background: #f0f4ff; border-radius: 0.5rem; border-left: 3px solid #667eea;">
        <div style="font-weight: 600; color: #667eea; margin-bottom: 0.5rem; font-size: 0.9rem;">
          <i class="fas fa-reply"></i> Phản hồi từ gia sư
        </div>
        <div style="font-size: 0.95rem; color: #4b5563;">${escapeHtml(review.tutorResponse.message)}</div>
      </div>
    `;
  }

  html += `
    </div>
  `;

  return html;
}

// Render review criteria
function renderReviewCriteria(criteria) {
  const criteriaNames = {
    professionalism: 'Chuyên Nghiệp',
    communication: 'Giao Tiếp',
    knowledgeLevel: 'Kiến Thức',
    patience: 'Kiên Nhẫn',
    effectiveness: 'Hiệu Quả'
  };

  return Object.entries(criteria).map(([key, value]) => {
    if (!value || value < 1 || value > 5) return '';

    const name = criteriaNames[key] || key;
    return `
      <span style="font-size: 0.8rem; background: white; padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid #e5e7eb; color: #6b7280;">
        ${name}: <strong>${value}</strong>
      </span>
    `;
  }).join('');
}

// Render criteria breakdown
function renderCriteriaBreakdown(avgCriteria) {
  const criteriaNames = {
    professionalism: 'Chuyên Nghiệp',
    communication: 'Giao Tiếp',
    knowledgeLevel: 'Kiến Thức',
    patience: 'Kiên Nhẫn',
    effectiveness: 'Hiệu Quả'
  };

  return Object.entries(avgCriteria).map(([key, value]) => {
    if (!value || value < 1 || value > 5) return '';

    const name = criteriaNames[key] || key;
    const percentage = (value / 5) * 100;

    return `
      <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
        <span style="width: 100px; font-size: 0.85rem; color: #4b5563;">${name}</span>
        <div style="flex: 1; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden;">
          <div style="width: ${percentage}%; height: 100%; background: #667eea; border-radius: 3px;"></div>
        </div>
        <span style="width: 30px; font-size: 0.85rem; font-weight: 600; text-align: right;">${value.toFixed(1)}</span>
      </div>
    `;
  }).join('');
}

// Utility function to escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

console.log('✅ Tutor profile page script loaded');