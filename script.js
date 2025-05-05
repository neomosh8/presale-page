/* ── Toast Notification System ────────────────────────────────────────────── */
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

/* ── Stripe object ────────────────────────────────────────────────────── */
const stripe = Stripe('pk_live_51RFlwdHHD8eaYRObFGNzYCnpYOTPGcpFPzwhxePgl0xDVSm6HOnFxQk5vr8Cp2oArwk2UYH0Ro7Pnqh6g98boWiN00gWz3IIo5');

/* ── Pricing constants ────────────────────────────────────────────────── */
const FULL_PRICE = 499;
const DISCOUNT_PCT = 0.40;  // 40% discount for full payment
const EARLY_BIRD_PCT = 0.30; // 30% discount for deposit option
const DEPOSIT_PCT = 49/349; // Calculate the exact percentage for deposit
const depositAmount = 49;
const discountedPrice = 299;
const earlyBirdTotal = 349; // Total price after 30% discount
const earlyBirdRemaining = earlyBirdTotal - depositAmount; // Amount to pay later ($300)
let purchasedSpots = parseInt(localStorage.getItem('purchasedSpots') || '0');
// We'll populate this with environment variable later
let MAX_SPOTS = 10;
/* ── Global state ──────────────────────────────────────────────────────── */
let currentPurchase = {
  amount: 0,
  contactMethod: '',
  contactValue: ''
};

let pendingComment = {
  contactMethod: '',
  contactValue: '',
  text: ''
};

let currentUser = null;
let authToken = null;

/* ── Helper functions ─────────────────────────────────────────────────── */
const formatCurrency = (a) => '$' + a.toFixed(2);

// Check for stored auth token and validate it
async function checkStoredAuth() {
  const storedToken = localStorage.getItem('authToken');
  if (!storedToken) return false;
  
  try {
    const res = await fetch('/api/auth-token', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'validate', token: storedToken})
    });
    
    if (!res.ok) throw new Error(`Server responded with status: ${res.status}`);
    
    const data = await res.json();
    if (data.valid) {
      authToken = storedToken;
      currentUser = data.user;
      
      // Update UI to show logged in state
      document.getElementById('login-button').textContent = 'My Profile';
      
      // Update comment form for logged-in user
      document.getElementById('comment-form').classList.add('user-logged-in');
      
      return true;
    } else {
      localStorage.removeItem('authToken');
      return false;
    }
  } catch (error) {
    console.error('Auth validation error:', error);
    localStorage.removeItem('authToken');
    return false;
  }
}

// Load comments from API
async function loadComments() {
  const list = document.getElementById('comments-list');
  list.innerHTML = '<p style="text-align:center">Loading comments...</p>';
  
  try {
    const res = await fetch('/api/comments');
    if (!res.ok) throw new Error(`Server responded with status: ${res.status}`);
    
    const comments = await res.json();
    
    list.innerHTML = '';
    
    if (!comments.length) {
      list.innerHTML = '<p style="color:var(--medium-gray);text-align:center">No comments yet.</p>';
      return;
    }
    
    // Sort comments by date (newest first)
    comments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
           .forEach(displayComment);
    
  } catch (error) {
    console.error('Error loading comments:', error);
    list.innerHTML = '<p style="color:var(--medium-gray);text-align:center">Error loading comments.</p>';
  }
}

// Display a comment in the UI
function displayComment(comment) {
  const d = document.createElement('div'); 
  d.className = 'comment';
  
  const header = document.createElement('div');
  header.className = 'comment-header';
  
  const s = document.createElement('strong'); 
  s.textContent = comment.contactValue;
  
  // Add verified badge if applicable
  if (comment.verified) {
    const badge = document.createElement('span');
    badge.className = 'verified-badge';
    badge.textContent = 'Verified Purchase';
    header.appendChild(badge);
  }
  
  header.prepend(s);
  
  const p = document.createElement('p');
  p.textContent = comment.text;
  
  const date = document.createElement('small');
  date.textContent = new Date(comment.timestamp).toLocaleString();
  
  d.append(header, p, date);
  document.getElementById('comments-list').appendChild(d);
}

// Modal management functions
function openModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
  // Reset fields if needed
  const modal = document.getElementById(modalId);
  const inputs = modal.querySelectorAll('input:not([type="radio"])');
  inputs.forEach(input => input.value = '');
  
  // Reset OTP sections
  if (modalId === 'purchase-otp-modal') {
    document.getElementById('purchase-otp-section').style.display = 'none';
    document.getElementById('purchase-send-otp-btn').disabled = false;
  } else if (modalId === 'login-modal') {
    document.getElementById('login-otp-section').style.display = 'none';
    document.getElementById('login-send-otp-btn').disabled = false;
  } else if (modalId === 'phone-collection-modal') {
    document.getElementById('phone-otp-section').style.display = 'none';
    document.getElementById('phone-send-otp-btn').disabled = false;
  }
}

// Pre-populate shipping form with user information
function populateShippingForm(user) {
  // Get form fields
  const emailField = document.querySelector('input[name="ship-email"]');
  const phoneField = document.querySelector('input[name="ship-phone"]');
  const nameField = document.querySelector('input[name="ship-name"]');
  const addressField = document.querySelector('input[name="ship-address"]');
  const cityField = document.querySelector('input[name="ship-city"]');
  const countryField = document.querySelector('input[name="ship-country"]');
  
  // Populate primary contact
  if (user.contactMethod === 'email') {
    emailField.value = user.contactValue;
  } else if (user.contactMethod === 'sms') {
    phoneField.value = user.contactValue;
  }
  
  // Populate secondary contacts if available
  if (user.email && user.contactMethod !== 'email') {
    emailField.value = user.email;
  }
  
  if (user.phone && user.contactMethod !== 'sms') {
    phoneField.value = user.phone;
  }
  
  // If we have stored shipping info, pre-populate other fields
  if (user.shippingInfo) {
    nameField.value = user.shippingInfo.name || '';
    addressField.value = user.shippingInfo.address || '';
    cityField.value = user.shippingInfo.city || '';
    countryField.value = user.shippingInfo.country || '';
  }
}

// Show profile modal with user data
async function showProfileModal(user, orders) {
  // Create contact info HTML
  let contactHTML = '';
  
  // Display primary contact method
  contactHTML += `<p><strong>Primary Contact (${user.contactMethod}):</strong> ${user.contactValue}</p>`;
  
  // Display secondary contact methods if available
  if (user.email && user.contactMethod !== 'email') {
    contactHTML += `<p><strong>Email:</strong> ${user.email}</p>`;
  }
  
  if (user.phone && user.contactMethod !== 'sms') {
    contactHTML += `<p><strong>Phone:</strong> ${user.phone}</p>`;
  }
  
  // Add shipping info if available
  if (user.shippingInfo) {
    contactHTML += '<p><strong>Shipping Address:</strong><br>';
    if (user.shippingInfo.name) contactHTML += `${user.shippingInfo.name}<br>`;
    if (user.shippingInfo.address) contactHTML += `${user.shippingInfo.address}<br>`;
    if (user.shippingInfo.city && user.shippingInfo.country) {
      contactHTML += `${user.shippingInfo.city}, ${user.shippingInfo.country}`;
    }
    contactHTML += '</p>';
  }
  
  // Update the profile contact element
  document.getElementById('profile-contact').innerHTML = contactHTML;
  
  // Display order history
  const ul = document.getElementById('order-history');
  ul.innerHTML = '';
  
  if (!orders || !orders.length) {
    ul.innerHTML = '<li>No orders yet.</li>';
  } else {
    orders.forEach(o => {
      const li = document.createElement('li');
      li.textContent = `Order ${o.id}: $${o.amount.toFixed(2)} on ${new Date(o.created).toLocaleString()}`;
      ul.appendChild(li);
    });
  }
  
  // Add logout button to profile modal
  const logoutBtn = document.createElement('button');
  logoutBtn.id = 'logout-btn';
  logoutBtn.textContent = 'Logout';
  
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    document.getElementById('login-button').textContent = 'Login';
    document.getElementById('comment-form').classList.remove('user-logged-in');
    updateFormValidation(); 
    closeModal('profile-modal');
    showToast('You have been logged out', 'info');
  });
  
  // Replace existing logout button if it exists, otherwise append
  const existingLogoutBtn = document.getElementById('logout-btn');
  if (existingLogoutBtn) {
    existingLogoutBtn.parentNode.replaceChild(logoutBtn, existingLogoutBtn);
  } else {
    document.querySelector('#profile-modal .modal-content').appendChild(logoutBtn);
  }
  
  openModal('profile-modal');
}

// API calls with error handling
async function sendOtp(method, value) {
  try {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({contactMethod: method, contactValue: value})
    });
    
    if (!res.ok) {
      throw new Error(`Server responded with status: ${res.status}`);
    }
    
    const data = await res.json();
    return data.success;
  } catch (error) {
    console.error('Error sending OTP:', error);
    return false;
  }
}

async function verifyOtp(method, value, code) {
  try {
    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        contactMethod: method, 
        contactValue: value, 
        code
      })
    });
    
    if (!res.ok) {
      throw new Error(`Server responded with status: ${res.status}`);
    }
    
    const data = await res.json();
    return data.verified;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return false;
  }
}

async function updateUserProfile(currentContactMethod, currentContactValue, updatedInfo) {
  try {
    const res = await fetch('/api/update-user-profile', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        currentContactMethod,
        currentContactValue,
        updatedInfo,
        token: authToken
      })
    });
    
    if (!res.ok) {
      throw new Error(`Server responded with status: ${res.status}`);
    }
    
    const data = await res.json();
    return data.user;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return null;
  }
}

function updateFormValidation() {
  const emailField = document.getElementById('comment-email');
  if (currentUser) {
    // If logged in, remove required attribute
    emailField.removeAttribute('required');
  } else {
    // If not logged in, add required attribute
    emailField.setAttribute('required', '');
  }
}

/* --- Google Authentication --- */
// Callback function for Google Sign-In
function handleGoogleSignIn(response) {
  const idToken = response.credential;
  
  // Send the ID token to your server
  authenticateWithGoogle(idToken);
}

// Make this function available to the global scope for Google's callback
window.handleGoogleSignIn = handleGoogleSignIn;

async function authenticateWithGoogle(idToken) {
  try {
    const response = await fetch('/api/google-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Save authentication token
    authToken = data.token;
    localStorage.setItem('authToken', authToken);
    
    // Update current user
    currentUser = data.user;
    document.getElementById('login-button').textContent = 'My Profile';
    document.getElementById('comment-form').classList.add('user-logged-in');
    updateFormValidation();
    
    // Close login modal
    closeModal('login-modal');
    
    // Check if phone number is needed
    if (data.needsPhone) {
      openModal('phone-collection-modal');
      showToast('Please add your phone number to complete your profile', 'info');
    } else {
      // Show profile
      showProfileModal(data.user, data.orders);
      showToast('Google authentication successful', 'success');
    }
  } catch (error) {
    console.error('Google authentication error:', error);
    showToast('Error during Google authentication. Please try again.', 'error');
  }
}

// Twitter conversion tracking function
function trackTwitterConversion(orderValue, email) {
  if (typeof twq !== 'function') return;
  
  twq('event', 'tw-pmtpc-pmtpd', {
    value: orderValue, 
    email_address: email
  });
}

/* ── DOMContentLoaded ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {

  const videoSection = document.querySelector('.product-video');
  const video = document.querySelector('.product-video video');
  
  if (!videoSection || !video) return;
  
  // Create a container for the button
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'demo-button-container';
  
  // Create the button
  const demoButton = document.createElement('button');
  demoButton.className = 'demo-button';
  demoButton.textContent = 'Watch product demo';
  
  // Add the button to the container
  buttonContainer.appendChild(demoButton);
  
  // Insert the container after the video section
  videoSection.parentNode.insertBefore(buttonContainer, videoSection.nextSibling);
  
  // Add click event listener to the button
  demoButton.addEventListener('click', function() {
    // The demo chapter starts at 30 seconds based on your video-analytics.js
    video.currentTime = 30;
    
    // Make sure video is playing
    video.play().catch(error => {
      console.error('Error playing video:', error);
    });
    
    // Scroll to ensure video is visible
    videoSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  // Initialize toast notification system
  addToastStyles();

  /* ----- Create Order Success Modal ----- */
  // Add the order success modal to the DOM if it doesn't exist
  if (!document.getElementById('order-success-modal')) {
    const orderSuccessModal = document.createElement('div');
    orderSuccessModal.id = 'order-success-modal';
    orderSuccessModal.className = 'modal hidden';
    orderSuccessModal.innerHTML = `
      <div class="modal-content">
        <span class="close-modal" data-modal="order-success-modal">&times;</span>
        <h3>Order Confirmation</h3>
        <div id="order-success-details">
          <p><strong>Thank you for your purchase!</strong></p>
          <p>Your order has been confirmed. You will receive a confirmation email shortly.</p>
          <div id="order-info-display"></div>
        </div>
        <button id="order-success-close-btn">Close</button>
      </div>
    `;
    document.body.appendChild(orderSuccessModal);
  }

  /* ----- Populate prices ----- */
  document.getElementById('full-price-display').textContent = formatCurrency(FULL_PRICE);
  document.getElementById('deposit-price-display').textContent = formatCurrency(depositAmount);
  document.getElementById('deposit-description').innerHTML = 
  "Get the Early Bird discount! Pay <strong>" + formatCurrency(depositAmount) + "</strong> today and just <strong>" + formatCurrency(349-depositAmount) + "</strong> later when your OneSpark ships in Q4 2025. That's a total of <strong>$349</strong> - a 30% savings off the retail price!";
  document.getElementById('buy-now-original-price').textContent = formatCurrency(FULL_PRICE);
  const buyNowDisp = document.getElementById('buy-now-price-display');
  buyNowDisp.childNodes[buyNowDisp.childNodes.length-1].nodeValue = ` ${formatCurrency(discountedPrice)}`;


// Fetch max spots environment variable
fetch('/api/get-config')
  .then(response => response.json())
  .then(data => {
    if (data.MAX_SPOTS) {
      MAX_SPOTS = parseInt(data.MAX_SPOTS);
      updateSpotsProgress();
    }
  })
  .catch(error => {
    console.error('Error fetching configuration:', error);
  });

// Function to update spots progress bar
// Add this to the bottom of your DOMContentLoaded event listener
// after all the other code but before the closing brackets

// Enhanced version of updateSpotsProgress that includes debugging
function updateSpotsProgress() {
  console.log('Updating spots progress, MAX_SPOTS:', MAX_SPOTS, 'purchasedSpots:', purchasedSpots);
  
  const progressFill = document.getElementById('spots-progress-fill');
  const spotsAvailableElement = document.getElementById('spots-available');
  const spotsTotalElement = document.getElementById('spots-total');
  const spotsContainer = document.querySelector('.spots-progress-container');
  
  // If any element is missing, exit early
  if (!progressFill || !spotsAvailableElement || !spotsTotalElement || !spotsContainer) {
    console.error('Required elements for progress bar not found. Check your HTML.');
    return;
  }
  
  const spotsAvailable = MAX_SPOTS - purchasedSpots;
  
  // Calculate percentage filled
  const percentFilled = (purchasedSpots / MAX_SPOTS) * 100;
  console.log('Percent filled:', percentFilled + '%');
  
  // Update the progress bar fill width
  progressFill.style.width = `${percentFilled}%`;
  
  // Update text counter
  spotsAvailableElement.textContent = spotsAvailable;
  spotsTotalElement.textContent = MAX_SPOTS;
  
  // Add urgency styling when less than 30% spots remain
  if (spotsAvailable <= MAX_SPOTS * 0.3) {
    spotsContainer.classList.add('spots-limited');
  } else {
    spotsContainer.classList.remove('spots-limited');
  }
  
  // Disable button if no spots available
  const buyNowButton = document.getElementById('buy-now-button');
  if (spotsAvailable <= 0 && buyNowButton) {
    buyNowButton.disabled = true;
    buyNowButton.textContent = 'Sold Out';
    document.querySelector('.option-card:last-child').classList.add('sold-out');
  }
}

// Get configuration and purchase count from server
async function initializeSpots() {
  console.log('Initializing spots from server...');
  
  try {
    // Fetch the actual purchase count from the server
    const response = await fetch('/api/purchase-count');
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Server data received:', data);
    
    // Update global variables
    if (data.maxSpots) {
      MAX_SPOTS = parseInt(data.maxSpots);
    }
    
    // Important: Update the purchasedSpots variable with the actual server count
    // Only use localStorage if the server count is lower (to handle new purchases)
    const storedCount = parseInt(localStorage.getItem('purchasedSpots') || '0');
    purchasedSpots = Math.max(data.count, storedCount);
    
    // Update localStorage to match
    localStorage.setItem('purchasedSpots', purchasedSpots.toString());
    
    // Update the UI
    updateSpotsProgress();
  } catch (error) {
    console.error('Error fetching data from server:', error);
    // Fall back to localStorage if server fetch fails
    updateSpotsProgress();
  }
}

// Add a function to check if elements exist and try again if not
function ensureProgressBarInit() {
  const required = [
    document.getElementById('spots-progress-fill'),
    document.getElementById('spots-available'),
    document.getElementById('spots-total'),
    document.querySelector('.spots-progress-container')
  ];
  
  if (required.every(el => el)) {
    console.log('All progress bar elements found, initializing from server...');
    initializeSpots();
  } else {
    console.log('Progress bar elements not found, will retry in 500ms...');
    setTimeout(ensureProgressBarInit, 500);
  }
}

// Start initialization process
ensureProgressBarInit();

// Add a function to check if elements exist and try again if not
function ensureProgressBarInit() {
  const required = [
    document.getElementById('spots-progress-fill'),
    document.getElementById('spots-available'),
    document.getElementById('spots-total'),
    document.querySelector('.spots-progress-container')
  ];
  
  if (required.every(el => el)) {
    console.log('All progress bar elements found, initializing...');
    initializeSpots();
  } else {
    console.log('Progress bar elements not found, will retry in 500ms...');
    setTimeout(ensureProgressBarInit, 500);
  }
}

// Start initialization process
ensureProgressBarInit();


  /* ----- Check for stored authentication ----- */
  await checkStoredAuth();
  updateFormValidation(); 
  
  /* ----- Setup close buttons for all modals ----- */
  document.querySelectorAll('.close-modal').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      const modalId = closeBtn.getAttribute('data-modal');
      closeModal(modalId);
    });
  });
  
  // Close modal when clicking outside content
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });
  
  // Close profile modal with button
  document.getElementById('profile-close-btn').addEventListener('click', () => {
    closeModal('profile-modal');
  });

  // Close order success modal with button
  document.body.addEventListener('click', (e) => {
    if (e.target.id === 'order-success-close-btn') {
      closeModal('order-success-modal');
    }
  });

  /* ----- Purchase flow ----- */
  document.querySelectorAll('.btn-deposit, .btn-buy').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.id === 'deposit-button') {
        currentPurchase.amount = depositAmount;
      } else if (btn.id === 'buy-now-button') {
        currentPurchase.amount = discountedPrice;
      } else {
        currentPurchase.amount = parseFloat(btn.dataset.amount);
      }
      
      // If user is already logged in, skip to shipping
      if (currentUser) {
        currentPurchase.contactMethod = currentUser.contactMethod;
        currentPurchase.contactValue = currentUser.contactValue;
        openModal('shipping-modal');
        
        // Pre-populate shipping form with user information
        populateShippingForm(currentUser);
      } else {
        openModal('purchase-otp-modal');
      }
    });
  });

  /* contact method switch - purchase */
  document.getElementsByName('purchase-contact-method').forEach(r => {
    r.addEventListener('change', e => {
      const inp = document.getElementById('purchase-contact-value');
      if (e.target.value === 'sms') {
        inp.type = 'tel';
        inp.placeholder = 'Enter phone number';
        inp.pattern = '[0-9+\\-\\s()]{6,20}';
      } else {
        inp.type = 'email';
        inp.placeholder = 'Enter email address';
        inp.pattern = '';
      }
    });
  });

  /* send OTP (purchase) */
  document.getElementById('purchase-send-otp-btn').addEventListener('click', async () => {
    const method = document.querySelector('input[name="purchase-contact-method"]:checked').value;
    const val = document.getElementById('purchase-contact-value').value.trim();
    
    if (!val) {
      showToast('Please enter your contact information.', 'warning');
      return;
    }
    
    if (method === 'email' && !val.includes('@')) {
      showToast('Please enter a valid email address.', 'warning');
      return;
    }
    
    const btn = document.getElementById('purchase-send-otp-btn');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    
    if (await sendOtp(method, val)) {
      document.getElementById('purchase-otp-section').style.display = 'block';
      btn.textContent = 'Resend OTP';
      btn.disabled = false;
      showToast('Verification code sent successfully', 'success');
    } else {
      showToast('Failed to send OTP. Please try again.', 'error');
      btn.textContent = 'Send OTP';
      btn.disabled = false;
    }
  });

  /* verify OTP (purchase) */
  document.getElementById('purchase-verify-otp-btn').addEventListener('click', async () => {
    const method = document.querySelector('input[name="purchase-contact-method"]:checked').value;
    const val = document.getElementById('purchase-contact-value').value.trim();
    const code = document.getElementById('purchase-otp-code').value.trim();
    
    if (!code) {
      showToast('Please enter the OTP code.', 'warning');
      return;
    }
    
    document.getElementById('purchase-verify-otp-btn').disabled = true;
    document.getElementById('purchase-verify-otp-btn').textContent = 'Verifying...';
    
    if (await verifyOtp(method, val, code)) {
      currentPurchase.contactMethod = method;
      currentPurchase.contactValue = val;
      
      // Also update the current user
      currentUser = { contactMethod: method, contactValue: val };
      document.getElementById('login-button').textContent = 'My Profile';
      document.getElementById('comment-form').classList.add('user-logged-in');
      updateFormValidation(); 
  
      // Generate auth token
      try {
        const tokenRes = await fetch('/api/auth-token', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            action: 'create',
            contactMethod: method,
            contactValue: val
          })
        });
        
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          authToken = tokenData.token;
          localStorage.setItem('authToken', authToken);
        }
      } catch (error) {
        console.error('Error creating auth token:', error);
      }
      
      closeModal('purchase-otp-modal');
      openModal('shipping-modal');
      showToast('Verification successful', 'success');
      
      // Pre-populate shipping form with verified contact info
      if (method === 'email') {
        document.querySelector('input[name="ship-email"]').value = val;
      } else if (method === 'sms') {
        document.querySelector('input[name="ship-phone"]').value = val;
      }
    } else {
      showToast('Incorrect OTP. Please try again.', 'error');
      document.getElementById('purchase-verify-otp-btn').disabled = false;
      document.getElementById('purchase-verify-otp-btn').textContent = 'Verify OTP';
    }
  });

  /* shipping form → Stripe */
  document.getElementById('shipping-form').addEventListener('submit', async e => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('shipping-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    
    const f = e.target;
    const shipping = {
      name: f['ship-name'].value,
      address: f['ship-address'].value,
      city: f['ship-city'].value,
      country: f['ship-country'].value,
      phone: f['ship-phone'].value,
      email: f['ship-email'].value 
    };
    
    // Update user profile with all contact info
    if (currentUser) {
      // Store both email and phone from shipping form to user profile
      const updatedContactInfo = {
        email: shipping.email,
        phone: shipping.phone,
        shippingInfo: {
          name: shipping.name,
          address: shipping.address,
          city: shipping.city,
          country: shipping.country
        }
      };
      
      try {
        if (authToken) {
          // Update user profile with new contact and shipping information
          const updatedUser = await updateUserProfile(
            currentUser.contactMethod,
            currentUser.contactValue,
            updatedContactInfo
          );
          
          if (updatedUser) {
            // Update current user with consolidated data
            currentUser = {
              ...currentUser,
              ...updatedUser
            };
          }
        }
      } catch (error) {
        console.error('Error updating user profile:', error);
        // Continue with checkout anyway
      }
    }
    
    try {
      // Store order info in localStorage for retrieval after checkout
      localStorage.setItem('pendingOrder', JSON.stringify({
        amount: currentPurchase.amount,
        contactMethod: currentPurchase.contactMethod,
        contactValue: currentPurchase.contactValue,
        shipping: shipping,
        id: `order_${Date.now()}`,
        timestamp: new Date().toISOString()
      }));
      
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          amount: currentPurchase.amount,
          contactMethod: currentPurchase.contactMethod,
          contactValue: currentPurchase.contactValue,
          shipping
        })
      });
      
      if (!res.ok) {
        throw new Error(`Server responded with status: ${res.status}`);
      }
      
      const {sessionUrl} = await res.json();
      window.location = sessionUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      showToast('An error occurred during checkout. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Continue to Payment';
    }
  });

  /* ----- Login flow ----- */
  document.getElementById('login-button').addEventListener('click', () => {
    // If already logged in, show profile instead
    if (currentUser) {
      fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          contactMethod: currentUser.contactMethod, 
          contactValue: currentUser.contactValue
        })
      })
      .then(res => res.json())
      .then(data => {
        // Update current user with latest data
        currentUser = { ...currentUser, ...data.user };
        showProfileModal(currentUser, data.orders);
      })
      .catch(err => {
        console.error('Error fetching profile:', err);
        // If error, force login again
        localStorage.removeItem('authToken');
        currentUser = null;
        document.getElementById('login-button').textContent = 'Login';
        document.getElementById('comment-form').classList.remove('user-logged-in');
        openModal('login-modal');
        showToast('Session expired. Please login again.', 'warning');
      });
    } else {
      openModal('login-modal');
    }
  });
  
  document.getElementsByName('login-contact-method').forEach(r => {
    r.addEventListener('change', e => {
      const inp = document.getElementById('login-contact-value');
      if (e.target.value === 'sms') {
        inp.type = 'tel';
        inp.placeholder = 'Enter phone number';
        inp.pattern = '[0-9+\\-\\s()]{6,20}';
      } else {
        inp.type = 'email';
        inp.placeholder = 'Enter email address';
        inp.pattern = '';
      }
    });
  });
  
  document.getElementById('login-send-otp-btn').addEventListener('click', async () => {
    const method = document.querySelector('input[name="login-contact-method"]:checked').value;
    const val    = document.getElementById('login-contact-value').value.trim();
  
    if (!val) {
      showToast('Please enter your contact information.', 'warning');
      return;
    }
    if (method === 'email' && !val.includes('@')) {
      showToast('Please enter a valid email address.', 'warning');
      return;
    }
  
    const btn = document.getElementById('login-send-otp-btn');
    btn.disabled   = true;
    btn.textContent = 'Sending...';
  
    if (await sendOtp(method, val)) {
      // show OTP section
      document.getElementById('login-otp-section').style.display = 'block';
      btn.textContent = 'Resend OTP';
      btn.disabled   = false;
      showToast('Verification code sent successfully', 'success');
    } else {
      showToast('Failed to send verification code. Please try again.', 'error');
      btn.textContent = 'Send OTP';
      btn.disabled   = false;
    }
  });
  
  document.getElementById('login-verify-otp-btn').addEventListener('click', async () => {
    const method = document.querySelector('input[name="login-contact-method"]:checked').value;
    const val = document.getElementById('login-contact-value').value.trim();
    const code = document.getElementById('login-otp-code').value.trim();
    
    if (!code) {
      showToast('Please enter the OTP code.', 'warning');
      return;
    }
    
    document.getElementById('login-verify-otp-btn').disabled = true;
    document.getElementById('login-verify-otp-btn').textContent = 'Verifying...';
    
    try {
      if (await verifyOtp(method, val, code)) {
        closeModal('login-modal');
        
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({contactMethod: method, contactValue: val})
        });
        
        if (!res.ok) {
          throw new Error(`Server responded with status: ${res.status}`);
        }
        
        const data = await res.json();
        
        // Save auth token in localStorage
        authToken = data.token;
        localStorage.setItem('authToken', authToken);
        
        // Update current user
        currentUser = data.user;
        document.getElementById('login-button').textContent = 'My Profile';
        document.getElementById('comment-form').classList.add('user-logged-in');
        updateFormValidation(); 

        showToast('Login successful', 'success');
        showProfileModal(data.user, data.orders);
      } else {
        showToast('Incorrect OTP. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showToast('An error occurred during login. Please try again.', 'error');
    } finally {
      document.getElementById('login-verify-otp-btn').disabled = false;
      document.getElementById('login-verify-otp-btn').textContent = 'Verify & Load Profile';
    }
  });
  
  /* ----- Comments with OTP ----- */
  document.getElementById('comment-form').addEventListener('submit', async e => {
    e.preventDefault();
    
    // Get comment text first
    const text = document.getElementById('comment-text').value.trim();
    
    if (!text) {
      showToast('Please enter a comment.', 'warning');
      return;
    }
    
    // If user is already logged in, use their info
    if (currentUser) {
      try {
        const res = await fetch('/api/comments', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            contactMethod: currentUser.contactMethod,
            contactValue: currentUser.contactValue,
            text
          })
        });
        
        if (!res.ok) throw new Error(`Server responded with status: ${res.status}`);
        
        const newComment = await res.json();
        
        // Add comment to the list
        displayComment(newComment);
        
        // Clear form
        document.getElementById('comment-text').value = '';
        
        showToast('Comment added successfully!', 'success');
      } catch (error) {
        console.error('Error adding comment:', error);
        showToast('Failed to add comment. Please try again.', 'error');
      }
    } else {
      // For non-logged in users, use email and OTP verification
      const emailField = document.getElementById('comment-email');
      const email = emailField.value.trim();
      
      if (!email) {
        showToast('Please enter your email.', 'warning');
        return;
      }
      
      // Simple email validation
      if (!email.includes('@')) {
        showToast('Please enter a valid email address.', 'warning');
        return;
      }
      
      // Store comment data for later use
      pendingComment = {
        contactMethod: 'email',
        contactValue: email,
        text
      };
      
      // Send OTP
      try {
        const otpSent = await sendOtp('email', email);
        if (otpSent) {
          // Open comment OTP modal
          openModal('comment-otp-modal');
          showToast('Verification code sent to your email', 'info');
        } else {
          showToast('Failed to send verification code. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Error sending OTP:', error);
        showToast('Failed to send verification code. Please try again.', 'error');
      }
    }
  });

  // Handle comment verification
  document.getElementById('comment-verify-otp-btn').addEventListener('click', async () => {
    const code = document.getElementById('comment-otp-code').value.trim();
    
    if (!code) {
      showToast('Please enter the verification code.', 'warning');
      return;
    }
    
    document.getElementById('comment-verify-otp-btn').disabled = true;
    document.getElementById('comment-verify-otp-btn').textContent = 'Verifying...';
    
    try {
      if (await verifyOtp('email', pendingComment.contactValue, code)) {
        // Post comment to API
        const res = await fetch('/api/comments', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(pendingComment)
        });
        
        if (!res.ok) throw new Error(`Server responded with status: ${res.status}`);
        
        const newComment = await res.json();
        
        // Add to the comments list
        displayComment(newComment);
        
        // Clear form and close modal
        document.getElementById('comment-email').value = '';
        document.getElementById('comment-text').value = '';
        closeModal('comment-otp-modal');
        showToast('Comment added successfully!', 'success');
      } else {
        showToast('Incorrect verification code. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      showToast('Error saving comment. Please try again.', 'error');
    } finally {
      document.getElementById('comment-verify-otp-btn').disabled = false;
      document.getElementById('comment-verify-otp-btn').textContent = 'Verify OTP';
    }
  });
    
  // Load existing comments
  loadComments();
  
  /* ----- Campaign nav smooth scroll ----- */
  const navLinks = document.querySelectorAll('.campaign-nav a');
  const navBar = document.querySelector('.campaign-nav');
  const scrollOffset = (navBar ? navBar.offsetHeight : 0) + 20;
  
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      
      navLinks.forEach(el => el.classList.remove('active'));
      e.target.classList.add('active');
      
      const targetId = e.target.getAttribute('href');
      const target = document.querySelector(targetId);
      
      if (target) {
        const pos = target.getBoundingClientRect().top + window.pageYOffset;
        const offsetPos = pos - scrollOffset;
        window.scrollTo({top: offsetPos, behavior: 'smooth'});
      }
    });
  });
  
  /* ----- Dynamic border effect ----- */
  document.querySelectorAll('.campaign-content, .pricing-section, .option-card').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      el.style.setProperty('--mouse-x', `${x}px`);
      el.style.setProperty('--mouse-y', `${y}px`);
    });
    
    el.addEventListener('mouseleave', () => {
      el.style.setProperty('--mouse-x', '-100px');
      el.style.setProperty('--mouse-y', '-100px');
    });
  });
  
  /* ----- Card click = button click ----- */
  document.querySelectorAll('.option-card').forEach(card => {
    card.addEventListener('click', e => {
      // Prevent triggering button click if already clicking the button
      if (e.target.tagName.toLowerCase() === 'button' || 
          e.target.closest('button')) return;
      
      const btn = card.querySelector('.btn');
      if (btn) btn.click();
    });
  });
  
  /* ----- Add keyboard accessibility -----*/
  // Make modals closable with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
        closeModal(modal.id);
      });
    }
  });
  
  // Make option cards accessible with keyboard
  document.querySelectorAll('.option-card').forEach(card => {
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const btn = card.querySelector('.btn');
        if (btn) btn.click();
      }
    });
  });
  
  /* ----- Phone Collection After Google Login ----- */
  // Send OTP to phone number after Google login
  document.getElementById('phone-send-otp-btn').addEventListener('click', async () => {
    const phoneNumber = document.getElementById('google-user-phone').value.trim();
    
    if (!phoneNumber) {
      showToast('Please enter your phone number.', 'warning');
      return;
    }
    
    const btn = document.getElementById('phone-send-otp-btn');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    
    if (await sendOtp('sms', phoneNumber)) {
      document.getElementById('phone-otp-section').style.display = 'block';
      btn.textContent = 'Resend OTP';
      btn.disabled = false;
      showToast('Verification code sent successfully', 'success');
    } else {
      showToast('Failed to send verification code. Please try again.', 'error');
      btn.textContent = 'Verify Phone Number';
      btn.disabled = false;
    }
  });
  
  // Verify phone OTP and update user profile
  document.getElementById('phone-verify-otp-btn').addEventListener('click', async () => {
    const phoneNumber = document.getElementById('google-user-phone').value.trim();
    const code = document.getElementById('phone-otp-code').value.trim();
    
    if (!code) {
      showToast('Please enter the OTP code.', 'warning');
      return;
    }
    
    document.getElementById('phone-verify-otp-btn').disabled = true;
    document.getElementById('phone-verify-otp-btn').textContent = 'Verifying...';
    
    try {
      if (await verifyOtp('sms', phoneNumber, code)) {
        // Update user profile with phone number
        const updatedUser = await updateUserProfile(
          currentUser.contactMethod,
          currentUser.contactValue,
          { phone: phoneNumber }
        );
        
        if (updatedUser) {
          // Update current user
          currentUser = {
            ...currentUser,
            phone: phoneNumber
          };
          
          // Close phone collection modal
          closeModal('phone-collection-modal');
          
          // Fetch latest user data and show profile
          const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              contactMethod: currentUser.contactMethod, 
              contactValue: currentUser.contactValue
            })
          });
          
          if (res.ok) {
            const data = await res.json();
            showProfileModal(data.user, data.orders);
          } else {
            showProfileModal(currentUser, []);
          }
          
          showToast('Phone number verified and added to your profile!', 'success');
        } else {
          throw new Error('Failed to update profile');
        }
      } else {
        showToast('Incorrect verification code. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Phone verification error:', error);
      showToast('Error verifying phone number. Please try again.', 'error');
    } finally {
      document.getElementById('phone-verify-otp-btn').disabled = false;
      document.getElementById('phone-verify-otp-btn').textContent = 'Verify OTP';
    }
  });
  
/* ----- Handle URL parameters for successful checkout ----- */
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('success') === 'true') {
  // Get stored order information
  const pendingOrder = JSON.parse(localStorage.getItem('pendingOrder') || '{}');
  
  // Display order information in the modal
  if (pendingOrder.amount) {
    const orderInfoHtml = `
      <div class="order-success-info" style="margin-top: 20px; background: #f9f9f9; padding: 15px; border-radius: 5px;">
        <p><strong>Order ID:</strong> <span id="success-order-id">${pendingOrder.id || 'order_' + Date.now()}</span></p>
        <p><strong>Amount Paid:</strong> $${pendingOrder.amount.toFixed(2)}</p>
        <p><strong>Contact:</strong> ${pendingOrder.contactValue}</p>
        <p><strong>Shipping Address:</strong> ${pendingOrder.shipping.address}, ${pendingOrder.shipping.city}, ${pendingOrder.shipping.country}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      </div>
    `;
    
    document.getElementById('order-info-display').innerHTML = orderInfoHtml;
    
    // Update purchased spots if it was a "Buy Now" purchase
    if (pendingOrder.amount === discountedPrice) {
      purchasedSpots++;
      localStorage.setItem('purchasedSpots', purchasedSpots.toString());
      updateSpotsProgress();
    }
  }
  if (pendingOrder.contactValue) {
    trackTwitterConversion(pendingOrder.amount, pendingOrder.contactValue);
  }
  
  // Clear pending order from localStorage
  localStorage.removeItem('pendingOrder');
  
  // Show success modal instead of alert
  openModal('order-success-modal');
  
  // Add event listener for the close button if it doesn't exist yet
  if (!document.getElementById('order-success-close-btn').onclick) {
    document.getElementById('order-success-close-btn').addEventListener('click', () => {
      closeModal('order-success-modal');
    });
  }
} else if (urlParams.get('canceled') === 'true') {
  showToast('Your order was canceled. If you need assistance, please contact us.', 'warning');
}
});

document.addEventListener('DOMContentLoaded', function() {
  // Set a fixed end date (May 7, 2025 at midnight UTC)
  // You can change this to any date you want
  const endDate = new Date('2025-05-07T00:00:00Z');
  
  // Function to check if the sale has already ended
  function hasSaleEnded() {
    const now = new Date();
    return now >= endDate;
  }
  
  // If the sale has already ended, show "Expired" state
  if (hasSaleEnded()) {
    // Update all countdown displays to zero
    document.querySelectorAll('.countdown-value, .card-countdown-value').forEach(el => {
      el.textContent = '00';
    });
    
    // Change the button to "Offer Expired"
    const button = document.querySelector('.super-deal .btn');
    if (button) {
      button.textContent = 'Offer Expired';
      button.disabled = true;
      button.style.opacity = '0.7';
      button.style.cursor = 'not-allowed';
    }
    
    return; // Exit early
  }
  
  // Update the countdown every second
  function updateCountdown() {
    const currentTime = new Date();
    const difference = endDate - currentTime;
    
    if (difference <= 0) {
      // Sale has ended
      document.querySelectorAll('.countdown-value, .card-countdown-value').forEach(el => {
        el.textContent = '00';
      });
      
      // Change the button to "Offer Expired"
      const button = document.querySelector('.super-deal .btn');
      if (button) {
        button.textContent = 'Offer Expired';
        button.disabled = true;
        button.style.opacity = '0.7';
        button.style.cursor = 'not-allowed';
      }
      
      return;
    }
    
    // Calculate days, hours, minutes, seconds
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    
    // Format with leading zeros
    const formattedDays = days.toString().padStart(2, '0');
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');
    
    // Update top bar countdown
    document.getElementById('top-days').textContent = formattedDays;
    document.getElementById('top-hours').textContent = formattedHours;
    document.getElementById('top-minutes').textContent = formattedMinutes;
    document.getElementById('top-seconds').textContent = formattedSeconds;
    
    // Update card countdown
    document.getElementById('card-days').textContent = formattedDays;
    document.getElementById('card-hours').textContent = formattedHours;
    document.getElementById('card-minutes').textContent = formattedMinutes;
    document.getElementById('card-seconds').textContent = formattedSeconds;
  }
  
  // Initial call
  updateCountdown();
  
  // Update every second
  setInterval(updateCountdown, 1000);
  
  // Flash Deal Button Functionality (ensure this is accessible)
  const flashDealButton = document.getElementById('flash-deal-button');
  if (flashDealButton) {
    flashDealButton.addEventListener('click', () => {
      // Set the purchase amount to $99
      currentPurchase.amount = 99;
      
      // If user is already logged in, skip to shipping
      if (currentUser) {
        currentPurchase.contactMethod = currentUser.contactMethod;
        currentPurchase.contactValue = currentUser.contactValue;
        openModal('shipping-modal');
        
        // Pre-populate shipping form with user information
        populateShippingForm(currentUser);
      } else {
        openModal('purchase-otp-modal');
      }
    });
  }
});

// Email capture form enhancement
document.addEventListener('DOMContentLoaded', function() {
  // Wait for form to be fully loaded
  const mcForm = document.getElementById('mc-embedded-subscribe-form');
  
  if (mcForm) {
    // Add client-side validation
    mcForm.addEventListener('submit', function(event) {
      // Prevent the default form submission
      event.preventDefault();
      
      const emailInput = document.getElementById('mce-EMAIL');
      const emailValue = emailInput.value.trim();
      
      // Simple email validation
      if (!validateEmail(emailValue)) {
        // Show error message
        const errorResponse = document.getElementById('mce-error-response');
        if (errorResponse) {
          errorResponse.textContent = 'Please enter a valid email address.';
          errorResponse.style.display = 'block';
          
          // Hide error message after 3 seconds
          setTimeout(() => {
            errorResponse.style.display = 'none';
          }, 3000);
        }
        
        // Focus back on the input
        emailInput.focus();
      } else {
        // Get the form data
        const formData = new FormData(mcForm);
        
        // Convert form action URL to JSON endpoint
        let url = mcForm.getAttribute('action').replace('/post?', '/post-json?');
        
        // Add callback parameter for JSONP
        if (!url.includes('c=')) {
          url += '&c=?';
        }
        
        // Show loading state
        const submitButton = document.getElementById('mc-embedded-subscribe');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Subscribing...';
        submitButton.disabled = true;
        
        // Use JSONP to submit the form (Mailchimp API requirement)
        const script = document.createElement('script');
        script.src = url + '&' + new URLSearchParams(formData).toString();
        
        // Define callback function
        window.mailchimpCallback = function(response) {
          submitButton.textContent = originalButtonText;
          submitButton.disabled = false;
          
          if (response.result === 'success') {
            // Show success toast
            if (typeof showToast === 'function') {
              showToast('Thank you for subscribing to our updates!', 'success', 5000);
            }
            
            // Show success message in form
            const successResponse = document.getElementById('mce-success-response');
            if (successResponse) {
              successResponse.textContent = 'Thank you for subscribing!';
              successResponse.style.display = 'block';
              
              // Hide success message after 5 seconds
              setTimeout(() => {
                successResponse.style.display = 'none';
              }, 5000);
            }
            
            // Clear the input
            emailInput.value = '';
          } else {
            // Show error
            const errorResponse = document.getElementById('mce-error-response');
            if (errorResponse) {
              // Extract error message from response
              const errorMessage = response.msg || 'An error occurred. Please try again.';
              errorResponse.innerHTML = errorMessage;
              errorResponse.style.display = 'block';
              
              // Hide error message after 5 seconds
              setTimeout(() => {
                errorResponse.style.display = 'none';
              }, 5000);
            }
            
            // Show error toast
            if (typeof showToast === 'function') {
              showToast('Subscription error: ' + response.msg, 'error', 5000);
            }
          }
          
          // Remove the script tag
          document.body.removeChild(script);
        };
        
        // Add callback parameter to URL
        script.src = script.src.replace('c=?', 'c=mailchimpCallback');
        
        // Add script to document to execute the request
        document.body.appendChild(script);
        
        // Track signup attempt with analytics
        if (typeof gtag === 'function') {
          gtag('event', 'newsletter_signup', {
            'event_category': 'Engagement',
            'event_label': 'Email Updates Form'
          });
        }
      }
    });
    
    // Focus visual enhancement
    const emailInput = document.getElementById('mce-EMAIL');
    if (emailInput) {
      emailInput.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
      });
      
      emailInput.addEventListener('blur', function() {
        this.parentElement.classList.remove('focused');
      });
    }
  }
  
  // Email validation helper function
  function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }
});
// Add this to your existing script.js file, within the DOMContentLoaded event listener

// Toggle between email and phone input methods
document.addEventListener('click', function(e) {
  if (e.target && e.target.id === 'toggle-contact-method') {
    e.preventDefault();
    const contactInput = document.getElementById('purchase-contact-value');
    const toggleLink = document.getElementById('toggle-contact-method');
    
    if (contactInput.type === 'email') {
      // Switch to phone
      contactInput.type = 'tel';
      contactInput.placeholder = 'Enter your phone number';
      toggleLink.textContent = 'Use email address instead';
      
      // Update any hidden field or state tracking if needed
      currentPurchase.contactMethod = 'sms';
    } else {
      // Switch to email
      contactInput.type = 'email';
      contactInput.placeholder = 'Enter your email address';
      toggleLink.textContent = 'Use phone number instead';
      
      // Update any hidden field or state tracking if needed
      currentPurchase.contactMethod = 'email';
    }
    
    // Clear the input when switching methods
    contactInput.value = '';
  }
  
  // Handle resend OTP as a link
  if (e.target && e.target.id === 'purchase-resend-otp') {
    e.preventDefault();
    const contactMethod = document.getElementById('purchase-contact-value').type === 'email' ? 'email' : 'sms';
    const contactValue = document.getElementById('purchase-contact-value').value.trim();
    
    if (contactValue) {
      // Temporarily disable the link
      e.target.style.opacity = '0.5';
      e.target.style.pointerEvents = 'none';
      
      // Send OTP again
      sendOtp(contactMethod, contactValue).then(success => {
        if (success) {
          showToast('Verification code resent successfully', 'success');
        } else {
          showToast('Failed to resend verification code. Please try again.', 'error');
        }
        
        // Re-enable the link after a delay
        setTimeout(() => {
          e.target.style.opacity = '1';
          e.target.style.pointerEvents = 'auto';
        }, 3000);
      });
    } else {
      showToast('Please enter your contact information first', 'warning');
    }
  }
});

// Modify the purchase-send-otp-btn click handler
document.getElementById('purchase-send-otp-btn').addEventListener('click', async function() {
  const method = document.getElementById('purchase-contact-value').type === 'email' ? 'email' : 'sms';
  const val = document.getElementById('purchase-contact-value').value.trim();
  
  if (!val) {
    showToast('Please enter your contact information.', 'warning');
    return;
  }
  
  if (method === 'email' && !val.includes('@')) {
    showToast('Please enter a valid email address.', 'warning');
    return;
  }
  
  const btn = document.getElementById('purchase-send-otp-btn');
  btn.disabled = true;
  btn.textContent = 'Sending...';
  
  // Update the current purchase contact method based on input type
  currentPurchase.contactMethod = method;
  
  if (await sendOtp(method, contactValue)) {
    // Show OTP verification section
    document.getElementById('purchase-otp-section').style.display = 'block';
    
    // Update message with correct contact method
    const messagePart = method === 'email' ? 'your email' : 'your phone';
    document.querySelector('.otp-sent-message').textContent = `Verification code sent to ${messagePart}`;
    
    // Change button back to normal
    btn.textContent = 'Send Verification Code';
    btn.disabled = false;
    
    showToast('Verification code sent successfully', 'success');
  } else {
    showToast('Failed to send verification code. Please try again.', 'error');
    btn.textContent = 'Send Verification Code';
    btn.disabled = false;
  }
});