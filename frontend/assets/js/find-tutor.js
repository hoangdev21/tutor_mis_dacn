// ===== FIND TUTOR PAGE JAVASCRIPT =====

const API_BASE_URL = 'http://localhost:5000/api';
let allTutors = [];
let filteredTutors = [];
let currentPage = 1;
const tutorsPerPage = 8; // 4 tutors per row x 2 rows

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '../../index.html';
        return;
    }
    
    // Get user data
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    // Only students can access this page
    if (userData.role !== 'student') {
        alert('Chỉ học sinh mới có thể truy cập trang này');
        window.location.href = '../' + userData.role + '/dashboard.html';
        return;
    }
    
    // Load tutors
    loadTutors();
    
    // Setup event listeners
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', performSearch);
    }
    
    // Subject filters
    document.querySelectorAll('.subject-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.subject-filter').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            applyFilters();
        });
    });
    
    // Sort options
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', applySorting);
    }
}

// Load tutors
async function loadTutors() {
    const container = document.getElementById('tutorsContainer');
    
    try {
        const token = localStorage.getItem('token');
        
        // Fetch approved tutors
        const response = await fetch(`${API_BASE_URL}/auth/tutors?status=approved`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load tutors');
        
        const data = await response.json();
        console.log('📊 API Response:', data);
        console.log('📊 Total tutors:', data.count);
        
        allTutors = data.data || [];
        console.log('👥 Tutors data:', allTutors);
        
        // Log avatar info
        allTutors.forEach((tutor, index) => {
            console.log(`${index + 1}. ${tutor.profile?.fullName || 'N/A'}`);
            console.log(`   Avatar: ${tutor.avatar || tutor.profile?.avatar || 'NO AVATAR'}`);
            console.log(`   University Image: ${tutor.profile?.universityImage || 'NO IMAGE'}`);
        });
        
        filteredTutors = [...allTutors];
        
        renderTutors();
        
    } catch (error) {
        console.error('Error loading tutors:', error);
        container.innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Không thể tải danh sách gia sư. Vui lòng thử lại sau.</p>
            </div>
        `;
    }
}

// Render tutors
function renderTutors() {
    const container = document.getElementById('tutorsContainer');
    
    if (filteredTutors.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-graduate"></i>
                <h3>Không tìm thấy gia sư</h3>
                <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
        `;
        return;
    }
    
    // Pagination
    const startIndex = (currentPage - 1) * tutorsPerPage;
    const endIndex = startIndex + tutorsPerPage;
    const tutorsToShow = filteredTutors.slice(startIndex, endIndex);
    
    container.innerHTML = `
        <div class="tutors-grid">
            ${tutorsToShow.map(tutor => renderTutorCard(tutor)).join('')}
        </div>
        ${renderPagination()}
    `;
}

// Render tutor card
function renderTutorCard(tutor) {
    const profile = tutor.profile || {};
    const subjects = profile.subjects || [];
    const rating = profile.averageRating || 0;
    const reviewCount = profile.totalReviews || 0;
    const hourlyRate = profile.hourlyRate || 0;
    
    // Format address
    let address = 'Chưa cập nhật';
    if (profile.address) {
        if (typeof profile.address === 'string') {
            address = profile.address;
        } else {
            const addressParts = [
                profile.address.city,
                profile.address.district
            ].filter(Boolean);
            address = addressParts.length > 0 ? addressParts.join(', ') : 'Chưa cập nhật';
        }
    }
    
    // Format subjects list
    let subjectsList = [];
    if (subjects && subjects.length > 0) {
        subjectsList = subjects.map(s => {
            if (typeof s === 'string') return s;
            return s.subject || s.name || '';
        }).filter(Boolean);
    }
    
    // Get avatar - prioritize profile.avatar, fallback to tutor.avatar, then default
    const avatarUrl = profile.avatar || tutor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName || 'Tutor')}&background=667eea&color=fff`;
    
    return `
        <div class="tutor-card">
            <div class="tutor-card-header" style="background: linear-gradient(135deg, #64c0e1ff 0%, #ae5780ff 100%); position: relative;">
                <img src="${avatarUrl}" 
                     alt="${profile.fullName || 'Tutor'}" 
                     class="tutor-avatar"
                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName || 'Tutor')}&background=667eea&color=fff'">
                ${tutor.approvalStatus === 'approved' ? '<span class="verified-badge"><i class="fas fa-check-circle"></i></span>' : ''}
            </div>
            
            <div class="tutor-card-body">
                <h3 class="tutor-name">${profile.fullName || 'Chưa cập nhật'}</h3>
                
                <div class="tutor-rating">
                    <div class="stars">
                        ${renderStars(rating)}
                    </div>
                    <span class="rating-text">${rating.toFixed(1)} (${reviewCount} đánh giá)</span>
                </div>
                
                <div class="tutor-info">
                    <div class="info-item">
                        <i class="fas fa-briefcase"></i>
                        <span>${profile.yearsOfExperience || 0} năm kinh nghiệm</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${address}</span>
                    </div>
                </div>
                
                <div class="tutor-subjects">
                    ${subjectsList.slice(0, 3).map(subject => `
                        <span class="subject-tag">${subject}</span>
                    `).join('')}
                    ${subjectsList.length > 3 ? `<span class="subject-tag">+${subjectsList.length - 3}</span>` : ''}
                </div>
                
                <div class="tutor-price">
                    <span class="price-label">Học phí:</span>
                    <span class="price-value">${formatCurrency(hourlyRate)}/giờ</span>
                </div>
            </div>

            <div class="tutor-card-footer">
                <button class="btn btn-outline" onclick="viewTutorProfile('${tutor._id}')">
                    <i class="fas fa-eye"></i>
                    Xem Hồ Sơ
                </button>
                <button class="btn btn-primary" onclick="sendMessage('${tutor._id}')" style="background: linear-gradient(135deg, #3a9286ff 0%, #4ebd62ff 100%);">
                    <i class="fas fa-comment"></i>
                    Nhắn Tin
                </button>
            </div>
        </div>
    `;
}

// Render stars
function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let html = '';
    for (let i = 0; i < fullStars; i++) {
        html += '<i class="fas fa-star"></i>';
    }
    if (hasHalfStar) {
        html += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
        html += '<i class="far fa-star"></i>';
    }
    
    return html;
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredTutors.length / tutorsPerPage);
    
    if (totalPages <= 1) return '';
    
    let html = '<div class="pagination">';
    
    // Previous button
    html += `
        <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                onclick="changePage(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                        onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += '<span class="pagination-dots">...</span>';
        }
    }
    
    // Next button
    html += `
        <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                onclick="changePage(${currentPage + 1})" 
                ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    html += '</div>';
    return html;
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(filteredTutors.length / tutorsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderTutors();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Perform search
function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    filteredTutors = allTutors.filter(tutor => {
        const profile = tutor.profile || {};
        const fullName = (profile.fullName || '').toLowerCase();
        const subjects = (profile.subjects || []).join(' ').toLowerCase();
        const bio = (profile.bio || '').toLowerCase();
        
        return fullName.includes(searchTerm) || 
               subjects.includes(searchTerm) || 
               bio.includes(searchTerm);
    });
    
    currentPage = 1;
    renderTutors();
}

// Apply filters
function applyFilters() {
    const activeSubject = document.querySelector('.subject-filter.active');
    const subject = activeSubject ? activeSubject.getAttribute('data-subject') : 'all';
    
    if (subject === 'all') {
        filteredTutors = [...allTutors];
    } else {
        filteredTutors = allTutors.filter(tutor => {
            const profile = tutor.profile || {};
            const subjects = profile.subjects || [];
            return subjects.some(s => s.toLowerCase().includes(subject.toLowerCase()));
        });
    }
    
    currentPage = 1;
    applySorting();
}

// Apply sorting
function applySorting() {
    const sortSelect = document.getElementById('sortSelect');
    if (!sortSelect) return;
    
    const sortBy = sortSelect.value;
    
    switch (sortBy) {
        case 'rating':
            filteredTutors.sort((a, b) => {
                const ratingA = a.profile?.averageRating || 0;
                const ratingB = b.profile?.averageRating || 0;
                return ratingB - ratingA;
            });
            break;
        case 'price-asc':
            filteredTutors.sort((a, b) => {
                const priceA = a.profile?.hourlyRate || 0;
                const priceB = b.profile?.hourlyRate || 0;
                return priceA - priceB;
            });
            break;
        case 'price-desc':
            filteredTutors.sort((a, b) => {
                const priceA = a.profile?.hourlyRate || 0;
                const priceB = b.profile?.hourlyRate || 0;
                return priceB - priceA;
            });
            break;
        case 'experience':
            filteredTutors.sort((a, b) => {
                const expA = a.profile?.yearsOfExperience || 0;
                const expB = b.profile?.yearsOfExperience || 0;
                return expB - expA;
            });
            break;
        default:
            // Default: newest first
            break;
    }
    
    renderTutors();
}

// View tutor profile
function viewTutorProfile(tutorId) {
    window.location.href = `tutor_profile.html?id=${tutorId}`;
}

// Send message
function sendMessage(tutorId) {
    window.location.href = `messages.html?recipientId=${tutorId}`;
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}
