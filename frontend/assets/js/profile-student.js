// ===== STUDENT PROFILE PAGE JAVASCRIPT =====

// API_BASE_URL is already defined in main.js
// const API_BASE_URL = 'http://localhost:5000/api';
let isEditMode = false;
let currentProfile = null;
let originalFormData = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Edit profile button
    document.getElementById('editProfileBtn').addEventListener('click', enableEditMode);
    
    // Save profile button
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
    
    // Cancel edit button
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
    
    // Change avatar button
    document.getElementById('changeAvatarBtn').addEventListener('click', () => {
        document.getElementById('avatarInput').click();
    });
    
    // Avatar input change
    document.getElementById('avatarInput').addEventListener('change', handleAvatarChange);
}

// Load profile
async function loadProfile() {
    try {
        showLoading();
        
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/student/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Không thể tải thông tin hồ sơ');
        }
        
        const data = await response.json();
        currentProfile = data.data;
        
        // Update UI
        populateProfile(currentProfile);
        
        hideLoading();
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Lỗi khi tải thông tin hồ sơ', 'error');
        hideLoading();
    }
}

// Populate profile data
function populateProfile(profile) {
    // Header info
    document.getElementById('profileName').textContent = profile.fullName || 'Chưa cập nhật';
    document.getElementById('profileEmail').textContent = profile.email || '';
    
    // Avatar
    console.log('Setting student avatar:', profile.avatar);
    const avatarUrl = profile.avatar || '../../assets/images/avatar/default-avatar.png';
    const profileAvatar = document.getElementById('profileAvatar');
    const userAvatar = document.getElementById('userAvatar');
    
    if (profileAvatar) {
        profileAvatar.src = avatarUrl;
        console.log('Profile avatar set to:', avatarUrl);
    }
    if (userAvatar) {
        userAvatar.src = avatarUrl;
        console.log('User avatar set to:', avatarUrl);
    }
    
    // Form fields
    document.getElementById('fullName').value = profile.fullName || '';
    document.getElementById('dateOfBirth').value = profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '';
    document.getElementById('gender').value = profile.gender || '';
    document.getElementById('phone').value = profile.phone || '';
    document.getElementById('address').value = profile.address || '';
    document.getElementById('city').value = profile.city || '';
    document.getElementById('district').value = profile.district || '';
    document.getElementById('schoolName').value = profile.schoolName || '';
    document.getElementById('currentGrade').value = profile.currentGrade || '';
    document.getElementById('bio').value = profile.bio || '';
    document.getElementById('learningGoals').value = profile.learningGoals || '';
    
    // Interested subjects
    if (profile.interestedSubjects && profile.interestedSubjects.length > 0) {
        const checkboxes = document.querySelectorAll('input[name="subjects"]');
        checkboxes.forEach(checkbox => {
            if (profile.interestedSubjects.includes(checkbox.value)) {
                checkbox.checked = true;
            }
        });
    }
    
    // Save original form data
    originalFormData = getFormData();
}

// Enable edit mode
function enableEditMode() {
    isEditMode = true;
    
    // Show/hide buttons
    document.getElementById('editProfileBtn').style.display = 'none';
    document.getElementById('saveProfileBtn').style.display = 'inline-flex';
    document.getElementById('cancelEditBtn').style.display = 'inline-flex';
    
    // Enable all form fields
    const formControls = document.querySelectorAll('.form-control, input[name="subjects"]');
    formControls.forEach(control => {
        control.disabled = false;
    });
    
    // Save original data for cancel
    originalFormData = getFormData();
}

// Disable edit mode
function disableEditMode() {
    isEditMode = false;
    
    // Show/hide buttons
    document.getElementById('editProfileBtn').style.display = 'inline-flex';
    document.getElementById('saveProfileBtn').style.display = 'none';
    document.getElementById('cancelEditBtn').style.display = 'none';
    
    // Disable all form fields
    const formControls = document.querySelectorAll('.form-control, input[name="subjects"]');
    formControls.forEach(control => {
        control.disabled = true;
    });
}

// Cancel edit
function cancelEdit() {
    if (originalFormData && currentProfile) {
        setFormData(originalFormData);
    }
    disableEditMode();
}

// Get form data
function getFormData() {
    const interestedSubjects = [];
    document.querySelectorAll('input[name="subjects"]:checked').forEach(checkbox => {
        interestedSubjects.push(checkbox.value);
    });
    
    return {
        fullName: document.getElementById('fullName').value,
        dateOfBirth: document.getElementById('dateOfBirth').value,
        gender: document.getElementById('gender').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        district: document.getElementById('district').value,
        schoolName: document.getElementById('schoolName').value,
        currentGrade: document.getElementById('currentGrade').value,
        bio: document.getElementById('bio').value,
        learningGoals: document.getElementById('learningGoals').value,
        interestedSubjects: interestedSubjects
    };
}

// Set form data
function setFormData(data) {
    document.getElementById('fullName').value = data.fullName || '';
    document.getElementById('dateOfBirth').value = data.dateOfBirth || '';
    document.getElementById('gender').value = data.gender || '';
    document.getElementById('phone').value = data.phone || '';
    document.getElementById('address').value = data.address || '';
    document.getElementById('city').value = data.city || '';
    document.getElementById('district').value = data.district || '';
    document.getElementById('schoolName').value = data.schoolName || '';
    document.getElementById('currentGrade').value = data.currentGrade || '';
    document.getElementById('bio').value = data.bio || '';
    document.getElementById('learningGoals').value = data.learningGoals || '';
    
    // Set checkboxes
    document.querySelectorAll('input[name="subjects"]').forEach(checkbox => {
        checkbox.checked = data.interestedSubjects.includes(checkbox.value);
    });
}

// Save profile
async function saveProfile() {
    try {
        // Validate required fields
        const fullName = document.getElementById('fullName').value.trim();
        const dateOfBirth = document.getElementById('dateOfBirth').value;
        const gender = document.getElementById('gender').value;
        const phone = document.getElementById('phone').value.trim();
        
        if (!fullName || !dateOfBirth || !gender || !phone) {
            showNotification('Vui lòng điền đầy đủ các thông tin bắt buộc (*)', 'error');
            return;
        }
        
        // Validate phone number
        const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
        if (!phoneRegex.test(phone)) {
            showNotification('Số điện thoại không hợp lệ', 'error');
            return;
        }
        
        showLoading();
        
        const formData = getFormData();
        const token = localStorage.getItem('accessToken');
        
        const response = await fetch(`${API_BASE_URL}/student/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Không thể cập nhật hồ sơ');
        }
        
        currentProfile = data.data;
        populateProfile(currentProfile);
        disableEditMode();
        
        showNotification('Cập nhật hồ sơ thành công!', 'success');
        hideLoading();
        
    } catch (error) {
        console.error('Error saving profile:', error);
        showNotification(error.message || 'Lỗi khi cập nhật hồ sơ', 'error');
        hideLoading();
    }
}

// Handle avatar change
async function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Vui lòng chọn file ảnh', 'error');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Kích thước ảnh không được vượt quá 5MB', 'error');
        return;
    }
    
    try {
        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (e) => {
            const profileAvatar = document.getElementById('profileAvatar');
            const userAvatar = document.getElementById('userAvatar');
            if (profileAvatar) profileAvatar.src = e.target.result;
            if (userAvatar) userAvatar.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        showLoading();
        
        const formData = new FormData();
        formData.append('avatar', file);
        
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/student/profile/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Không thể tải ảnh lên');
        }
        
        // Update avatar images with Cloudinary URL
        const avatarUrl = data.data.avatarUrl;
        console.log('Student avatar uploaded successfully, URL:', avatarUrl);
        
        const profileAvatar = document.getElementById('profileAvatar');
        const userAvatar = document.getElementById('userAvatar');
        
        if (profileAvatar) {
            profileAvatar.src = avatarUrl;
            console.log('Updated profileAvatar src to:', avatarUrl);
        }
        if (userAvatar) {
            userAvatar.src = avatarUrl;
            console.log('Updated userAvatar src to:', avatarUrl);
        }
        
        // Update current profile data
        if (currentProfile) {
            currentProfile.avatar = avatarUrl;
            // Also update user.avatar if exists
            if (currentProfile.user) {
                currentProfile.user.avatar = avatarUrl;
            }
            console.log('Updated currentProfile.avatar to:', avatarUrl);
            
            // Update localStorage to sync with other pages
            localStorage.setItem('userProfile', JSON.stringify(currentProfile));
            console.log('✅ Updated localStorage userProfile with new avatar');
        }
        
        // Dispatch custom event to notify other pages
        window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { avatarUrl } }));
        console.log('✅ Dispatched avatarUpdated event');
        
        showNotification('Cập nhật ảnh đại diện thành công!', 'success');
        hideLoading();
        
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showNotification(error.message || 'Lỗi khi tải ảnh lên', 'error');
        hideLoading();
        
        // Reload current avatar on error
        if (currentProfile && currentProfile.avatar) {
            const profileAvatar = document.getElementById('profileAvatar');
            const userAvatar = document.getElementById('userAvatar');
            if (profileAvatar) profileAvatar.src = currentProfile.avatar;
            if (userAvatar) userAvatar.src = currentProfile.avatar;
        }
    }
}

// Show loading
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

// Hide loading
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Show notification
function showNotification(message, type = 'info') {
    const toast = document.getElementById('notificationToast');
    toast.textContent = message;
    toast.className = `notification-toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
