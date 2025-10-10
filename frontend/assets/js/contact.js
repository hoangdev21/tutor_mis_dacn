// Contact form handling
async function submitContactForm(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  const data = {
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    subject: formData.get('subject'),
    message: formData.get('message')
  };

  try {
    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';

    // Send contact message to backend
    const response = await fetch(`${API_URL}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      // Show success message
      showNotification('Tin nhắn đã được gửi thành công! Chúng tôi sẽ phản hồi sớm nhất.', 'success');
      
      // Reset form
      form.reset();
    } else {
      showNotification(result.message || 'Có lỗi xảy ra khi gửi tin nhắn', 'error');
    }

    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;

  } catch (error) {
    console.error('Error submitting contact form:', error);
    showNotification('Không thể gửi tin nhắn. Vui lòng thử lại sau.', 'error');
    
    // Re-enable button
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi tin nhắn';
  }
}

// Show notification helper
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    <span>${message}</span>
  `;

  // Add styles if not already present
  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        background: white;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
      }
      
      .notification--success {
        border-left: 4px solid #10b981;
        color: #10b981;
      }
      
      .notification--error {
        border-left: 4px solid #ef4444;
        color: #ef4444;
      }
      
      .notification i {
        font-size: 20px;
      }
      
      .notification span {
        color: #333;
        font-size: 14px;
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Add to body
  document.body.appendChild(notification);

  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('Contact page loaded');
  
  // Add form validation
  const form = document.getElementById('contactForm');
  if (form) {
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        if (input.hasAttribute('required') && !input.value.trim()) {
          input.style.borderColor = '#ef4444';
        } else {
          input.style.borderColor = '#e1e8ed';
        }
      });
    });
  }
});
