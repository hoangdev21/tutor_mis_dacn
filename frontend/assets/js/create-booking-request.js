// ===== CREATE BOOKING REQUEST JAVASCRIPT =====

const API_BASE_URL = 'http://localhost:5000/api';
let selectedTutor = null;
let tutorHourlyRate = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('📝 Create booking request page loaded');
  
  // Get tutor ID from URL or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const tutorId = urlParams.get('tutorId') || localStorage.getItem('selectedTutorId');

  console.log('🔍 Tutor ID:', tutorId);
  console.log('📍 URL params:', Object.fromEntries(urlParams));
  console.log('💾 LocalStorage tutorId:', localStorage.getItem('selectedTutorId'));

  if (!tutorId) {
    console.error('❌ No tutor ID found');
    showError('Không tìm thấy gia sư. Vui lòng chọn gia sư từ trang tìm kiếm.');
    setTimeout(() => {
      window.location.href = 'find_tutor.html';
    }, 2000);
    return;
  }

  // Load tutor information
  loadTutorInfo(tutorId);

  // Set minimum date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('startDate').min = tomorrow.toISOString().split('T')[0];

  // Add event listeners
  setupEventListeners();
});

// Load tutor information
async function loadTutorInfo(tutorId) {
  const token = localStorage.getItem('token');
  
  console.log('📡 Loading tutor info for ID:', tutorId);
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/tutor/${tutorId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Server error:', errorData);
      throw new Error(errorData.message || 'Failed to load tutor information');
    }

    const data = await response.json();
    console.log('✅ Tutor data loaded:', data);
    
    if (data.success && data.data) {
      selectedTutor = data.data;
      displayTutorInfo(data.data);
      tutorHourlyRate = data.data.profile?.hourlyRate || 0;
      updateSummary();
      console.log('💰 Hourly rate:', tutorHourlyRate);
    } else {
      throw new Error('Invalid tutor data');
    }
  } catch (error) {
    console.error('❌ Load tutor error:', error);
    showError('Không thể tải thông tin gia sư: ' + error.message);
  } finally {
    document.getElementById('tutorLoading').style.display = 'none';
    document.getElementById('tutorInfoContent').style.display = 'block';
  }
}

// Display tutor information
function displayTutorInfo(tutor) {
  const profile = tutor.profile || {};
  const name = profile.fullName || 'Gia sư';
  const avatar = profile.avatar || tutor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff`;
  
  // Update tutor info card
  document.getElementById('tutorAvatar').src = avatar;
  document.getElementById('tutorName').textContent = name;
  
  // Rating
  const rating = profile.averageRating || 0;
  const reviewCount = profile.totalReviews || 0;
  document.getElementById('tutorStars').innerHTML = generateStars(rating);
  document.getElementById('tutorRating').textContent = `${rating.toFixed(1)} (${reviewCount} đánh giá)`;
  
  // Education
  if (profile.education && profile.education.length > 0) {
    const edu = profile.education[0];
    document.getElementById('tutorEducation').textContent = `${edu.degree || ''} - ${edu.institution || edu.university || ''}`.trim();
  }
  
  // Experience
  const experience = profile.yearsOfExperience || 0;
  document.getElementById('tutorExperience').textContent = `${experience} năm kinh nghiệm`;
  
  // Hourly rate
  const hourlyRate = profile.hourlyRate || 0;
  document.getElementById('tutorRate').textContent = formatCurrency(hourlyRate);
}

// Setup event listeners
function setupEventListeners() {
  // Location type change
  document.getElementById('locationType').addEventListener('change', (e) => {
    const addressFields = document.getElementById('addressFields');
    if (e.target.value === 'student_home' || e.target.value === 'other') {
      addressFields.style.display = 'block';
    } else {
      addressFields.style.display = 'none';
    }
  });

  // Schedule inputs change - update summary
  ['daysPerWeek', 'hoursPerSession', 'duration'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateSummary);
  });

  // Form submit
  document.getElementById('bookingForm').addEventListener('submit', handleSubmit);
}

// Update summary
function updateSummary() {
  const daysPerWeek = parseFloat(document.getElementById('daysPerWeek').value) || 0;
  const hoursPerSession = parseFloat(document.getElementById('hoursPerSession').value) || 0;
  const duration = parseFloat(document.getElementById('duration').value) || 0;
  
  const totalHours = daysPerWeek * hoursPerSession * duration;
  const totalAmount = totalHours * tutorHourlyRate;
  
  document.getElementById('totalHours').textContent = `${totalHours} giờ`;
  document.getElementById('hourlyRateDisplay').textContent = formatCurrency(tutorHourlyRate);
  document.getElementById('totalAmount').textContent = formatCurrency(totalAmount);
}

// Handle form submit
async function handleSubmit(e) {
  e.preventDefault();
  
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Vui lòng đăng nhập để gửi yêu cầu');
    window.location.href = '../../index.html';
    return;
  }
  
  if (!selectedTutor) {
    alert('Không tìm thấy thông tin gia sư');
    return;
  }
  
  // Get form data
  const formData = {
    tutorId: selectedTutor._id,
    subject: {
      name: document.getElementById('subjectName').value.trim(),
      level: document.getElementById('subjectLevel').value
    },
    schedule: {
      startDate: document.getElementById('startDate').value,
      preferredTime: document.getElementById('preferredTime').value,
      daysPerWeek: parseInt(document.getElementById('daysPerWeek').value),
      hoursPerSession: parseFloat(document.getElementById('hoursPerSession').value),
      duration: parseInt(document.getElementById('duration').value)
    },
    location: {
      type: document.getElementById('locationType').value,
      address: document.getElementById('address').value.trim(),
      district: document.getElementById('district').value.trim(),
      city: document.getElementById('city').value.trim()
    },
    pricing: {
      hourlyRate: tutorHourlyRate
    },
    description: document.getElementById('description').value.trim(),
    studentNote: document.getElementById('studentNote').value.trim()
  };
  
  // Validate
  if (!formData.subject.name) {
    alert('Vui lòng nhập môn học');
    return;
  }
  
  if (!formData.subject.level) {
    alert('Vui lòng chọn trình độ');
    return;
  }
  
  if (!formData.schedule.startDate) {
    alert('Vui lòng chọn ngày bắt đầu');
    return;
  }
  
  if (!formData.schedule.preferredTime) {
    alert('Vui lòng chọn giờ học');
    return;
  }
  
  if (!formData.location.type) {
    alert('Vui lòng chọn hình thức dạy học');
    return;
  }
  
  // Disable submit button
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
  
  try {
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      // Show success modal
      showSuccessModal();
      
      // Clear form
      document.getElementById('bookingForm').reset();
      
      // Clear localStorage
      localStorage.removeItem('selectedTutorId');
    } else {
      throw new Error(data.message || 'Không thể gửi yêu cầu');
    }
  } catch (error) {
    console.error('Submit error:', error);
    alert(`Lỗi: ${error.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi yêu cầu';
  }
}

// Show success modal
function showSuccessModal() {
  document.getElementById('successModal').classList.add('show');
}

// Close success modal
function closeSuccessModal() {
  document.getElementById('successModal').classList.remove('show');
}

// View booking requests
function viewBookingRequests() {
  window.location.href = 'booking_requests.html';
}

// Go back
function goBack() {
  if (selectedTutor) {
    window.location.href = `tutor_profile_student.html?id=${selectedTutor._id}`;
  } else {
    window.history.back();
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

function showError(message) {
  alert(message);
}

console.log('✅ Create booking request script loaded');
