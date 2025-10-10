// ===== SEARCH PAGE JAVASCRIPT =====

let currentPage = 1;
let totalPages = 1;
const itemsPerPage = 9;
let allTutors = [];
let filteredTutors = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadTutors();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Search on Enter key
  document.getElementById('searchQuery')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  });

  // Filter checkboxes
  document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(input => {
    input.addEventListener('change', applyFilters);
  });

  // Price inputs
  document.getElementById('minPrice')?.addEventListener('change', applyFilters);
  document.getElementById('maxPrice')?.addEventListener('change', applyFilters);
}

// Load tutors from API
async function loadTutors() {
  try {
    showLoading(true);

    const response = await fetch(`${API_BASE_URL}/tutors`);
    const data = await response.json();

    if (data.success) {
      allTutors = data.data.tutors || [];
      filteredTutors = [...allTutors];
      updateResultCount();
      renderTutors();
    } else {
      showEmptyState('Không thể tải danh sách gia sư');
    }
  } catch (error) {
    console.error('Load tutors error:', error);
    showEmptyState('Đã xảy ra lỗi khi tải dữ liệu');
  } finally {
    showLoading(false);
  }
}

// Perform search
function performSearch() {
  const query = document.getElementById('searchQuery').value.toLowerCase().trim();

  if (!query) {
    filteredTutors = [...allTutors];
  } else {
    filteredTutors = allTutors.filter(tutor => {
      const name = tutor.profile?.fullName?.toLowerCase() || '';
      const subjects = tutor.profile?.subjects?.map(s => s.subject.toLowerCase()).join(' ') || '';
      const city = tutor.profile?.address?.city?.toLowerCase() || '';

      return name.includes(query) || subjects.includes(query) || city.includes(query);
    });
  }

  currentPage = 1;
  updateResultCount();
  renderTutors();
}

// Apply filters
function applyFilters() {
  const subjects = getSelectedValues('subject');
  const levels = getSelectedValues('level');
  const experience = document.querySelector('input[name="experience"]:checked')?.value;
  const gender = document.querySelector('input[name="gender"]:checked')?.value;
  const minPrice = parseInt(document.getElementById('minPrice')?.value) || 0;
  const maxPrice = parseInt(document.getElementById('maxPrice')?.value) || Infinity;

  filteredTutors = allTutors.filter(tutor => {
    const tutorSubjects = tutor.profile?.subjects?.map(s => s.subject) || [];
    const tutorLevels = tutor.profile?.subjects?.map(s => s.level) || [];
    const tutorPrice = tutor.profile?.hourlyRate || 0;
    const tutorExperience = tutor.profile?.yearsOfExperience || 0;
    const tutorGender = tutor.profile?.gender;

    // Subject filter
    if (subjects.length > 0 && !tutorSubjects.some(s => subjects.includes(s))) {
      return false;
    }

    // Level filter
    if (levels.length > 0 && !tutorLevels.some(l => levels.includes(l))) {
      return false;
    }

    // Price filter
    if (tutorPrice < minPrice || tutorPrice > maxPrice) {
      return false;
    }

    // Experience filter
    if (experience && experience !== 'all') {
      if (experience === '0-2' && (tutorExperience < 0 || tutorExperience > 2)) return false;
      if (experience === '3-5' && (tutorExperience < 3 || tutorExperience > 5)) return false;
      if (experience === '5+' && tutorExperience < 5) return false;
    }

    // Gender filter
    if (gender && gender !== 'all' && tutorGender !== gender) {
      return false;
    }

    return true;
  });

  currentPage = 1;
  updateResultCount();
  renderTutors();
}

// Apply sorting
function applySorting() {
  const sortBy = document.getElementById('sortBy').value;

  filteredTutors.sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return (b.profile?.rating || 0) - (a.profile?.rating || 0);
      case 'price-low':
        return (a.profile?.hourlyRate || 0) - (b.profile?.hourlyRate || 0);
      case 'price-high':
        return (b.profile?.hourlyRate || 0) - (a.profile?.hourlyRate || 0);
      case 'experience':
        return (b.profile?.yearsOfExperience || 0) - (a.profile?.yearsOfExperience || 0);
      default:
        return 0;
    }
  });

  renderTutors();
}

// Clear filters
function clearFilters() {
  document.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = false;
  });

  document.querySelectorAll('input[type="radio"][value="all"]').forEach(input => {
    input.checked = true;
  });

  document.getElementById('minPrice').value = 0;
  document.getElementById('maxPrice').value = 500000;
  document.getElementById('searchQuery').value = '';

  filteredTutors = [...allTutors];
  currentPage = 1;
  updateResultCount();
  renderTutors();
}

// Render tutors
function renderTutors() {
  const grid = document.getElementById('tutorsGrid');
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const tutorsToShow = filteredTutors.slice(startIndex, endIndex);

  if (tutorsToShow.length === 0) {
    showEmptyState('Không tìm thấy gia sư phù hợp');
    return;
  }

  grid.innerHTML = tutorsToShow.map(tutor => createTutorCard(tutor)).join('');
  updatePagination();
}

// Create tutor card
function createTutorCard(tutor) {
  const profile = tutor.profile || {};
  const name = profile.fullName || 'Gia sư';
  const avatar = profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff`;
  const rating = profile.rating || 0;
  const totalRatings = profile.totalRatings || 0;
  const hourlyRate = profile.hourlyRate || 0;
  const experience = profile.yearsOfExperience || 0;
  const subjects = profile.subjects || [];
  const city = profile.address?.city || 'Chưa cập nhật';
  const isVerified = tutor.approvalStatus === 'approved';

  return `
    <div class="tutor-card" onclick="viewTutorProfile('${tutor._id}')">
      <div class="tutor-header">
        <img src="${avatar}" alt="${name}" class="tutor-avatar">
        <div class="tutor-info">
          <h3 class="tutor-name">${name}</h3>
          <div class="tutor-rating">
            <div class="rating-stars">
              ${generateStars(rating)}
            </div>
            <span class="rating-number">${rating.toFixed(1)} (${totalRatings})</span>
          </div>
          ${isVerified ? '<span class="tutor-verified"><i class="fas fa-check-circle"></i> Đã xác thực</span>' : ''}
        </div>
      </div>

      <div class="tutor-subjects">
        ${subjects.slice(0, 3).map(s => `<span class="subject-tag">${s.subject}</span>`).join('')}
        ${subjects.length > 3 ? `<span class="subject-tag">+${subjects.length - 3}</span>` : ''}
      </div>

      <div class="tutor-details">
        <div class="detail-item">
          <i class="fas fa-graduation-cap"></i>
          <span>${experience} năm kinh nghiệm</span>
        </div>
        <div class="detail-item">
          <i class="fas fa-map-marker-alt"></i>
          <span>${city}</span>
        </div>
        <div class="detail-item">
          <i class="fas fa-users"></i>
          <span>${profile.totalStudents || 0} học sinh</span>
        </div>
      </div>

      <div class="tutor-footer">
        <div class="tutor-price">
          ${formatCurrency(hourlyRate)}
          <span>/giờ</span>
        </div>
        <div class="tutor-actions">
          <button class="btn-icon" onclick="event.stopPropagation(); saveTutor('${tutor._id}')" title="Lưu">
            <i class="fas fa-heart"></i>
          </button>
          <button class="btn-icon" onclick="event.stopPropagation(); contactTutor('${tutor._id}')" title="Liên hệ">
            <i class="fas fa-comment"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Generate stars
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

// View tutor profile
function viewTutorProfile(tutorId) {
  window.location.href = `tutor-profile.html?id=${tutorId}`;
}

// Save tutor
function saveTutor(tutorId) {
  console.log('Save tutor:', tutorId);
  showNotification('Đã lưu gia sư', 'success');
}

// Contact tutor
function contactTutor(tutorId) {
  console.log('Contact tutor:', tutorId);
  window.location.href = `messages.html?tutor=${tutorId}`;
}

// Update result count
function updateResultCount() {
  const countEl = document.getElementById('resultCount');
  if (countEl) {
    countEl.textContent = filteredTutors.length;
  }
}

// Update pagination
function updatePagination() {
  totalPages = Math.ceil(filteredTutors.length / itemsPerPage);
  const pagination = document.getElementById('pagination');
  const numbersContainer = document.getElementById('paginationNumbers');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (totalPages <= 1) {
    pagination.style.display = 'none';
    return;
  }

  pagination.style.display = 'flex';
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;

  // Generate page numbers
  let html = '';
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <button class="page-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
        ${i}
      </button>
    `;
  }

  numbersContainer.innerHTML = html;
}

// Pagination functions
function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    renderTutors();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    renderTutors();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function goToPage(page) {
  currentPage = page;
  renderTutors();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Toggle filters (mobile)
function toggleFilters() {
  const sidebar = document.getElementById('filtersSidebar');
  sidebar.classList.toggle('active');
}

// Helper functions
function getSelectedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
    .map(input => input.value);
}

function showLoading(show) {
  const loading = document.getElementById('loadingState');
  const grid = document.getElementById('tutorsGrid');

  if (show) {
    grid.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Đang tải...</p>
      </div>
    `;
  } else {
    const loadingEl = grid.querySelector('.loading-state');
    if (loadingEl) loadingEl.remove();
  }
}

function showEmptyState(message) {
  const grid = document.getElementById('tutorsGrid');
  grid.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-search"></i>
      <h3>Không tìm thấy kết quả</h3>
      <p>${message}</p>
      <button class="btn btn--primary" onclick="clearFilters()">Xóa bộ lọc</button>
    </div>
  `;
  document.getElementById('pagination').style.display = 'none';
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

function showNotification(message, type = 'info') {
  // Simple notification (you can enhance this)
  alert(message);
}

console.log('🔍 Search page initialized');
