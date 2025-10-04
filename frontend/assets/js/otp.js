// ===== OTP VERIFICATION JAVASCRIPT =====

class OTPModal {
  constructor() {
    this.modal = null;
    this.inputs = [];
    this.email = '';
    this.timer = null;
    this.timeLeft = 600; // 10 minutes in seconds
    this.init();
  }

  init() {
    this.createModal();
    this.setupEventListeners();
  }

  createModal() {
    const modalHTML = `
      <div class="otp-modal" id="otpModal">
        <div class="otp-modal-content">
          <button class="otp-close" id="otpClose">&times;</button>
          
          <div class="otp-header">
            <div class="otp-icon">
              <i class="fas fa-envelope-open-text"></i>
            </div>
            <h2>Xác Thực Email</h2>
            <p>
              Chúng tôi đã gửi mã OTP 6 số đến<br>
              <span class="otp-email" id="otpEmail"></span>
            </p>
          </div>

          <div class="otp-input-container">
            <input type="text" class="otp-input" maxlength="1" pattern="[0-9]" inputmode="numeric" data-index="0">
            <input type="text" class="otp-input" maxlength="1" pattern="[0-9]" inputmode="numeric" data-index="1">
            <input type="text" class="otp-input" maxlength="1" pattern="[0-9]" inputmode="numeric" data-index="2">
            <input type="text" class="otp-input" maxlength="1" pattern="[0-9]" inputmode="numeric" data-index="3">
            <input type="text" class="otp-input" maxlength="1" pattern="[0-9]" inputmode="numeric" data-index="4">
            <input type="text" class="otp-input" maxlength="1" pattern="[0-9]" inputmode="numeric" data-index="5">
          </div>

          <div class="otp-timer">
            <p>Mã OTP có hiệu lực trong: <span class="timer-count" id="otpTimer">10:00</span></p>
          </div>

          <div class="otp-alert" id="otpAlert"></div>

          <div class="otp-loading" id="otpLoading">
            <div class="otp-spinner"></div>
            <p>Đang xác thực...</p>
          </div>

          <div class="otp-actions">
            <button class="otp-btn otp-btn-verify" id="verifyOtpBtn">
              <i class="fas fa-check-circle"></i> Xác Thực
            </button>
            <button class="otp-btn otp-btn-resend" id="resendOtpBtn">
              <i class="fas fa-redo"></i> Gửi Lại
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('otpModal');
    this.inputs = document.querySelectorAll('.otp-input');
  }

  setupEventListeners() {
    // Close modal
    document.getElementById('otpClose').addEventListener('click', () => this.close());
    
    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // OTP input handling
    this.inputs.forEach((input, index) => {
      input.addEventListener('input', (e) => this.handleInput(e, index));
      input.addEventListener('keydown', (e) => this.handleKeyDown(e, index));
      input.addEventListener('paste', (e) => this.handlePaste(e));
    });

    // Verify button
    document.getElementById('verifyOtpBtn').addEventListener('click', () => this.verifyOTP());

    // Resend button
    document.getElementById('resendOtpBtn').addEventListener('click', () => this.resendOTP());
  }

  handleInput(e, index) {
    const input = e.target;
    const value = input.value;

    // Only allow numbers
    if (!/^\d$/.test(value)) {
      input.value = '';
      return;
    }

    // Add filled class
    input.classList.add('filled');

    // Move to next input
    if (value && index < this.inputs.length - 1) {
      this.inputs[index + 1].focus();
    }

    // Auto-verify when all inputs filled
    if (this.isAllFilled()) {
      setTimeout(() => this.verifyOTP(), 300);
    }
  }

  handleKeyDown(e, index) {
    // Backspace handling
    if (e.key === 'Backspace') {
      if (!this.inputs[index].value && index > 0) {
        this.inputs[index - 1].focus();
        this.inputs[index - 1].value = '';
        this.inputs[index - 1].classList.remove('filled');
      } else {
        this.inputs[index].classList.remove('filled');
      }
    }

    // Arrow key navigation
    if (e.key === 'ArrowLeft' && index > 0) {
      this.inputs[index - 1].focus();
    }
    if (e.key === 'ArrowRight' && index < this.inputs.length - 1) {
      this.inputs[index + 1].focus();
    }
  }

  handlePaste(e) {
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    const digits = paste.match(/\d/g);

    if (digits && digits.length === 6) {
      digits.forEach((digit, index) => {
        this.inputs[index].value = digit;
        this.inputs[index].classList.add('filled');
      });
      this.inputs[5].focus();
      setTimeout(() => this.verifyOTP(), 300);
    }
  }

  isAllFilled() {
    return Array.from(this.inputs).every(input => input.value !== '');
  }

  getOTPValue() {
    return Array.from(this.inputs).map(input => input.value).join('');
  }

  clearInputs() {
    this.inputs.forEach(input => {
      input.value = '';
      input.classList.remove('filled', 'error');
    });
    this.inputs[0].focus();
  }

  showError() {
    this.inputs.forEach(input => input.classList.add('error'));
    setTimeout(() => {
      this.inputs.forEach(input => input.classList.remove('error'));
    }, 500);
  }

  showAlert(message, type = 'error') {
    const alert = document.getElementById('otpAlert');
    alert.className = `otp-alert otp-alert-${type} active`;
    alert.textContent = message;

    setTimeout(() => {
      alert.classList.remove('active');
    }, 5000);
  }

  showLoading(show = true) {
    const loading = document.getElementById('otpLoading');
    const verifyBtn = document.getElementById('verifyOtpBtn');
    
    if (show) {
      loading.classList.add('active');
      verifyBtn.disabled = true;
    } else {
      loading.classList.remove('active');
      verifyBtn.disabled = false;
    }
  }

  startTimer() {
    this.timeLeft = 600; // Reset to 10 minutes
    const timerElement = document.getElementById('otpTimer');
    const resendBtn = document.getElementById('resendOtpBtn');
    
    resendBtn.disabled = true;
    timerElement.classList.remove('expired');

    this.timer = setInterval(() => {
      this.timeLeft--;

      const minutes = Math.floor(this.timeLeft / 60);
      const seconds = this.timeLeft % 60;
      timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      if (this.timeLeft <= 60) {
        timerElement.classList.add('expired');
      }

      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        timerElement.textContent = 'Hết hạn';
        resendBtn.disabled = false;
        this.showAlert('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.', 'warning');
      }
    }, 1000);

    // Enable resend after 1 minute
    setTimeout(() => {
      resendBtn.disabled = false;
    }, 60000);
  }

  async verifyOTP() {
    if (!this.isAllFilled()) {
      this.showAlert('Vui lòng nhập đầy đủ mã OTP', 'warning');
      return;
    }

    const otp = this.getOTPValue();
    this.showLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: this.email,
          otp: otp
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showAlert('Xác thực email thành công! Đang chuyển hướng...', 'success');
        clearInterval(this.timer);
        
        setTimeout(() => {
          this.close();
          window.location.href = '/index.html?verified=true';
        }, 2000);
      } else {
        this.showAlert(data.message || 'Mã OTP không đúng. Vui lòng thử lại.', 'error');
        this.showError();
        this.clearInputs();
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      this.showAlert('Có lỗi xảy ra. Vui lòng thử lại sau.', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async resendOTP() {
    const resendBtn = document.getElementById('resendOtpBtn');
    resendBtn.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: this.email
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showAlert('Mã OTP mới đã được gửi đến email của bạn!', 'success');
        this.clearInputs();
        clearInterval(this.timer);
        this.startTimer();
      } else {
        this.showAlert(data.message || 'Không thể gửi lại OTP. Vui lòng thử lại sau.', 'error');
        resendBtn.disabled = false;
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      this.showAlert('Có lỗi xảy ra. Vui lòng thử lại sau.', 'error');
      resendBtn.disabled = false;
    }
  }

  open(email) {
    this.email = email;
    document.getElementById('otpEmail').textContent = email;
    this.modal.classList.add('active');
    this.clearInputs();
    this.startTimer();
    this.inputs[0].focus();
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.modal.classList.remove('active');
    clearInterval(this.timer);
    this.clearInputs();
    
    // Restore body scroll
    document.body.style.overflow = '';
  }
}

// Initialize OTP Modal
const otpModal = new OTPModal();

// Make it globally accessible
window.otpModal = otpModal;
