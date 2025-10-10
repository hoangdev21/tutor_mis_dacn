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
  // Prioritize profile.avatar, fallback to tutor.avatar, then default
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
      'home': 'Dạy tại nhà gia sư',
      'student_home': 'Dạy tại nhà học sinh',
      'online': 'Dạy online'
    };
    locationsStr = teachingLocations.map(loc => locationMap[loc] || loc).join(', ');
  }
  
  // Render HTML
  container.innerHTML = `
    <div class="profile-layout">
      <!-- Sidebar -->
      <aside class="profile-sidebar">
        <div class="tutor-card-profile">
          <div class="tutor-avatar-large">
            <img src="${avatar}" alt="${name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff'">
            ${profile.universityImage ? `
            <div class="university-badge" title="Trường đại học">
              <img src="${profile.universityImage}" alt="University" onerror="this.style.display='none'">
            </div>
            ` : ''}
          </div>
          
          <div class="tutor-basic-info">
            <h1>${name}</h1>
            <div class="tutor-rating">
              <div class="stars">${generateStars(rating)}</div>
              <span>${rating.toFixed(1)} (${reviewCount} đánh giá)</span>
            </div>
            <div class="tutor-status ${currentTutor.approvalStatus === 'approved' ? 'verified' : 'pending'}">
              ${currentTutor.approvalStatus === 'approved' 
                ? '<i class="fas fa-check-circle"></i> Đã xác thực' 
                : '<i class="fas fa-clock"></i> Đang chờ xác thực'}
            </div>
          </div>
          
          <div class="tutor-stats">
            <div class="stat-item">
              <div class="stat-value">${yearsOfExp}</div>
              <div class="stat-label">Năm kinh nghiệm</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${totalStudents}</div>
              <div class="stat-label">Học sinh</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${totalLessons}</div>
              <div class="stat-label">Buổi học</div>
            </div>
          </div>
          
          <div class="tutor-price-card">
            <div class="price-label">Học phí</div>
            <div class="price-value" style="font-size: 24px;">${formatCurrency(hourlyRate)}/giờ</div>
          </div>
          
          <div class="action-buttons">
            <button class="btn btn-primary btn-block" onclick="contactTutor()">
              <i class="fas fa-comment"></i>
              Liên Hệ
            </button>
            <button class="btn btn-outline btn-block" onclick="requestTutor()">
              <i class="fas fa-paper-plane"></i>
              Gửi Yêu Cầu
            </button>
          </div>
        </div>
      </aside>
      
      <!-- Main Content -->
      <main class="profile-main">
        <!-- About Section -->
        <section class="profile-section">
          <div class="section-header">
            <h2><i class="fas fa-user"></i> Giới Thiệu</h2>
          </div>
          <div class="section-content">
            <p class="bio-text">${bio}</p>
          </div>
        </section>
        
        <!-- Subjects Section -->
        <section class="profile-section">
          <div class="section-header">
            <h2><i class="fas fa-book"></i> Môn Học Giảng Dạy</h2>
          </div>
          <div class="section-content">
            <div class="subjects-grid">
              ${renderSubjects(profile.subjects || [])}
            </div>
          </div>
        </section>
        
        <!-- Education Section -->
        ${(profile.education && profile.education.length > 0) ? `
        <section class="profile-section">
          <div class="section-header">
            <h2><i class="fas fa-graduation-cap"></i> Học Vấn</h2>
          </div>
          <div class="section-content">
            <div class="timeline">
              ${renderEducation(profile.education)}
            </div>
          </div>
        </section>
        ` : ''}
        
        <!-- Work Experience Section -->
        ${(profile.workExperience && profile.workExperience.length > 0) ? `
        <section class="profile-section">
          <div class="section-header">
            <h2><i class="fas fa-briefcase"></i> Kinh Nghiệm Làm Việc</h2>
          </div>
          <div class="section-content">
            <div class="timeline">
              ${renderWorkExperience(profile.workExperience)}
            </div>
          </div>
        </section>
        ` : ''}
        
        <!-- Certificates Section -->
        ${(profile.certificates && profile.certificates.length > 0) ? `
        <section class="profile-section">
          <div class="section-header">
            <h2><i class="fas fa-certificate"></i> Chứng Chỉ</h2>
          </div>
          <div class="section-content">
            <div class="certificates-grid">
              ${renderCertificates(profile.certificates)}
            </div>
          </div>
        </section>
        ` : ''}
        
        <!-- Availability Section -->
        ${(profile.availability && profile.availability.length > 0) ? `
        <section class="profile-section">
          <div class="section-header">
            <h2><i class="fas fa-clock"></i> Lịch Rảnh</h2>
          </div>
          <div class="section-content">
            <div class="availability-grid">
              ${renderAvailability(profile.availability)}
            </div>
          </div>
        </section>
        ` : ''}
        
        <!-- Location Section -->
        <section class="profile-section">
          <div class="section-header">
            <h2><i class="fas fa-map-marker-alt"></i> Địa Điểm Dạy Học</h2>
          </div>
          <div class="section-content">
            <div class="location-info">
              <div class="info-row">
                <i class="fas fa-home"></i>
                <div>
                  <strong>Địa chỉ:</strong>
                  <span>${addressStr}</span>
                </div>
              </div>
              <div class="info-row">
                <i class="fas fa-location-arrow"></i>
                <div>
                  <strong>Hình thức dạy:</strong>
                  <span>${locationsStr}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  `;
}

// Render subjects
function renderSubjects(subjects) {
  if (!subjects || subjects.length === 0) {
    return '<p class="empty-message">Chưa có môn học nào</p>';
  }

  return subjects.map(subject => {
    let subjectName = '';
    let level = '';
    let experience = 0;
    
    if (typeof subject === 'string') {
      subjectName = subject;
    } else {
      subjectName = subject.subject || subject.name || '';
      level = subject.level || '';
      experience = subject.experience || 0;
    }
    
    return `
      <div class="subject-card">
        <div class="subject-header">
          <div class="subject-icon">
            <i class="fas fa-book"></i>
          </div>
          <div class="subject-name">${subjectName}</div>
        </div>
        ${level || experience ? `
        <div class="subject-details">
          ${level ? `
          <div class="subject-detail">
            <i class="fas fa-layer-group"></i>
            <span>${level}</span>
          </div>
          ` : ''}
          ${experience ? `
          <div class="subject-detail">
            <i class="fas fa-clock"></i>
            <span>${experience} năm kinh nghiệm</span>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Render education
function renderEducation(education) {
  return education.map(edu => {
    // Use institution first, fallback to university
    const schoolName = edu.institution || edu.university || 'Trường';
    
    // Use endYear if available, otherwise use graduationYear
    const yearEnd = edu.endYear || edu.graduationYear;
    
    // Format the year range
    let yearRange = '';
    if (edu.startYear && yearEnd) {
      yearRange = `${edu.startYear} - ${yearEnd}`;
    } else if (edu.startYear) {
      yearRange = `${edu.startYear} - Hiện tại`;
    } else if (yearEnd) {
      yearRange = `Năm tốt nghiệp: ${yearEnd}`;
    } else if (edu.graduationYear) {
      yearRange = `Năm tốt nghiệp: ${edu.graduationYear}`;
    }
    
    return `
    <div class="timeline-item">
      <div class="timeline-content">
        <div class="timeline-title">${edu.degree || 'Học vị'}</div>
        <div class="timeline-subtitle">${schoolName}</div>
        ${edu.major ? `<div class="timeline-major"><i class="fas fa-book-open"></i> Chuyên ngành: <strong>${edu.major}</strong></div>` : ''}
        ${yearRange ? `<div class="timeline-date">${yearRange}</div>` : ''}
        ${edu.gpa ? `<div class="timeline-gpa"><i class="fas fa-star"></i> GPA: <strong>${edu.gpa}/4.0</strong></div>` : ''}
        ${edu.description ? `<div class="timeline-description">${edu.description}</div>` : ''}
      </div>
    </div>
  `;
  }).join('');
}

// Render work experience
function renderWorkExperience(experience) {
  return experience.map(exp => `
    <div class="timeline-item">
      <div class="timeline-content">
        <div class="timeline-title">${exp.position || 'Vị trí'}</div>
        <div class="timeline-subtitle">${exp.company || 'Công ty'}</div>
        <div class="timeline-date">
          ${exp.startYear || ''} ${exp.endYear ? `- ${exp.endYear}` : '- Hiện tại'}
        </div>
        ${exp.description ? `<div class="timeline-description">${exp.description}</div>` : ''}
      </div>
    </div>
  `).join('');
}

// Render certificates
function renderCertificates(certificates) {
  return certificates.map(cert => `
    <div class="certificate-card">
      <div class="certificate-icon">
        <i class="fas fa-award"></i>
      </div>
      <div class="certificate-name">${cert.name || 'Chứng chỉ'}</div>
      ${cert.issuer ? `<div class="certificate-issuer">${cert.issuer}</div>` : ''}
      ${cert.year ? `<div class="certificate-year">${cert.year}</div>` : ''}
    </div>
  `).join('');
}

// Render availability
function renderAvailability(availability) {
  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

  return days.map((day, index) => {
    const dayData = availability.find(a => a.day === (index + 1));
    const isAvailable = dayData && dayData.slots && dayData.slots.length > 0;

    return `
      <div class="availability-day ${isAvailable ? 'available' : ''}">
        <span class="day-name">${day}</span>
        <div class="day-times">
          ${isAvailable 
            ? dayData.slots.map(slot => `${slot.start || ''} - ${slot.end || ''}`).join('<br>') 
            : 'Không có'}
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
    console.log('� Stored tutor data:', currentTutor.profile?.fullName);
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

console.log('✅ Tutor profile page script loaded');
