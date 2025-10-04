// ===== AUTHENTICATION JAVASCRIPT =====

// ===== LOGIN FORM HANDLER =====
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  
  // Clear previous errors
  clearFormErrors(form);
  
  // Validate form
  let hasErrors = false;
  
  if (!validateEmail(data.email)) {
    showFormError(form, 'email', 'Vui lòng nhập email hợp lệ');
    hasErrors = true;
  }
  
  if (!data.password) {
    showFormError(form, 'password', 'Vui lòng nhập mật khẩu');
    hasErrors = true;
  }
  
  if (hasErrors) {
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 600);
    return;
  }
  
  // Set loading state
  setFormLoading(form, true);
  
  try {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (response.success) {
      // Store access token
      localStorage.setItem('accessToken', response.data.accessToken);
      
      // Store user data
      localStorage.setItem('userData', JSON.stringify(response.data.user));
      localStorage.setItem('userProfile', JSON.stringify(response.data.profile));
      
      // Show success message
      showNotification('Đăng nhập thành công!', 'success');
      
      // Close modal
      closeModal('loginModal');
      
      // Redirect to appropriate dashboard
      setTimeout(() => {
        window.location.href = `/pages/${response.data.user.role}/dashboard.html`;
      }, 1000);
    }
    
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle specific error messages
    if (error.message.includes('Invalid email or password')) {
      showFormError(form, 'email', 'Email hoặc mật khẩu không đúng');
      showFormError(form, 'password', 'Email hoặc mật khẩu không đúng');
    } else if (error.message.includes('verify your email')) {
      showFormError(form, 'email', 'Vui lòng xác thực email trước khi đăng nhập');
    } else if (error.message.includes('locked')) {
      showFormError(form, 'email', 'Tài khoản đã bị khóa tạm thời do đăng nhập sai nhiều lần');
    } else if (error.message.includes('not approved')) {
      showFormError(form, 'email', 'Hồ sơ gia sư chưa được duyệt');
    } else {
      showNotification('Đăng nhập thất bại. Vui lòng thử lại.', 'error');
    }
    
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 600);
    
  } finally {
    setFormLoading(form, false);
  }
});

// ===== REGISTER FORM HANDLER =====
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  
  // Clear previous errors
  clearFormErrors(form);
  
  // Validate form
  let hasErrors = false;
  
  if (!data.fullName || data.fullName.length < 2) {
    showFormError(form, 'fullName', 'Họ tên phải có ít nhất 2 ký tự');
    hasErrors = true;
  }
  
  if (!validateEmail(data.email)) {
    showFormError(form, 'email', 'Vui lòng nhập email hợp lệ');
    hasErrors = true;
  }
  
  if (data.phone && !validatePhone(data.phone)) {
    showFormError(form, 'phone', 'Số điện thoại phải có 10-11 chữ số');
    hasErrors = true;
  }
  
  if (!validatePassword(data.password)) {
    showFormError(form, 'password', 'Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường và số');
    hasErrors = true;
  }
  
  if (data.password !== data.confirmPassword) {
    showFormError(form, 'confirmPassword', 'Mật khẩu xác nhận không khớp');
    hasErrors = true;
  }
  
  if (!data.terms) {
    showFormError(form, 'terms', 'Vui lòng đồng ý với điều khoản sử dụng');
    hasErrors = true;
  }
  
  if (hasErrors) {
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 600);
    return;
  }
  
  // Remove confirmPassword from data (not needed for API)
  delete data.confirmPassword;
  delete data.terms;
  
  // Set loading state
  setFormLoading(form, true);
  
  try {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (response.success) {
      // Close register modal
      closeModal('registerModal');
      
      // Check if OTP verification is required
      if (response.data.requiresOTP) {
        // Hiển thị thông báo khác nhau cho từng role
        if (data.role === 'tutor') {
          showNotification(
            'Đăng ký thành công! Vui lòng kiểm tra email để nhận mã OTP. ' +
            'Sau khi xác thực, hồ sơ của bạn sẽ được duyệt trong vòng 24h tới. ' +
            'Vui lòng chờ nhận thông báo sớm nhất!',
            'success'
          );
        } else {
          showNotification('Đăng ký thành công! Vui lòng kiểm tra email để nhận mã OTP.', 'success');
        }
        
        setTimeout(() => {
          if (window.otpModal) {
            window.otpModal.open(data.email);
          }
        }, 500);
      } else {
        // Show success modal (fallback for old token-based verification)
        showSuccessModal(
          `Đăng ký thành công! Chúng tôi đã gửi email xác thực đến ${data.email}. ` +
          `Vui lòng kiểm tra email và xác thực tài khoản để hoàn tất quá trình đăng ký.`
        );
      }
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific error messages
    if (error.message.includes('Email already exists')) {
      showFormError(form, 'email', 'Email này đã được sử dụng');
    } else if (error.message.includes('Validation failed')) {
      // Try to parse validation errors from response
      try {
        const jsonStart = error.message.indexOf('{');
        if (jsonStart !== -1) {
          const errorData = JSON.parse(error.message.substring(jsonStart));
          if (errorData.errors && Array.isArray(errorData.errors)) {
            let hasDisplayedError = false;
            errorData.errors.forEach(err => {
              if (err.field && err.message) {
                showFormError(form, err.field, err.message);
                hasDisplayedError = true;
              }
            });
            if (!hasDisplayedError) {
              showNotification('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.', 'error');
            }
          } else {
            showNotification('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.', 'error');
          }
        } else {
          showNotification('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.', 'error');
        }
      } catch (parseError) {
        showNotification('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.', 'error');
      }
    } else if (error.message.includes('rate limit') || error.message.includes('Too many')) {
      showNotification('Bạn đã thử quá nhiều lần. Vui lòng đợi 1 giờ trước khi thử lại.', 'error');
    } else {
      showNotification('Đăng ký thất bại. Vui lòng thử lại.', 'error');
    }
    
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 600);
    
  } finally {
    setFormLoading(form, false);
  }
});

// ===== REAL-TIME VALIDATION =====
document.addEventListener('DOMContentLoaded', () => {
  // Email validation
  const emailInputs = document.querySelectorAll('input[type="email"]');
  emailInputs.forEach(input => {
    input.addEventListener('blur', () => {
      const formGroup = input.closest('.form__group');
      formGroup.classList.remove('error');
      
      if (input.value && !validateEmail(input.value)) {
        formGroup.classList.add('error');
        let errorElement = formGroup.querySelector('.form__error');
        if (!errorElement) {
          errorElement = document.createElement('div');
          errorElement.className = 'form__error';
          formGroup.appendChild(errorElement);
        }
        errorElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Email không hợp lệ';
      } else {
        const errorElement = formGroup.querySelector('.form__error');
        if (errorElement) errorElement.remove();
      }
    });
  });
  
  // Phone validation
  const phoneInputs = document.querySelectorAll('input[type="tel"]');
  phoneInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      // Only allow numbers
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
    
    input.addEventListener('blur', () => {
      const formGroup = input.closest('.form__group');
      formGroup.classList.remove('error');
      
      if (input.value && !validatePhone(input.value)) {
        formGroup.classList.add('error');
        let errorElement = formGroup.querySelector('.form__error');
        if (!errorElement) {
          errorElement = document.createElement('div');
          errorElement.className = 'form__error';
          formGroup.appendChild(errorElement);
        }
        errorElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Số điện thoại phải có 10-11 chữ số';
      } else {
        const errorElement = formGroup.querySelector('.form__error');
        if (errorElement) errorElement.remove();
      }
    });
  });
  
  // Password confirmation validation
  const confirmPasswordInput = document.querySelector('input[name="confirmPassword"]');
  const passwordInput = document.querySelector('input[name="password"]');
  
  if (confirmPasswordInput && passwordInput) {
    confirmPasswordInput.addEventListener('blur', () => {
      const formGroup = confirmPasswordInput.closest('.form__group');
      formGroup.classList.remove('error');
      
      if (confirmPasswordInput.value && confirmPasswordInput.value !== passwordInput.value) {
        formGroup.classList.add('error');
        let errorElement = formGroup.querySelector('.form__error');
        if (!errorElement) {
          errorElement = document.createElement('div');
          errorElement.className = 'form__error';
          formGroup.appendChild(errorElement);
        }
        errorElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Mật khẩu xác nhận không khớp';
      } else {
        const errorElement = formGroup.querySelector('.form__error');
        if (errorElement) errorElement.remove();
      }
    });
  }
});

// ===== FORGOT PASSWORD =====
async function forgotPassword() {
  const email = prompt('Nhập email của bạn:');
  
  if (!email) return;
  
  if (!validateEmail(email)) {
    showNotification('Email không hợp lệ', 'error');
    return;
  }
  
  try {
    const response = await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    
    if (response.success) {
      showNotification('Chúng tôi đã gửi link đặt lại mật khẩu đến email của bạn', 'success');
    }
    
  } catch (error) {
    console.error('Forgot password error:', error);
    showNotification('Có lỗi xảy ra. Vui lòng thử lại.', 'error');
  }
}

// ===== LOGOUT =====
async function logout() {
  try {
    await apiRequest('/auth/logout', {
      method: 'POST'
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userProfile');
    
    // Redirect to home
    window.location.href = '/';
  }
}

// ===== EMAIL VERIFICATION =====
async function verifyEmail(token) {
  try {
    const response = await apiRequest(`/auth/verify-email/${token}`);
    
    if (response.success) {
      showNotification('Email đã được xác thực thành công!', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
    
  } catch (error) {
    console.error('Email verification error:', error);
    showNotification('Link xác thực không hợp lệ hoặc đã hết hạn', 'error');
  }
}

// Check for email verification token in URL
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token && window.location.pathname === '/verify-email') {
    verifyEmail(token);
  }
});

// ===== SESSION MANAGEMENT =====
// Check token expiration
function checkTokenExpiration() {
  const token = localStorage.getItem('accessToken');
  if (!token) return;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    
    // If token expires in less than 5 minutes, try to refresh
    if (payload.exp - now < 300) {
      refreshToken();
    }
  } catch (error) {
    console.error('Token parsing error:', error);
    logout();
  }
}

// Refresh access token
async function refreshToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include' // Include cookies
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('accessToken', data.data.accessToken);
    } else {
      throw new Error('Failed to refresh token');
    }
    
  } catch (error) {
    console.error('Token refresh error:', error);
    logout();
  }
}

// Check token every 5 minutes
setInterval(checkTokenExpiration, 5 * 60 * 1000);

// ===== INITIALIZE AUTH =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔐 Authentication module initialized');
  
  // Check initial token status
  checkTokenExpiration();
});