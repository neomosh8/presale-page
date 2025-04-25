// Create the toast container if it doesn't exist
function createToastContainer() {
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
}

// Toast notification function to replace alerts
function showToast(message, type = 'info', duration = 3000) {
  createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Add icon based on type
  let iconHtml = '';
  switch (type) {
    case 'success':
      iconHtml = '<i class="fas fa-check-circle"></i>';
      break;
    case 'error':
      iconHtml = '<i class="fas fa-exclamation-circle"></i>';
      break;
    case 'warning':
      iconHtml = '<i class="fas fa-exclamation-triangle"></i>';
      break;
    default:
      iconHtml = '<i class="fas fa-info-circle"></i>';
  }
  
  toast.innerHTML = `
    <div class="toast-icon">${iconHtml}</div>
    <div class="toast-message">${message}</div>
    <button class="toast-close">&times;</button>
  `;
  
  const container = document.getElementById('toast-container');
  container.appendChild(toast);
  
  // Add closing functionality
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.classList.add('toast-hide');
    setTimeout(() => {
      toast.remove();
    }, 300);
  });
  
  // Auto remove after duration
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('toast-hide');
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 300);
    }
  }, duration);
  
  // Add entrance animation
  setTimeout(() => {
    toast.classList.add('toast-show');
  }, 10);
}

// Add CSS for the toast notifications
function addToastStyles() {
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      #toast-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 350px;
      }
      
      .toast {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        opacity: 0;
        transform: translateX(30px);
        transition: all 0.3s ease;
        border-left: 4px solid #CBD5E1;
        max-width: 100%;
      }
      
      .toast-show {
        opacity: 1;
        transform: translateX(0);
      }
      
      .toast-hide {
        opacity: 0;
        transform: translateX(30px);
      }
      
      .toast-icon {
        margin-right: 12px;
        font-size: 18px;
        flex-shrink: 0;
      }
      
      .toast-message {
        flex-grow: 1;
        font-size: 14px;
        color: #334155;
        line-height: 1.4;
      }
      
      .toast-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #94A3B8;
        padding: 0;
        margin-left: 8px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        transition: background-color 0.2s ease;
      }
      
      .toast-close:hover {
        background-color: #F1F5F9;
        color: #64748B;
      }
      
      /* Toast types */
      .toast-success {
        border-left-color: #10B981;
      }
      
      .toast-success .toast-icon {
        color: #10B981;
      }
      
      .toast-error {
        border-left-color: #EF4444;
      }
      
      .toast-error .toast-icon {
        color: #EF4444;
      }
      
      .toast-warning {
        border-left-color: #F59E0B;
      }
      
      .toast-warning .toast-icon {
        color: #F59E0B;
      }
      
      .toast-info {
        border-left-color: #3B82F6;
      }
      
      .toast-info .toast-icon {
        color: #3B82F6;
      }
      
      @media (max-width: 480px) {
        #toast-container {
          bottom: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
        
        .toast {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialize toast system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  addToastStyles();
});

// Now replace all alerts with the toast system
function replaceAlerts() {
  // Save the original alert function
  window._originalAlert = window.alert;
  
  // Override the alert function
  window.alert = function(message) {
    showToast(message, 'info');
  };
}

// Call this function to replace all alerts
replaceAlerts();