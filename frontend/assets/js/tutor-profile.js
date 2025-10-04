// ===== TUTOR PROFILE PAGE JAVASCRIPT =====

const API_BASE_URL = 'http://localhost:5000/api';
let currentTutor = null;
let tutorId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Get tutor ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  tutorId = urlParams.get('id');

  if (!tutorId) {
    alert('Không tìm thấy thông tin gia sư');
    goBack();
    return;
  }

  loadTutorProfile();
});

// Load tutor profile
async function loadTutorProfile() {
  const container = document.getElementById('profileContainer');
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/auth/tutor/${tutorId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load tutor');
    
    const data = await response.json();
    currentTutor = data.data;
    renderProfile();
    
  } catch (error) {
    console.error('Load profile error:', error);
    container.innerHTML = `
      <div class="alert alert-error">
        <i class="fas fa-exclamation-circle"></i>
        <p>Không thể tải thông tin gia sư. Vui lòng thử lại sau.</p>
      </div>
    `;
  }
}

// Render profile
function renderProfile() {
  const container = document.getElementById('profileContainer');
  const profile = currentTutor.profile || {};

  // Basic info
  const name = profile.fullName || 'Gia sư';
  const avatar = currentTutor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff`;
  
  // Rating
  const rating = profile.averageRating || 0;
  const reviewCount = profile.totalReviews || 0;
  const totalRatings = profile.totalRatings || 0;
  document.getElementById('ratingStars').innerHTML = generateStars(rating);
  document.getElementById('ratingText').textContent = `${rating.toFixed(1)} (${totalRatings} đánh giá)`;

  // Status
  const statusEl = document.getElementById('tutorStatus');
  if (currentTutor.approvalStatus === 'approved') {
    statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Đã xác thực';
    statusEl.className = 'tutor-status verified';
  } else {
    statusEl.innerHTML = '<i class="fas fa-clock"></i> Đang chờ xác thực';
    statusEl.className = 'tutor-status pending';
  }

  // Stats
  document.getElementById('experienceYears').textContent = profile.yearsOfExperience || 0;
  document.getElementById('totalStudents').textContent = profile.totalStudents || 0;
  document.getElementById('totalLessons').textContent = profile.totalLessons || 0;

  // Price
  document.getElementById('hourlyRate').textContent = formatCurrency(profile.hourlyRate || 0);

  // Bio
  document.getElementById('tutorBio').textContent = profile.bio || 'Chưa có giới thiệu';

  // Subjects
  renderSubjects(profile.subjects || []);

  // Location
  const address = profile.address || {};
  const fullAddress = [address.street, address.ward, address.district, address.city]
    .filter(Boolean)
    .join(', ');
  document.getElementById('tutorAddress').textContent = fullAddress || 'Chưa cập nhật';
  
  const teachingLocation = profile.teachingLocation || [];
  const locations = [];
  if (teachingLocation.includes('home')) locations.push('Dạy tại nhà');
  if (teachingLocation.includes('student_home')) locations.push('Dạy tại nhà học sinh');
  if (teachingLocation.includes('online')) locations.push('Dạy online');
  document.getElementById('teachingLocation').textContent = locations.join(', ') || 'Chưa cập nhật';

  // Availability
  renderAvailability(profile.availability || []);

  // Education
  renderEducation(profile.education || []);

  // Work Experience
  renderWorkExperience(profile.workExperience || []);

  // Certificates
  renderCertificates(profile.certificates || []);

  // Populate booking form
  populateBookingForm(profile.subjects || []);
}

// Render subjects
function renderSubjects(subjects) {
  const grid = document.getElementById('subjectsGrid');

  if (subjects.length === 0) {
    grid.innerHTML = '<p>Chưa có môn học</p>';
    return;
  }

  grid.innerHTML = subjects.map(subject => `
    <div class="subject-card">
      <div class="subject-header">
        <div class="subject-icon">
          <i class="fas fa-book"></i>
        </div>
        <div class="subject-name">${subject.subject}</div>
      </div>
      <div class="subject-details">
        <div class="subject-detail">
          <i class="fas fa-layer-group"></i>
          <span>${subject.level}</span>
        </div>
        <div class="subject-detail">
          <i class="fas fa-clock"></i>
          <span>${subject.experience || 0} năm kinh nghiệm</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Render availability
function renderAvailability(availability) {
  const grid = document.getElementById('availabilityGrid');

  if (availability.length === 0) {
    grid.innerHTML = '<p>Chưa cập nhật lịch rảnh</p>';
    return;
  }

  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

  grid.innerHTML = days.map((day, index) => {
    const dayData = availability.find(a => a.day === index + 1);
    const isAvailable = dayData && dayData.slots && dayData.slots.length > 0;

    return `
      <div class="availability-day ${isAvailable ? 'available' : ''}">
        <span class="day-name">${day}</span>
        <div class="day-times">
          ${isAvailable ? dayData.slots.map(slot => `${slot.start} - ${slot.end}`).join('<br>') : 'Không có'}
        </div>
      </div>
    `;
  }).join('');
}

// Render education
function renderEducation(education) {
  const timeline = document.getElementById('educationTimeline');

  if (education.length === 0) {
    timeline.innerHTML = '<p>Chưa có thông tin học vấn</p>';
    return;
  }

  timeline.innerHTML = education.map(edu => `
    <div class="timeline-item">
      <div class="timeline-content">
        <div class="timeline-title">${edu.degree || 'Học vị'}</div>
        <div class="timeline-subtitle">${edu.institution || 'Trường'}</div>
        <div class="timeline-date">
          ${edu.startYear || ''} - ${edu.endYear || 'Hiện tại'}
        </div>
        ${edu.description ? `<div class="timeline-description">${edu.description}</div>` : ''}
      </div>
    </div>
  `).join('');
}

// Render work experience
function renderWorkExperience(experience) {
  const timeline = document.getElementById('workTimeline');

  if (experience.length === 0) {
    timeline.innerHTML = '<p>Chưa có kinh nghiệm làm việc</p>';
    return;
  }

  timeline.innerHTML = experience.map(exp => `
    <div class="timeline-item">
      <div class="timeline-content">
        <div class="timeline-title">${exp.position || 'Vị trí'}</div>
        <div class="timeline-subtitle">${exp.company || 'Công ty'}</div>
        <div class="timeline-date">
          ${exp.startYear || ''} - ${exp.endYear || 'Hiện tại'}
        </div>
        ${exp.description ? `<div class="timeline-description">${exp.description}</div>` : ''}
      </div>
    </div>
  `).join('');
}

// Render certificates
function renderCertificates(certificates) {
  const grid = document.getElementById('certificatesGrid');

  if (certificates.length === 0) {
    grid.innerHTML = '<p>Chưa có chứng chỉ</p>';
    return;
  }

  grid.innerHTML = certificates.map(cert => `
    <div class="certificate-card">
      <div class="certificate-icon">
        <i class="fas fa-award"></i>
      </div>
      <div class="certificate-name">${cert.name}</div>
      <div class="certificate-issuer">${cert.issuer || ''}</div>
      <div class="certificate-year">${cert.year || ''}</div>
    </div>
  `).join('');
}

// Load reviews
async function loadReviews() {
  try {
    const response = await fetch(`${API_BASE_URL}/reviews?tutorId=${tutorId}`);
    const data = await response.json();

    if (data.success) {
      renderReviewsSummary(data.data.reviews || []);
      renderReviewsList(data.data.reviews || []);
    }
  } catch (error) {
    console.error('Load reviews error:', error);
  }
}

// Render reviews summary
function renderReviewsSummary(reviews) {
  const avgRating = currentTutor.profile?.rating || 0;
  const totalReviews = reviews.length;

  document.getElementById('avgRating').textContent = avgRating.toFixed(1);
  document.getElementById('avgRatingStars').innerHTML = generateStars(avgRating);
  document.getElementById('totalReviews').textContent = `${totalReviews} đánh giá`;

  // Rating breakdown
  const ratingCounts = [0, 0, 0, 0, 0];
  reviews.forEach(review => {
    const rating = Math.floor(review.rating);
    if (rating >= 1 && rating <= 5) {
      ratingCounts[rating - 1]++;
    }
  });

  for (let i = 1; i <= 5; i++) {
    const count = ratingCounts[i - 1];
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
    
    document.getElementById(`rating${i}Count`).textContent = count;
    document.getElementById(`rating${i}Bar`).style.width = `${percentage}%`;
  }
}

// Render reviews list
function renderReviewsList(reviews) {
  const list = document.getElementById('reviewsList');

  if (reviews.length === 0) {
    list.innerHTML = '<p>Chưa có đánh giá nào</p>';
    return;
  }

  list.innerHTML = reviews.slice(0, 5).map(review => {
    const student = review.student || {};
    const avatar = student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fullName || 'S')}&background=random`;

    return `
      <div class="review-card">
        <div class="review-header">
          <img src="${avatar}" alt="${student.fullName || 'Student'}" class="reviewer-avatar">
          <div class="reviewer-info">
            <h4>${student.fullName || 'Học sinh'}</h4>
            <div class="review-meta">
              <div class="review-rating">${generateStars(review.rating)}</div>
              <span>${formatDate(review.createdAt)}</span>
            </div>
          </div>
        </div>
        <div class="review-content">
          ${review.comment || ''}
        </div>
      </div>
    `;
  }).join('');

  // Show load more button if needed
  if (reviews.length > 5) {
    document.getElementById('loadMoreReviews').style.display = 'block';
  }
}

// Tab switching
function switchTab(tabName) {
  // Remove active class from all tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  // Add active class to selected tab
  event.target.classList.add('active');
  document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Booking functions
function bookTutor() {
  document.getElementById('bookingModal').classList.add('active');
}

function closeBookingModal() {
  document.getElementById('bookingModal').classList.remove('active');
}

function populateBookingForm(subjects) {
  const select = document.getElementById('bookingSubject');
  select.innerHTML = '<option value="">Chọn môn học</option>' +
    subjects.map(s => `<option value="${s.subject}">${s.subject}</option>`).join('');

  // Set min date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('bookingDate').min = today;

  // Update price on change
  document.getElementById('bookingDuration').addEventListener('change', updateBookingSummary);
  updateBookingSummary();
}

function updateBookingSummary() {
  const duration = parseFloat(document.getElementById('bookingDuration').value) || 1;
  const hourlyRate = currentTutor.profile?.hourlyRate || 0;
  const fee = hourlyRate * duration;
  const serviceFee = fee * 0.1; // 10% service fee
  const total = fee + serviceFee;

  document.getElementById('summaryFee').textContent = formatCurrency(fee);
  document.getElementById('summaryService').textContent = formatCurrency(serviceFee);
  document.getElementById('summaryTotal').textContent = formatCurrency(total);
}

async function submitBooking(event) {
  event.preventDefault();

  const bookingData = {
    tutorId: tutorId,
    subject: document.getElementById('bookingSubject').value,
    date: document.getElementById('bookingDate').value,
    time: document.getElementById('bookingTime').value,
    duration: document.getElementById('bookingDuration').value,
    location: document.getElementById('bookingLocation').value,
    note: document.getElementById('bookingNote').value
  };

  try {
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(bookingData)
    });

    const data = await response.json();

    if (data.success) {
      alert('Đặt lịch thành công! Gia sư sẽ liên hệ với bạn sớm.');
      closeBookingModal();
    } else {
      alert(data.message || 'Đặt lịch thất bại');
    }
  } catch (error) {
    console.error('Booking error:', error);
    alert('Đã xảy ra lỗi khi đặt lịch');
  }
}

// Contact tutor
function contactTutor() {
  window.location.href = `messages.html?tutor=${tutorId}`;
}

// Save tutor
function saveTutor() {
  const btn = document.getElementById('saveBtn');
  const icon = btn.querySelector('i');
  
  if (btn.classList.contains('saved')) {
    btn.classList.remove('saved');
    icon.className = 'far fa-heart';
    showNotification('Đã bỏ lưu gia sư');
  } else {
    btn.classList.add('saved');
    icon.className = 'fas fa-heart';
    showNotification('Đã lưu gia sư');
  }
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

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN');
}

function showNotification(message) {
  alert(message);
}

function showError(message) {
  alert(message);
  goBack();
}

// Go back to previous page
function goBack() {
  if (document.referrer) {
    window.history.back();
  } else {
    window.location.href = 'find_tutor.html';
  }
}

console.log('👤 Tutor profile page initialized');
