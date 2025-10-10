// ===== TUTOR PROFILE PAGE JAVASCRIPT =====

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
    
    // Change university image button
    const changeUniversityImgBtn = document.getElementById('changeUniversityImgBtn');
    if (changeUniversityImgBtn) {
        changeUniversityImgBtn.addEventListener('click', () => {
            document.getElementById('universityImageInput').click();
        });
    }
    
    // University image input change
    const universityImageInput = document.getElementById('universityImageInput');
    if (universityImageInput) {
        universityImageInput.addEventListener('change', handleUniversityImageChange);
    }
    
    // Add certificate button
    document.getElementById('addCertificateBtn').addEventListener('click', addCertificate);
    
    // Add experience button
    document.getElementById('addExperienceBtn').addEventListener('click', addExperience);
    
    // Add subject button
    document.getElementById('addSubjectBtn').addEventListener('click', addSubject);
    
    // Availability checkboxes
    document.querySelectorAll('input[name="availability"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleAvailabilityChange);
    });
}

// Load profile
async function loadProfile() {
    try {
        showLoading();
        
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/tutor/profile`, {
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
    console.log('Populating profile with data:', profile);
    
    const user = profile.user || {};
    
    // Header info
    document.getElementById('profileName').textContent = user.fullName || 'Chưa cập nhật';
    document.getElementById('profileEmail').textContent = user.email || '';
    
    // Approval status
    const statusBadge = document.querySelector('.status-badge');
    if (user.approvalStatus === 'approved') {
        statusBadge.textContent = 'Đã duyệt';
        statusBadge.className = 'status-badge approved';
    } else if (user.approvalStatus === 'rejected') {
        statusBadge.textContent = 'Bị từ chối';
        statusBadge.className = 'status-badge rejected';
    } else {
        statusBadge.textContent = 'Đang chờ duyệt';
        statusBadge.className = 'status-badge pending';
    }
    
    // Avatar
    console.log('Setting avatar from user.avatar:', user.avatar);
    const avatarUrl = user.avatar || '../../assets/images/avatar/default-avatar.png';
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
    
    // University Image
    console.log('Setting university image:', profile.universityImage);
    const universityImageUrl = profile.universityImage || '../../assets/images/icon/university-placeholder.svg';
    const universityImage = document.getElementById('universityImage');
    if (universityImage) {
        universityImage.src = universityImageUrl;
        console.log('University image set to:', universityImageUrl);
    }
    
    // Basic info
    document.getElementById('fullName').value = user.fullName || '';
    document.getElementById('dateOfBirth').value = profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '';
    document.getElementById('gender').value = profile.gender || '';
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('idCard').value = profile.idCard || '';
    document.getElementById('hourlyRate').value = profile.hourlyRate || '';
    
    // Address
    document.getElementById('address').value = profile.address || '';
    document.getElementById('city').value = profile.city || '';
    document.getElementById('district').value = profile.district || '';
    
    // Education
    document.getElementById('highestDegree').value = profile.highestDegree || '';
    document.getElementById('major').value = profile.major || '';
    document.getElementById('university').value = profile.university || '';
    document.getElementById('graduationYear').value = profile.graduationYear || '';
    document.getElementById('gpa').value = profile.gpa || '';
    
    // Experience
    document.getElementById('yearsOfExperience').value = profile.yearsOfExperience || '';
    
    // Bio
    document.getElementById('bio').value = profile.bio || '';
    document.getElementById('teachingStyle').value = profile.teachingStyle || '';
    document.getElementById('achievements').value = profile.achievements || '';
    
    // Teaching methods
    if (profile.teachingMethods && profile.teachingMethods.length > 0) {
        document.querySelectorAll('input[name="teachingMethods"]').forEach(checkbox => {
            if (profile.teachingMethods.includes(checkbox.value)) {
                checkbox.checked = true;
            }
        });
    }
    
    // Render dynamic sections
    renderCertificates(profile.certifications || []);
    renderExperiences(profile.experiences || []);
    renderSubjects(profile.subjects || []);
    renderAvailability(profile.availability || []);
    
    // Save original form data
    originalFormData = getFormData();
}

// Render certificates
function renderCertificates(certificates) {
    console.log('Rendering certificates:', certificates);
    const container = document.getElementById('certificatesContainer');
    container.innerHTML = '';
    
    certificates.forEach((cert, index) => {
        const certDiv = document.createElement('div');
        certDiv.className = 'certificate-item';
        certDiv.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Tên chứng chỉ</label>
                    <input type="text" class="form-control cert-name" value="${cert.name || ''}" data-index="${index}" disabled>
                </div>
                <div class="form-group">
                    <label>Tổ chức cấp</label>
                    <input type="text" class="form-control cert-issuer" value="${cert.issuer || ''}" data-index="${index}" disabled>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Năm nhận</label>
                    <input type="number" class="form-control cert-year" value="${cert.year || ''}" data-index="${index}" min="1950" max="2025" disabled>
                </div>
                <div class="form-group">
                    <label>File đính kèm</label>
                    <div class="file-input-group">
                        <input type="file" class="cert-file" data-index="${index}" accept=".pdf,.jpg,.jpeg,.png" disabled style="display: none;">
                        <button type="button" class="btn btn--outline btn-upload-cert" data-index="${index}" disabled>
                            <i class="fas fa-upload"></i> ${cert.fileUrl ? 'Thay đổi file' : 'Tải lên'}
                        </button>
                        ${cert.fileUrl ? `<a href="${cert.fileUrl}" target="_blank" class="btn btn--text"><i class="fas fa-eye"></i> Xem</a>` : ''}
                    </div>
                </div>
            </div>
            <button type="button" class="btn btn--danger btn-remove-cert" data-index="${index}" disabled>
                <i class="fas fa-trash"></i> Xóa
            </button>
            <hr>
        `;
        container.appendChild(certDiv);
    });
    
    // Add event listeners for upload and remove buttons
    if (isEditMode) {
        container.querySelectorAll('.btn-upload-cert').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = this.dataset.index;
                const fileInput = container.querySelector(`.cert-file[data-index="${index}"]`);
                fileInput.click();
            });
        });
        
        container.querySelectorAll('.btn-remove-cert').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = this.dataset.index;
                removeCertificate(index);
            });
        });
    }
}

// Add certificate
function addCertificate() {
    if (!isEditMode) return;
    const certificates = getCertificates();
    certificates.push({ name: '', issuer: '', year: '', fileUrl: '' });
    renderCertificates(certificates);
    // Re-enable fields after rendering
    enableDynamicFields();
}

// Remove certificate
function removeCertificate(index) {
    if (!isEditMode) return;
    const certificates = getCertificates();
    certificates.splice(index, 1);
    renderCertificates(certificates);
    // Re-enable fields after rendering
    enableDynamicFields();
}

// Get certificates
function getCertificates() {
    const certificates = [];
    document.querySelectorAll('.certificate-item').forEach((item, index) => {
        const name = item.querySelector('.cert-name').value;
        const issuer = item.querySelector('.cert-issuer').value;
        const year = item.querySelector('.cert-year').value;
        certificates.push({ name, issuer, year, fileUrl: '' });
    });
    return certificates;
}

// Render experiences
function renderExperiences(experiences) {
    console.log('Rendering experiences:', experiences);
    const container = document.getElementById('experiencesContainer');
    container.innerHTML = '';
    
    experiences.forEach((exp, index) => {
        const expDiv = document.createElement('div');
        expDiv.className = 'experience-item';
        expDiv.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Vị trí/Chức danh</label>
                    <input type="text" class="form-control exp-position" value="${exp.position || ''}" data-index="${index}" disabled>
                </div>
                <div class="form-group">
                    <label>Tổ chức/Trường học</label>
                    <input type="text" class="form-control exp-organization" value="${exp.organization || ''}" data-index="${index}" disabled>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Từ năm</label>
                    <input type="number" class="form-control exp-from" value="${exp.fromYear || ''}" data-index="${index}" min="1950" max="2025" disabled>
                </div>
                <div class="form-group">
                    <label>Đến năm</label>
                    <input type="number" class="form-control exp-to" value="${exp.toYear || ''}" data-index="${index}" min="1950" max="2025" disabled>
                </div>
            </div>
            <div class="form-group">
                <label>Mô tả công việc</label>
                <textarea class="form-control exp-description" rows="2" data-index="${index}" disabled>${exp.description || ''}</textarea>
            </div>
            <button type="button" class="btn btn--danger btn-remove-exp" data-index="${index}" disabled>
                <i class="fas fa-trash"></i> Xóa
            </button>
            <hr>
        `;
        container.appendChild(expDiv);
    });
    
    // Add event listeners
    if (isEditMode) {
        container.querySelectorAll('.btn-remove-exp').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = this.dataset.index;
                removeExperience(index);
            });
        });
    }
}

// Add experience
function addExperience() {
    if (!isEditMode) return;
    const experiences = getExperiences();
    experiences.push({ position: '', organization: '', fromYear: '', toYear: '', description: '' });
    renderExperiences(experiences);
    // Re-enable fields after rendering
    enableDynamicFields();
}

// Remove experience
function removeExperience(index) {
    if (!isEditMode) return;
    const experiences = getExperiences();
    experiences.splice(index, 1);
    renderExperiences(experiences);
    // Re-enable fields after rendering
    enableDynamicFields();
}

// Get experiences
function getExperiences() {
    const experiences = [];
    document.querySelectorAll('.experience-item').forEach((item, index) => {
        const position = item.querySelector('.exp-position').value;
        const organization = item.querySelector('.exp-organization').value;
        const fromYear = item.querySelector('.exp-from').value;
        const toYear = item.querySelector('.exp-to').value;
        const description = item.querySelector('.exp-description').value;
        experiences.push({ position, organization, fromYear, toYear, description });
    });
    return experiences;
}

// Render subjects
function renderSubjects(subjects) {
    console.log('Rendering subjects:', subjects);
    const container = document.getElementById('subjectsContainer');
    container.innerHTML = '';
    
    subjects.forEach((subject, index) => {
        const subDiv = document.createElement('div');
        subDiv.className = 'subject-item';
        subDiv.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Môn học</label>
                    <select class="form-control subject-name" data-index="${index}" disabled>
                        <option value="">Chọn môn học</option>
                        <option value="Toán" ${subject.name === 'Toán' ? 'selected' : ''}>Toán</option>
                        <option value="Vật lý" ${subject.name === 'Vật lý' ? 'selected' : ''}>Vật lý</option>
                        <option value="Hóa học" ${subject.name === 'Hóa học' ? 'selected' : ''}>Hóa học</option>
                        <option value="Sinh học" ${subject.name === 'Sinh học' ? 'selected' : ''}>Sinh học</option>
                        <option value="Tiếng Anh" ${subject.name === 'Tiếng Anh' ? 'selected' : ''}>Tiếng Anh</option>
                        <option value="Ngữ văn" ${subject.name === 'Ngữ văn' ? 'selected' : ''}>Ngữ văn</option>
                        <option value="Lịch sử" ${subject.name === 'Lịch sử' ? 'selected' : ''}>Lịch sử</option>
                        <option value="Địa lý" ${subject.name === 'Địa lý' ? 'selected' : ''}>Địa lý</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Cấp độ</label>
                    <select class="form-control subject-level" data-index="${index}" disabled>
                        <option value="">Chọn cấp độ</option>
                        <option value="Tiểu học" ${subject.level === 'Tiểu học' ? 'selected' : ''}>Tiểu học</option>
                        <option value="THCS" ${subject.level === 'THCS' ? 'selected' : ''}>THCS</option>
                        <option value="THPT" ${subject.level === 'THPT' ? 'selected' : ''}>THPT</option>
                        <option value="Đại học" ${subject.level === 'Đại học' ? 'selected' : ''}>Đại học</option>
                    </select>
                </div>
            </div>
            <button type="button" class="btn btn--danger btn-remove-subject" data-index="${index}" disabled>
                <i class="fas fa-trash"></i> Xóa
            </button>
            <hr>
        `;
        container.appendChild(subDiv);
    });
    
    // Add event listeners
    if (isEditMode) {
        container.querySelectorAll('.btn-remove-subject').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = this.dataset.index;
                removeSubject(index);
            });
        });
    }
}

// Add subject
function addSubject() {
    if (!isEditMode) return;
    const subjects = getSubjects();
    subjects.push({ name: '', level: '' });
    renderSubjects(subjects);
    // Re-enable fields after rendering
    enableDynamicFields();
}

// Remove subject
function removeSubject(index) {
    if (!isEditMode) return;
    const subjects = getSubjects();
    subjects.splice(index, 1);
    renderSubjects(subjects);
    // Re-enable fields after rendering
    enableDynamicFields();
}

// Get subjects
function getSubjects() {
    const subjects = [];
    document.querySelectorAll('.subject-item').forEach((item, index) => {
        const name = item.querySelector('.subject-name').value;
        const level = item.querySelector('.subject-level').value;
        if (name && level) {
            subjects.push({ name, level });
        }
    });
    return subjects;
}

// Render availability
function renderAvailability(availability) {
    availability.forEach(slot => {
        const checkbox = document.querySelector(`input[name="availability"][value="${slot.day}"]`);
        if (checkbox) {
            checkbox.checked = true;
            const slotsContainer = document.getElementById(`${slot.day}-slots`);
            slot.times.forEach(time => {
                const timeDiv = document.createElement('div');
                timeDiv.className = 'time-slot';
                timeDiv.innerHTML = `
                    <input type="time" class="time-from" value="${time.from}" disabled>
                    <span>đến</span>
                    <input type="time" class="time-to" value="${time.to}" disabled>
                    <button type="button" class="btn-remove-slot" disabled>
                        <i class="fas fa-times"></i>
                    </button>
                `;
                slotsContainer.appendChild(timeDiv);
            });
        }
    });
}

// Handle availability change
function handleAvailabilityChange(event) {
    const day = event.target.value;
    const slotsContainer = document.getElementById(`${day}-slots`);
    
    if (event.target.checked) {
        // Add default time slot
        const timeDiv = document.createElement('div');
        timeDiv.className = 'time-slot';
        timeDiv.innerHTML = `
            <input type="time" class="time-from" value="08:00">
            <span>đến</span>
            <input type="time" class="time-to" value="10:00">
            <button type="button" class="btn-remove-slot">
                <i class="fas fa-times"></i>
            </button>
            <button type="button" class="btn-add-slot">
                <i class="fas fa-plus"></i>
            </button>
        `;
        slotsContainer.appendChild(timeDiv);
        
        // Add event listener for remove button
        timeDiv.querySelector('.btn-remove-slot').addEventListener('click', function() {
            timeDiv.remove();
        });
        
        // Add event listener for add button
        timeDiv.querySelector('.btn-add-slot').addEventListener('click', function() {
            addTimeSlot(day);
        });
    } else {
        slotsContainer.innerHTML = '';
    }
}

// Add time slot
function addTimeSlot(day) {
    const slotsContainer = document.getElementById(`${day}-slots`);
    const timeDiv = document.createElement('div');
    timeDiv.className = 'time-slot';
    timeDiv.innerHTML = `
        <input type="time" class="time-from" value="08:00">
        <span>đến</span>
        <input type="time" class="time-to" value="10:00">
        <button type="button" class="btn-remove-slot">
            <i class="fas fa-times"></i>
        </button>
    `;
    slotsContainer.appendChild(timeDiv);
    
    timeDiv.querySelector('.btn-remove-slot').addEventListener('click', function() {
        timeDiv.remove();
    });
}

// Get availability
function getAvailability() {
    const availability = [];
    document.querySelectorAll('input[name="availability"]:checked').forEach(checkbox => {
        const day = checkbox.value;
        const slotsContainer = document.getElementById(`${day}-slots`);
        const times = [];
        slotsContainer.querySelectorAll('.time-slot').forEach(slot => {
            const from = slot.querySelector('.time-from').value;
            const to = slot.querySelector('.time-to').value;
            if (from && to) {
                times.push({ from, to });
            }
        });
        if (times.length > 0) {
            availability.push({ day, times });
        }
    });
    return availability;
}

// Enable edit mode
function enableEditMode() {
    isEditMode = true;
    
    // Show/hide buttons
    document.getElementById('editProfileBtn').style.display = 'none';
    document.getElementById('saveProfileBtn').style.display = 'inline-flex';
    document.getElementById('cancelEditBtn').style.display = 'inline-flex';
    
    // Enable all form fields
    const formControls = document.querySelectorAll('.form-control, input[name="teachingMethods"], input[name="availability"]');
    formControls.forEach(control => {
        control.disabled = false;
    });
    
    // Enable dynamic section fields
    enableDynamicFields();
    
    // Save original data for cancel
    originalFormData = getFormData();
}

// Enable dynamic fields (certificates, experiences, subjects)
function enableDynamicFields() {
    // Enable dynamic buttons
    document.getElementById('addCertificateBtn').disabled = false;
    document.getElementById('addExperienceBtn').disabled = false;
    document.getElementById('addSubjectBtn').disabled = false;
    
    // Enable fields in dynamic sections
    document.querySelectorAll('.cert-name, .cert-issuer, .cert-year').forEach(el => {
        el.disabled = false;
    });
    
    document.querySelectorAll('.exp-position, .exp-organization, .exp-from, .exp-to, .exp-description').forEach(el => {
        el.disabled = false;
    });
    
    document.querySelectorAll('.subject-name, .subject-level').forEach(el => {
        el.disabled = false;
    });
    
    // Enable remove buttons
    document.querySelectorAll('.btn-remove-cert, .btn-remove-exp, .btn-remove-subject, .btn-upload-cert').forEach(btn => {
        btn.disabled = false;
    });
}

// Disable edit mode
function disableEditMode() {
    isEditMode = false;
    
    // Show/hide buttons
    document.getElementById('editProfileBtn').style.display = 'inline-flex';
    document.getElementById('saveProfileBtn').style.display = 'none';
    document.getElementById('cancelEditBtn').style.display = 'none';
    
    // Disable all form fields
    const formControls = document.querySelectorAll('.form-control, input[name="teachingMethods"], input[name="availability"]');
    formControls.forEach(control => {
        control.disabled = true;
    });
    
    // Disable dynamic buttons
    document.getElementById('addCertificateBtn').disabled = true;
    document.getElementById('addExperienceBtn').disabled = true;
    document.getElementById('addSubjectBtn').disabled = true;
    
    // Disable remove buttons
    document.querySelectorAll('.btn-remove-cert, .btn-remove-exp, .btn-remove-subject').forEach(btn => {
        btn.disabled = true;
    });
}

// Cancel edit
function cancelEdit() {
    if (originalFormData && currentProfile) {
        populateProfile(currentProfile);
    }
    disableEditMode();
}

// Get form data
function getFormData() {
    const teachingMethods = [];
    document.querySelectorAll('input[name="teachingMethods"]:checked').forEach(checkbox => {
        teachingMethods.push(checkbox.value);
    });
    
    // Build education array in the format backend expects
    const education = [{
        degree: document.getElementById('highestDegree').value,
        major: document.getElementById('major').value,
        university: document.getElementById('university').value,
        graduationYear: parseInt(document.getElementById('graduationYear').value),
        gpa: parseFloat(document.getElementById('gpa').value) || 0
    }];
    
    // Get subjects with proper format for validation
    const subjects = getSubjects();
    const formattedSubjects = subjects.map(sub => ({
        subject: sub.name,
        level: sub.level === 'Tiểu học' ? 'elementary' : 
               sub.level === 'THCS' ? 'middle_school' :
               sub.level === 'THPT' ? 'high_school' : 'university',
        hourlyRate: parseFloat(document.getElementById('hourlyRate').value) || 0,
        experience: parseInt(document.getElementById('yearsOfExperience').value.split('-')[0]) || 0
    }));
    
    return {
        fullName: document.getElementById('fullName').value,
        dateOfBirth: document.getElementById('dateOfBirth').value,
        gender: document.getElementById('gender').value,
        phone: document.getElementById('phone').value,
        idCard: document.getElementById('idCard').value,
        hourlyRate: parseFloat(document.getElementById('hourlyRate').value) || 0,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        district: document.getElementById('district').value,
        education: education,
        highestDegree: document.getElementById('highestDegree').value,
        major: document.getElementById('major').value,
        university: document.getElementById('university').value,
        graduationYear: parseInt(document.getElementById('graduationYear').value),
        gpa: parseFloat(document.getElementById('gpa').value) || 0,
        yearsOfExperience: document.getElementById('yearsOfExperience').value,
        bio: document.getElementById('bio').value,
        teachingStyle: document.getElementById('teachingStyle').value,
        achievements: document.getElementById('achievements').value,
        teachingMethods: teachingMethods,
        certifications: getCertificates(),
        experiences: getExperiences(),
        subjects: formattedSubjects,
        availability: getAvailability()
    };
}

// Save profile
async function saveProfile() {
    try {
        // Validate required fields
        const fullName = document.getElementById('fullName').value.trim();
        const dateOfBirth = document.getElementById('dateOfBirth').value;
        const gender = document.getElementById('gender').value;
        const phone = document.getElementById('phone').value.trim();
        const hourlyRate = document.getElementById('hourlyRate').value;
        const highestDegree = document.getElementById('highestDegree').value;
        const yearsOfExperience = document.getElementById('yearsOfExperience').value;
        const bio = document.getElementById('bio').value.trim();
        
        if (!fullName || !dateOfBirth || !gender || !phone || !hourlyRate || !highestDegree || !yearsOfExperience || !bio) {
            showNotification('Vui lòng điền đầy đủ các thông tin bắt buộc (*)', 'error');
            return;
        }
        
        // Validate bio length
        if (bio.length < 100) {
            showNotification('Giới thiệu bản thân phải có ít nhất 100 ký tự', 'error');
            return;
        }
        
        // Validate phone number
        const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
        if (!phoneRegex.test(phone)) {
            showNotification('Số điện thoại không hợp lệ', 'error');
            return;
        }
        
        // Validate subjects
        const subjects = getSubjects();
        if (subjects.length === 0) {
            showNotification('Vui lòng thêm ít nhất một môn dạy', 'error');
            return;
        }
        
        showLoading();
        
        const formData = getFormData();
        const token = localStorage.getItem('accessToken');
        
        const response = await fetch(`${API_BASE_URL}/tutor/profile`, {
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
        
        // Show success message first
        showNotification('Cập nhật hồ sơ thành công!', 'success');
        
        // Reload profile from server to ensure data sync
        await loadProfile();
        
        // Disable edit mode after reload
        disableEditMode();
        
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
        const response = await fetch(`${API_BASE_URL}/tutor/profile/avatar`, {
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
        console.log('Avatar uploaded successfully, URL:', avatarUrl);
        
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
        if (currentProfile && currentProfile.user) {
            currentProfile.user.avatar = avatarUrl;
            console.log('Updated currentProfile.user.avatar to:', avatarUrl);
            
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
        if (currentProfile && currentProfile.user && currentProfile.user.avatar) {
            const profileAvatar = document.getElementById('profileAvatar');
            const userAvatar = document.getElementById('userAvatar');
            if (profileAvatar) profileAvatar.src = currentProfile.user.avatar;
            if (userAvatar) userAvatar.src = currentProfile.user.avatar;
        }
    }
}

// Handle university image change
async function handleUniversityImageChange(event) {
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
            const universityImage = document.getElementById('universityImage');
            if (universityImage) universityImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        showLoading();
        
        const formData = new FormData();
        formData.append('avatar', file); // Using 'avatar' field name as middleware expects it
        
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/tutor/profile/university-image`, {
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
        
        // Update university image with Cloudinary URL
        const universityImageUrl = data.data.universityImageUrl;
        console.log('University image uploaded successfully, URL:', universityImageUrl);
        
        const universityImage = document.getElementById('universityImage');
        if (universityImage) {
            universityImage.src = universityImageUrl;
            console.log('Updated universityImage src to:', universityImageUrl);
        }
        
        // Update current profile data
        if (currentProfile) {
            currentProfile.universityImage = universityImageUrl;
            console.log('Updated currentProfile.universityImage to:', universityImageUrl);
            
            // Update localStorage
            localStorage.setItem('userProfile', JSON.stringify(currentProfile));
            console.log('✅ Updated localStorage with university image');
        }
        
        showNotification('Cập nhật ảnh trường học thành công!', 'success');
        hideLoading();
        
    } catch (error) {
        console.error('Error uploading university image:', error);
        showNotification(error.message || 'Lỗi khi tải ảnh lên', 'error');
        hideLoading();
        
        // Reload current image on error
        if (currentProfile && currentProfile.universityImage) {
            const universityImage = document.getElementById('universityImage');
            if (universityImage) universityImage.src = currentProfile.universityImage;
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
