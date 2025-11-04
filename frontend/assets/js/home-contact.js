// ===== HOME CONTACT FORM HANDLER =====

document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('homeContactForm');
  
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactFormSubmit);
  }
});

// Handle contact form submission
async function handleContactFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;

  // Get form data
  const formData = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    message: form.message.value.trim()
  };

  // Validate
  if (!formData.name || !formData.email || !formData.phone || !formData.message) {
    showContactNotification('Vui lòng điền đầy đủ thông tin', 'error');
    return;
  }

  // Validate email
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(formData.email)) {
    showContactNotification('Email không hợp lệ', 'error');
    return;
  }

  // Validate phone
  const phoneRegex = /^[0-9]{10,11}$/;
  if (!phoneRegex.test(formData.phone)) {
    showContactNotification('Số điện thoại không hợp lệ (10-11 chữ số)', 'error');
    return;
  }

  // Disable button and show loading
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';

  try {
    const response = await fetch(`${API_BASE_URL}/contact/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      showContactNotification(result.message || 'Đã gửi thông tin thành công!', 'success');
      form.reset();
    } else {
      throw new Error(result.message || 'Không thể gửi thông tin');
    }

  } catch (error) {
    console.error('Contact form error:', error);
    showContactNotification(error.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.', 'error');
  } finally {
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

// Show notification
function showContactNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `contact-notification contact-notification--${type}`;
  
  const icon = type === 'success' ? 'fa-check-circle' : 
               type === 'error' ? 'fa-exclamation-circle' : 
               'fa-info-circle';
  
  notification.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
  `;

  // Add to body
  document.body.appendChild(notification);

  // Show notification
  setTimeout(() => notification.classList.add('show'), 10);

  // Remove after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Add notification styles
const style = document.createElement('style');
style.textContent = `
  .contact-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    background: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    max-width: 400px;
  }

  .contact-notification.show {
    transform: translateX(0);
  }

  .contact-notification i {
    font-size: 20px;
  }

  .contact-notification--success {
    border-left: 4px solid #10b981;
  }

  .contact-notification--success i {
    color: #10b981;
  }

  .contact-notification--error {
    border-left: 4px solid #ef4444;
  }

  .contact-notification--error i {
    color: #ef4444;
  }

  .contact-notification--info {
    border-left: 4px solid #3b82f6;
  }

  .contact-notification--info i {
    color: #3b82f6;
  }

  .contact-notification span {
    color: #1f2937;
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .contact-notification {
      right: 10px;
      left: 10px;
      max-width: none;
    }
  }
`;
document.head.appendChild(style);