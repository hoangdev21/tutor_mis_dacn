// ===== CREATE REQUEST PAGE JAVASCRIPT =====

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupFormHandlers();
  updateAddressFields();
});

// Setup form handlers
function setupFormHandlers() {
  // Handle teaching method change
  document.querySelectorAll('input[name="teachingMethod"]').forEach(radio => {
    radio.addEventListener('change', updateAddressFields);
  });

  // Budget validation
  document.getElementById('maxBudget')?.addEventListener('change', validateBudget);
}

// Update address fields based on teaching method
function updateAddressFields() {
  const teachingMethod = document.querySelector('input[name="teachingMethod"]:checked')?.value;
  const addressFields = document.getElementById('addressFields');

  if (teachingMethod === 'online') {
    addressFields.style.display = 'none';
    // Remove required from address fields
    addressFields.querySelectorAll('input, select').forEach(field => {
      field.removeAttribute('required');
    });
  } else {
    addressFields.style.display = 'block';
    // Add required to address fields
    document.getElementById('city')?.setAttribute('required', '');
    document.getElementById('district')?.setAttribute('required', '');
  }
}

// Validate budget
function validateBudget() {
  const minBudget = parseInt(document.getElementById('minBudget').value) || 0;
  const maxBudget = parseInt(document.getElementById('maxBudget').value) || 0;

  if (maxBudget > 0 && maxBudget < minBudget) {
    alert('Mức học phí tối đa phải lớn hơn hoặc bằng mức tối thiểu');
    document.getElementById('maxBudget').value = minBudget;
  }
}

// Submit request
async function submitRequest(event) {
  event.preventDefault();

  const form = document.getElementById('requestForm');
  const formData = new FormData(form);

  // Get time slots
  const timeSlots = Array.from(document.querySelectorAll('input[name="timeSlots"]:checked'))
    .map(input => input.value);

  // Build request data
  const requestData = {
    // Student info
    student: {
      name: formData.get('studentName'),
      gender: formData.get('studentGender'),
      grade: formData.get('studentGrade'),
      phone: formData.get('studentPhone')
    },
    
    // Subject info
    subject: formData.get('subject'),
    level: formData.get('level'),
    description: formData.get('description'),
    
    // Schedule
    schedule: {
      sessionsPerWeek: formData.get('sessionsPerWeek'),
      timeSlots: timeSlots,
      duration: parseFloat(formData.get('duration'))
    },
    
    // Location
    location: {
      method: formData.get('teachingMethod'),
      city: formData.get('city') || null,
      district: formData.get('district') || null,
      address: formData.get('address') || null
    },
    
    // Budget
    budget: {
      min: parseInt(formData.get('minBudget')),
      max: parseInt(formData.get('maxBudget'))
    },
    
    // Requirements
    requirements: {
      tutorGender: formData.get('tutorGender'),
      experience: formData.get('experience'),
      additional: formData.get('additionalRequirements') || null
    }
  };

  // Validate
  if (timeSlots.length === 0) {
    alert('Vui lòng chọn ít nhất một khung giờ học');
    return;
  }

  if (requestData.budget.max < requestData.budget.min) {
    alert('Mức học phí tối đa phải lớn hơn hoặc bằng mức tối thiểu');
    return;
  }

  // Show loading
  form.classList.add('form-loading');

  try {
    const response = await fetch(`${API_BASE_URL}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(requestData)
    });

    const data = await response.json();

    if (data.success) {
      showSuccessModal();
      form.reset();
    } else {
      alert(data.message || 'Đăng yêu cầu thất bại. Vui lòng thử lại.');
    }
  } catch (error) {
    console.error('Submit request error:', error);
    alert('Đã xảy ra lỗi khi đăng yêu cầu. Vui lòng thử lại sau.');
  } finally {
    form.classList.remove('form-loading');
  }
}

// Show success modal
function showSuccessModal() {
  const modal = document.createElement('div');
  modal.className = 'success-modal active';
  modal.innerHTML = `
    <div class="success-content">
      <div class="success-icon">
        <i class="fas fa-check"></i>
      </div>
      <h2>Đăng yêu cầu thành công!</h2>
      <p>Yêu cầu của bạn đã được đăng. Các gia sư phù hợp sẽ liên hệ với bạn sớm.</p>
      <button class="btn btn--primary" onclick="closeSuccessModal()">
        <i class="fas fa-arrow-left"></i> Về trang chủ
      </button>
      <button class="btn btn--outline" onclick="viewMyRequests()" style="margin-top: 10px;">
        <i class="fas fa-list"></i> Xem yêu cầu của tôi
      </button>
    </div>
  `;
  document.body.appendChild(modal);
}

// Close success modal
function closeSuccessModal() {
  const modal = document.querySelector('.success-modal');
  if (modal) {
    modal.remove();
  }
  window.location.href = 'index.html';
}

// View my requests
function viewMyRequests() {
  const modal = document.querySelector('.success-modal');
  if (modal) {
    modal.remove();
  }
  window.location.href = 'requests.html';
}

// District data by city
const districtData = {
  'Hà Nội': [
    'Ba Đình', 'Hoàn Kiếm', 'Tây Hồ', 'Long Biên', 'Cầu Giấy',
    'Đống Đa', 'Hai Bà Trưng', 'Hoàng Mai', 'Thanh Xuân', 'Nam Từ Liêm',
    'Bắc Từ Liêm', 'Hà Đông'
  ],
  'Hồ Chí Minh': [
    'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5',
    'Quận 6', 'Quận 7', 'Quận 8', 'Quận 9', 'Quận 10',
    'Quận 11', 'Quận 12', 'Bình Thạnh', 'Tân Bình', 'Tân Phú',
    'Phú Nhuận', 'Gò Vấp', 'Thủ Đức'
  ],
  'Đà Nẵng': [
    'Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn',
    'Liên Chiểu', 'Cẩm Lệ', 'Hòa Vang'
  ],
  'Hải Phòng': [
    'Hồng Bàng', 'Ngô Quyền', 'Lê Chân', 'Hải An',
    'Kiến An', 'Đồ Sơn', 'Dương Kinh'
  ],
  'Cần Thơ': [
    'Ninh Kiều', 'Bình Thủy', 'Cái Răng', 'Ô Môn',
    'Thốt Nốt'
  ]
};

// Update districts when city changes
document.getElementById('city')?.addEventListener('change', function() {
  const city = this.value;
  const districtSelect = document.getElementById('district');
  
  if (!city) {
    districtSelect.innerHTML = '<option value="">Chọn quận/huyện</option>';
    return;
  }
  
  const districts = districtData[city] || [];
  districtSelect.innerHTML = '<option value="">Chọn quận/huyện</option>' +
    districts.map(d => `<option value="${d}">${d}</option>`).join('');
});

console.log('📝 Create request page initialized');