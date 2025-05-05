// Enhanced Shipping Form with Google Places API Integration

// Function to initialize Google Places API for address autocomplete
function initGooglePlacesAutocomplete() {
  // Get the shipping address input field and container
  const addressInput = document.getElementById('ship-address-autocomplete');
  const autocompleteContainer = document.getElementById('address-autocomplete-container');
  if (!addressInput || !autocompleteContainer) return;

  // Create options for both new and classic APIs
  const options = {
    fields: ["address_components", "formatted_address"],
    types: ["address"],
    componentRestrictions: { country: ["us", "ca"] }
  };

  // Clear previous autocomplete if exists
  while (autocompleteContainer.firstChild) {
    autocompleteContainer.removeChild(autocompleteContainer.firstChild);
  }

  // Shared handler for place selection
  function handlePlaceSelection(place) {
    if (!place.address_components) {
      console.error('No address components found');
      return;
    }

    // Show the detailed address form fields
    document.getElementById('detailed-address-fields').classList.remove('hidden');

    // Extract address components
    let streetNumber = '';
    let streetName = '';
    let city = '';
    let state = '';
    let country = '';
    let postalCode = '';

    place.address_components.forEach(component => {
      const types = component.types;
      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      } else if (types.includes('route')) {
        streetName = component.long_name;
      } else if (types.includes('locality') || types.includes('sublocality_level_1')) {
        city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = component.long_name;
      } else if (types.includes('country')) {
        country = component.long_name;
      } else if (types.includes('postal_code')) {
        postalCode = component.long_name;
      }
    });

    // Populate street address field
    const streetAddress = streetNumber && streetName
      ? `${streetNumber} ${streetName}`
      : place.formatted_address.split(',')[0];
    document.getElementById('ship-street-address').value = streetAddress;

    // Populate city, state/province, zip/postal code, country
    document.getElementById('ship-city').value = city;
    document.getElementById('ship-state').value = state;
    document.getElementById('ship-zip').value = postalCode;
    document.getElementById('ship-country').value = country;

    // Validate if address is in US or Canada
    const validationMessage = document.getElementById('address-validation-message');
    if (country === 'United States' || country === 'Canada') {
      addressInput.classList.add('validated-address');
      validationMessage.textContent = 'Address validated';
      validationMessage.classList.add('success');
      validationMessage.classList.remove('hidden');
    } else {
      addressInput.classList.remove('validated-address');
      validationMessage.textContent = 'Only US and Canada addresses are supported';
      validationMessage.classList.remove('success');
      validationMessage.classList.remove('hidden');
    }
  }

  // If PlaceAutocompleteElement is available, use it (newer API)
  if (
    window.google &&
    google.maps &&
    google.maps.places &&
    google.maps.places.PlaceAutocompleteElement
  ) {
    const autocompleteElement = new google.maps.places.PlaceAutocompleteElement(options);
    autocompleteContainer.appendChild(autocompleteElement);


  if (google.maps.places.PlaceAutocompleteElement) {
    autocompleteElement.addEventListener('gmp-placeselect', event => {
      const place = event.place;
      if (!place.address_components) {
        console.error('No address components found');
        return;
      }
      handlePlaceSelection(place);
    });   // ← close the addEventListener call here
  } else {
    // fallback to classic Autocomplete…
        // Fallback to classic Autocomplete for backward compatibility
        console.log("Using classic Autocomplete as fallback");

        const autocomplete = new google.maps.places.Autocomplete(addressInput, {
          types: ['address'],
          componentRestrictions: { country: ['us', 'ca'] }
        });
        autocomplete.setFields(['address_components', 'formatted_address']);
    
        // Add a listener for when a place is selected
        autocomplete.addListener('place_changed', function() {
          const place = autocomplete.getPlace();
          handlePlaceSelection(place);
        });
  }
  


  // Add focus listener to hide validation message when editing
  addressInput.addEventListener('focus', function() {
    const validationMessage = document.getElementById('address-validation-message');
    validationMessage.classList.add('hidden');
    addressInput.classList.remove('validated-address');
  });
}

// Initialize the shipping form and Google Places API
function initShippingForm() {
  // Add Google Places API script with proper async loading
  if (!window.google || !window.google.maps || !window.google.maps.places) {
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyB8pNGvH1Aa_Flvigzdvp8kOeDcy6Xwgwk&libraries=places&callback=initGooglePlacesAutocomplete';
    script.async = true;
    document.head.appendChild(script);

    window.initGooglePlacesAutocomplete = initGooglePlacesAutocomplete;
  } else {
    initGooglePlacesAutocomplete();
  }

  // Handle shipping form submission
  document.getElementById('shipping-form')?.addEventListener('submit', async e => {
    e.preventDefault();

    const submitBtn = document.getElementById('shipping-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    const f = e.target;
    const shipping = {
      name: f['ship-name'].value,
      address:
        f['ship-street-address'].value +
        (f['ship-apartment'].value ? `, ${f['ship-apartment'].value}` : ''),
      city: f['ship-city'].value,
      state: f['ship-state'].value,
      zip: f['ship-zip'].value,
      country: f['ship-country'].value,
      phone: f['ship-phone'].value,
      email: f['ship-email'].value
    };

    // Update user profile with all contact info
    if (currentUser) {
      const updatedContactInfo = {
        email: shipping.email,
        phone: shipping.phone,
        shippingInfo: {
          name: shipping.name,
          address: shipping.address,
          city: shipping.city,
          state: shipping.state,
          zip: shipping.zip,
          country: shipping.country
        }
      };
      try {
        if (authToken) {
          const updatedUser = await updateUserProfile(
            currentUser.contactMethod,
            currentUser.contactValue,
            updatedContactInfo
          );
          if (updatedUser) {
            currentUser = { ...currentUser, ...updatedUser };
          }
        }
      } catch (error) {
        console.error('Error updating user profile:', error);
      }
    }

    try {
      localStorage.setItem(
        'pendingOrder',
        JSON.stringify({
          amount: currentPurchase.amount,
          contactMethod: currentPurchase.contactMethod,
          contactValue: currentPurchase.contactValue,
          shipping: shipping,
          id: `order_${Date.now()}`,
          timestamp: new Date().toISOString()
        })
      );

      const checkoutData = {
        amount: currentPurchase.amount,
        contactMethod: currentPurchase.contactMethod,
        contactValue: currentPurchase.contactValue,
        shipping: {
          name: shipping.name,
          address: shipping.address,
          city: shipping.city,
          country: shipping.country,
          state: shipping.state,
          zip: shipping.zip,
          phone: shipping.phone,
          email: shipping.email
        }
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutData)
      });

      if (!res.ok) {
        throw new Error(`Server responded with status: ${res.status}`);
      }

      const { sessionUrl } = await res.json();
      window.location = sessionUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      showToast('An error occurred during checkout. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Continue to Payment';
    }
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Look for shipping-modal and initialize once it's opened
  document.getElementById('login-button')?.addEventListener('click', function() {
    if (currentUser) {
      setTimeout(initShippingForm, 500);
    }
  });

  // Also initialize on purchase buttons
  document.querySelectorAll('.btn-deposit, .btn-buy, #flash-deal-button').forEach(btn => {
    btn.addEventListener('click', function() {
      if (currentUser) {
        setTimeout(initShippingForm, 500);
      }
    });
  });

  // Initialize after OTP verification
  document.getElementById('purchase-verify-otp-btn')?.addEventListener('click', function() {
    setTimeout(function() {
      if (!document.getElementById('shipping-modal').classList.contains('hidden')) {
        initShippingForm();
      }
    }, 1000);
  });
});


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

// Pricing constants
const FULL_PRICE = 499;
const DISCOUNT_PCT = 0.40;
const EARLY_BIRD_PCT = 0.30;
const DEPOSIT_PCT = 49 / 349;
const depositAmount = 49;
const discountedPrice = 299;
const earlyBirdTotal = 349;
const earlyBirdRemaining = earlyBirdTotal - depositAmount;
let purchasedSpots = parseInt(localStorage.getItem('purchasedSpots') || '0');
let MAX_SPOTS = 10;

// Global state
let currentPurchase = { amount: 0, contactMethod: '', contactValue: '' };
let pendingComment = { contactMethod: '', contactValue: '', text: '' };
let currentUser = null;
let authToken = null;
let currentContactMethod = 'email';

// Helper functions
const formatCurrency = a => '$' + a.toFixed(2);

// Check auth token
async function checkStoredAuth() {
  const storedToken = localStorage.getItem('authToken');
  if (!storedToken) return false;
  try {
    const res = await fetch('/api/auth-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'validate', token: storedToken })
    });
    if (!res.ok) throw new Error(`Server responded with status: ${res.status}`);
    const data = await res.json();
    if (data.valid) {
      authToken = storedToken;
      currentUser = data.user;
      document.getElementById('login-button').textContent = 'My Profile';
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

// Load comments
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
    comments
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .forEach(displayComment);
  } catch (error) {
    console.error('Error loading comments:', error);
    list.innerHTML = '<p style="color:var(--medium-gray);text-align:center">Error loading comments.</p>';
  }
}

// Display comment
function displayComment(comment) {
  const d = document.createElement('div');
  d.className = 'comment';
  const header = document.createElement('div');
  header.className = 'comment-header';
  const s = document.createElement('strong');
  s.textContent = comment.contactValue;
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

// Modal management
function openModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.add('hidden');
  const inputs = modal.querySelectorAll('input:not([type="radio"])');
  inputs.forEach(input => (input.value = ''));
  if (modalId === 'purchase-otp-modal') {
    document.getElementById('initial-contact-section').style.display = 'block';
    document.getElementById('purchase-otp-section').style.display = 'none';
    const sendBtn = document.getElementById('purchase-send-otp-btn');
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send Verification Code';
    }
  }
  if (modalId === 'login-modal') {
    document.getElementById('login-otp-section').style.display = 'none';
    document.getElementById('login-send-otp-btn').disabled = false;
  }
  if (modalId === 'phone-collection-modal') {
    document.getElementById('phone-otp-section').style.display = 'none';
    document.getElementById('phone-send-otp-btn').disabled = false;
  }
}

// Pre-populate shipping form
function populateShippingForm(user) {
  const emailField = document.querySelector('input[name="ship-email"]');
  const phoneField = document.querySelector('input[name="ship-phone"]');
  const nameField = document.querySelector('input[name="ship-name"]');
  const addressField = document.querySelector('input[name="ship-address"]');
  const cityField = document.querySelector('input[name="ship-city"]');
  const countryField = document.querySelector('input[name="ship-country"]');

  if (user.contactMethod === 'email') {
    emailField.value = user.contactValue;
  } else if (user.contactMethod === 'sms') {
    phoneField.value = user.contactValue;
  }
  if (user.email && user.contactMethod !== 'email') {
    emailField.value = user.email;
  }
  if (user.phone && user.contactMethod !== 'sms') {
    phoneField.value = user.phone;
  }
  if (user.shippingInfo) {
    nameField.value = user.shippingInfo.name || '';
    addressField.value = user.shippingInfo.address || '';
    cityField.value = user.shippingInfo.city || '';
    countryField.value = user.shippingInfo.country || '';
  }
}

// Show profile modal
async function showProfileModal(user, orders) {
  let contactHTML = '';
  contactHTML += `<p><strong>Primary Contact (${user.contactMethod}):</strong> ${user.contactValue}</p>`;
  if (user.email && user.contactMethod !== 'email') {
    contactHTML += `<p><strong>Email:</strong> ${user.email}</p>`;
  }
  if (user.phone && user.contactMethod !== 'sms') {
    contactHTML += `<p><strong>Phone:</strong> ${user.phone}</p>`;
  }
  if (user.shippingInfo) {
    contactHTML += '<p><strong>Shipping Address:</strong><br>';
    if (user.shippingInfo.name) contactHTML += `${user.shippingInfo.name}<br>`;
    if (user.shippingInfo.address) contactHTML += `${user.shippingInfo.address}<br>`;
    if (user.shippingInfo.city && user.shippingInfo.country) {
      contactHTML += `${user.shippingInfo.city}, ${user.shippingInfo.country}`;
    }
    contactHTML += '</p>';
  }
  document.getElementById('profile-contact').innerHTML = contactHTML;

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
  const existingLogoutBtn = document.getElementById('logout-btn');
  if (existingLogoutBtn) {
    existingLogoutBtn.parentNode.replaceChild(logoutBtn, existingLogoutBtn);
  } else {
    document.querySelector('#profile-modal .modal-content').appendChild(logoutBtn);
  }
  openModal('profile-modal');
}

// API calls
async function sendOtp(method, value) {
  try {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactMethod: method, contactValue: value })
    });
    if (!res.ok) throw new Error(`Server responded with status: ${res.status}`);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactMethod: method, contactValue: value, code })
    });
    if (!res.ok) throw new Error(`Server responded with status: ${res.status}`);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentContactMethod,
        currentContactValue,
        updatedInfo,
        token: authToken
      })
    });
    if (!res.ok) throw new Error(`Server responded with status: ${res.status}`);
    const data = await res.json();
    return data.user;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return null;
  }
}

// Form validation toggle
function updateFormValidation() {
  const emailField = document.getElementById('comment-email');
  if (currentUser) {
    emailField.removeAttribute('required');
  } else {
    emailField.setAttribute('required', '');
  }
}

// Google Sign-In callback
function handleGoogleSignIn(response) {
  const idToken = response.credential;
  authenticateWithGoogle(idToken);
}
window.handleGoogleSignIn = handleGoogleSignIn;

async function authenticateWithGoogle(idToken) {
  try {
    const response = await fetch('/api/google-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
    const data = await response.json();
    authToken = data.token;
    localStorage.setItem('authToken', authToken);
    currentUser = data.user;
    document.getElementById('login-button').textContent = 'My Profile';
    document.getElementById('comment-form').classList.add('user-logged-in');
    updateFormValidation();
    closeModal('login-modal');
    if (data.needsPhone) {
      openModal('phone-collection-modal');
      showToast('Please add your phone number to complete your profile', 'info');
    } else {
      showProfileModal(data.user, data.orders);
      showToast('Google authentication successful', 'success');
    }
  } catch (error) {
    console.error('Google authentication error:', error);
    showToast('Error during Google authentication. Please try again.', 'error');
  }
}

// Twitter conversion tracking
function trackTwitterConversion(orderValue, email) {
  if (typeof twq !== 'function') return;
  twq('event', 'tw-pmtpc-pmtpd', {
    value: orderValue,
    email_address: email
  });
}

/* ── DOMContentLoaded ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize toast notification system
  addToastStyles();

  // Demo button after video
  const videoSection = document.querySelector('.product-video');
  const video = document.querySelector('.product-video video');
  if (videoSection && video) {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'demo-button-container';
    const demoButton = document.createElement('button');
    demoButton.className = 'demo-button';
    demoButton.textContent = 'Watch product demo';
    buttonContainer.appendChild(demoButton);
    videoSection.parentNode.insertBefore(buttonContainer, videoSection.nextSibling);
    demoButton.addEventListener('click', function() {
      video.currentTime = 30;
      video.play().catch(error => console.error('Error playing video:', error));
      videoSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // Order success modal
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

  // Populate prices
  document.getElementById('full-price-display').textContent = formatCurrency(FULL_PRICE);
  document.getElementById('deposit-price-display').textContent = formatCurrency(depositAmount);
  document.getElementById('deposit-description').innerHTML =
    "Get the Early Bird discount! Pay <strong>" +
    formatCurrency(depositAmount) +
    "</strong> today and just <strong>" +
    formatCurrency(349 - depositAmount) +
    "</strong> later when your OneSpark ships in Q4 2025. That's a total of <strong>$349</strong> - a 30% savings off the retail price!";
  document.getElementById('buy-now-original-price').textContent = formatCurrency(FULL_PRICE);
  const buyNowDisp = document.getElementById('buy-now-price-display');
  buyNowDisp.childNodes[buyNowDisp.childNodes.length - 1].nodeValue = ` ${formatCurrency(discountedPrice)}`;

  // Fetch max spots from config
  fetch('/api/get-config')
    .then(response => response.json())
    .then(data => {
      if (data.MAX_SPOTS) {
        MAX_SPOTS = parseInt(data.MAX_SPOTS);
        updateSpotsProgress();
      }
    })
    .catch(error => console.error('Error fetching configuration:', error));

  // Update spots progress bar
  function updateSpotsProgress() {
    const progressFill = document.getElementById('spots-progress-fill');
    const spotsAvailableElement = document.getElementById('spots-available');
    const spotsTotalElement = document.getElementById('spots-total');
    const spotsContainer = document.querySelector('.spots-progress-container');
    if (!progressFill || !spotsAvailableElement || !spotsTotalElement || !spotsContainer) {
      console.error('Required elements for progress bar not found. Check your HTML.');
      return;
    }
    const spotsAvailable = MAX_SPOTS - purchasedSpots;
    const percentFilled = (purchasedSpots / MAX_SPOTS) * 100;
    progressFill.style.width = `${percentFilled}%`;
    spotsAvailableElement.textContent = spotsAvailable;
    spotsTotalElement.textContent = MAX_SPOTS;
    if (spotsAvailable <= MAX_SPOTS * 0.3) {
      spotsContainer.classList.add('spots-limited');
    } else {
      spotsContainer.classList.remove('spots-limited');
    }
    const buyNowButton = document.getElementById('buy-now-button');
    if (spotsAvailable <= 0 && buyNowButton) {
      buyNowButton.disabled = true;
      buyNowButton.textContent = 'Sold Out';
      document.querySelector('.option-card:last-child').classList.add('sold-out');
    }
  }

  // Initialize spots from server
  async function initializeSpots() {
    try {
      const response = await fetch('/api/purchase-count');
      if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
      const data = await response.json();
      if (data.maxSpots) {
        MAX_SPOTS = parseInt(data.maxSpots);
      }
      const storedCount = parseInt(localStorage.getItem('purchasedSpots') || '0');
      purchasedSpots = Math.max(data.count, storedCount);
      localStorage.setItem('purchasedSpots', purchasedSpots.toString());
      updateSpotsProgress();
    } catch (error) {
      console.error('Error fetching data from server:', error);
      updateSpotsProgress();
    }
  }

  // Retry until progress bar elements exist
  function ensureProgressBarInit() {
    const required = [
      document.getElementById('spots-progress-fill'),
      document.getElementById('spots-available'),
      document.getElementById('spots-total'),
      document.querySelector('.spots-progress-container')
    ];
    if (required.every(el => el)) {
      initializeSpots();
    } else {
      setTimeout(ensureProgressBarInit, 500);
    }
  }
  ensureProgressBarInit();

  // Check auth and update validation
  await checkStoredAuth();
  updateFormValidation();

  // Setup close buttons
  document.querySelectorAll('.close-modal').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      closeModal(closeBtn.getAttribute('data-modal'));
    });
  });

  // Close modals on outside click (except shipping)
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (modal.id === 'shipping-modal') return;
      if (e.target === modal) closeModal(modal.id);
    });
  });

  // Profile close
  document.getElementById('profile-close-btn')?.addEventListener('click', () => {
    closeModal('profile-modal');
  });

  // Order success close
  document.body.addEventListener('click', e => {
    if (e.target.id === 'order-success-close-btn') {
      closeModal('order-success-modal');
    }
  });

  // Purchase flow
  document.querySelectorAll('.btn-deposit, .btn-buy').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.id === 'deposit-button') {
        currentPurchase.amount = depositAmount;
      } else if (btn.id === 'buy-now-button') {
        currentPurchase.amount = discountedPrice;
      } else {
        currentPurchase.amount = parseFloat(btn.dataset.amount);
      }
      if (currentUser) {
        currentPurchase.contactMethod = currentUser.contactMethod;
        currentPurchase.contactValue = currentUser.contactValue;
        openModal('shipping-modal');
        populateShippingForm(currentUser);
      } else {
        openModal('purchase-otp-modal');
      }
    });
  });

  // Toggle email/phone in OTP modal
  document.addEventListener('click', function(e) {
    if (e.target.id === 'toggle-contact-method') {
      e.preventDefault();
      const contactInput = document.getElementById('purchase-contact-value');
      const toggleLink = document.getElementById('toggle-contact-method');
      if (!contactInput || !toggleLink) return;
      if (contactInput.type === 'email') {
        contactInput.type = 'tel';
        contactInput.placeholder = 'Enter your phone number';
        toggleLink.textContent = 'Use email address instead';
        currentContactMethod = 'sms';
      } else {
        contactInput.type = 'email';
        contactInput.placeholder = 'Enter your email address';
        toggleLink.textContent = 'Use phone number instead';
        currentContactMethod = 'email';
      }
      contactInput.value = '';
    }

    if (e.target.id === 'purchase-resend-otp') {
      e.preventDefault();
      const contactInput = document.getElementById('purchase-contact-value');
      if (!contactInput) {
        showToast('Error: Contact input not found', 'error');
        return;
      }
      const contactValue = contactInput.value.trim();
      if (!contactValue) {
        showToast('Please enter your contact information first', 'warning');
        return;
      }
      e.target.style.opacity = '0.5';
      e.target.style.pointerEvents = 'none';
      sendOtp(currentContactMethod, contactValue)
        .then(success => {
          showToast(
            success
              ? 'Verification code resent successfully'
              : 'Failed to resend verification code. Please try again.',
            success ? 'success' : 'error'
          );
        })
        .catch(() => {
          showToast('An error occurred. Please try again.', 'error');
        })
        .finally(() => {
          setTimeout(() => {
            e.target.style.opacity = '1';
            e.target.style.pointerEvents = 'auto';
          }, 3000);
        });
    }
  });

  // Send OTP (purchase)
  const purchaseSendOtpBtn = document.getElementById('purchase-send-otp-btn');
  if (purchaseSendOtpBtn) {
    purchaseSendOtpBtn.addEventListener('click', async function() {
      const contactInput = document.getElementById('purchase-contact-value');
      if (!contactInput) {
        showToast('Error: Contact input not found', 'error');
        return;
      }
      const method = contactInput.type === 'email' ? 'email' : 'sms';
      const val = contactInput.value.trim();
      if (!val) {
        showToast('Please enter your contact information.', 'warning');
        return;
      }
      if (method === 'email' && !val.includes('@')) {
        showToast('Please enter a valid email address.', 'warning');
        return;
      }
      this.disabled = true;
      this.textContent = 'Sending...';
      currentContactMethod = method;
      currentPurchase.contactMethod = method;
      currentPurchase.contactValue = val;
      try {
        const success = await sendOtp(method, val);
        if (success) {
          document.getElementById('initial-contact-section').style.display = 'none';
          document.getElementById('purchase-otp-section').style.display = 'block';
          const messageEl = document.querySelector('.otp-sent-message');
          if (messageEl) {
            messageEl.textContent =
              method === 'email'
                ? 'Verification code sent to your email'
                : 'Verification code sent to your phone';
          }
          showToast('Verification code sent successfully', 'success');
        } else {
          showToast('Failed to send verification code. Please try again.', 'error');
          this.textContent = 'Send Verification Code';
          this.disabled = false;
        }
      } catch {
        showToast('An error occurred. Please try again.', 'error');
        this.textContent = 'Send Verification Code';
        this.disabled = false;
      }
    });
  }

  // Verify OTP (purchase)
  const purchaseVerifyOtpBtn = document.getElementById('purchase-verify-otp-btn');
  if (purchaseVerifyOtpBtn) {
    purchaseVerifyOtpBtn.addEventListener('click', async function() {
      const contactInput = document.getElementById('purchase-contact-value');
      const otpCodeInput = document.getElementById('purchase-otp-code');
      if (!contactInput || !otpCodeInput) {
        showToast('Error: Required inputs not found', 'error');
        return;
      }
      const contactValue = contactInput.value.trim();
      const code = otpCodeInput.value.trim();
      if (!code) {
        showToast('Please enter the verification code', 'warning');
        return;
      }
      this.disabled = true;
      this.textContent = 'Verifying...';
      try {
        if (await verifyOtp(currentContactMethod, contactValue, code)) {
          currentPurchase.contactMethod = currentContactMethod;
          currentPurchase.contactValue = contactValue;
          currentUser = {
            contactMethod: currentContactMethod,
            contactValue: contactValue
          };
          document.getElementById('login-button').textContent = 'My Profile';
          document.getElementById('comment-form').classList.add('user-logged-in');
          updateFormValidation();
          try {
            const tokenRes = await fetch('/api/auth-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'create',
                contactMethod: currentContactMethod,
                contactValue: contactValue
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
          if (currentContactMethod === 'email') {
            const emailField = document.querySelector('input[name="ship-email"]');
            if (emailField) emailField.value = contactValue;
          } else {
            const phoneField = document.querySelector('input[name="ship-phone"]');
            if (phoneField) phoneField.value = contactValue;
          }
        } else {
          showToast('Incorrect verification code. Please try again.', 'error');
          this.disabled = false;
          this.textContent = 'Verify';
        }
      } catch (error) {
        console.error('Error verifying OTP:', error);
        showToast('An error occurred. Please try again.', 'error');
        this.disabled = false;
        this.textContent = 'Verify';
      }
    });
  }

  // Shipping form → Stripe (duplicate handler to ensure fallback)
  document.getElementById('shipping-form')?.addEventListener('submit', async e => {
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
    if (currentUser) {
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
          const updatedUser = await updateUserProfile(
            currentUser.contactMethod,
            currentUser.contactValue,
            updatedContactInfo
          );
          if (updatedUser) {
            currentUser = { ...currentUser, ...updatedUser };
          }
        }
      } catch (error) {
        console.error('Error updating user profile:', error);
      }
    }
    try {
      localStorage.setItem(
        'pendingOrder',
        JSON.stringify({
          amount: currentPurchase.amount,
          contactMethod: currentPurchase.contactMethod,
          contactValue: currentPurchase.contactValue,
          shipping: shipping,
          id: `order_${Date.now()}`,
          timestamp: new Date().toISOString()
        })
      );
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const { sessionUrl } = await res.json();
      window.location = sessionUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      showToast('An error occurred during checkout. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Continue to Payment';
    }
  });

  // Login flow
  document.getElementById('login-button')?.addEventListener('click', () => {
    if (currentUser) {
      fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactMethod: currentUser.contactMethod,
          contactValue: currentUser.contactValue
        })
      })
        .then(res => res.json())
        .then(data => {
          currentUser = { ...currentUser, ...data.user };
          showProfileModal(currentUser, data.orders);
        })
        .catch(err => {
          console.error('Error fetching profile:', err);
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

  document.getElementById('login-send-otp-btn')?.addEventListener('click', async () => {
    const method = document.querySelector('input[name="login-contact-method"]:checked')?.value || 'email';
    const val = document.getElementById('login-contact-value')?.value.trim();
    if (!val) {
      showToast('Please enter your contact information.', 'warning');
      return;
    }
    if (method === 'email' && !val.includes('@')) {
      showToast('Please enter a valid email address.', 'warning');
      return;
    }
    const btn = document.getElementById('login-send-otp-btn');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    if (await sendOtp(method, val)) {
      document.getElementById('login-otp-section').style.display = 'block';
      btn.textContent = 'Resend OTP';
      btn.disabled = false;
      showToast('Verification code sent successfully', 'success');
    } else {
      showToast('Failed to send verification code. Please try again.', 'error');
      btn.textContent = 'Send OTP';
      btn.disabled = false;
    }
  });

  document.getElementById('login-verify-otp-btn')?.addEventListener('click', async () => {
    const method = document.querySelector('input[name="login-contact-method"]:checked')?.value || 'email';
    const val = document.getElementById('login-contact-value')?.value.trim();
    const code = document.getElementById('login-otp-code')?.value.trim();
    if (!val || !code) {
      showToast('Please enter all required information.', 'warning');
      return;
    }
    const verifyBtn = document.getElementById('login-verify-otp-btn');
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    try {
      if (await verifyOtp(method, val, code)) {
        closeModal('login-modal');
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactMethod: method, contactValue: val })
        });
        if (!res.ok) throw new Error(`Server responded with status: ${res.status}`);
        const data = await res.json();
        authToken = data.token;
        localStorage.setItem('authToken', authToken);
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
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify & Load Profile';
    }
  });

  // Comments with OTP
  document.getElementById('comment-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const text = document.getElementById('comment-text')?.value.trim();
    if (!text) {
      showToast('Please enter a comment.', 'warning');
      return;
    }
    if (currentUser) {
      try {
        const res = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactMethod: currentUser.contactMethod,
            contactValue: currentUser.contactValue,
            text
          })
        });
        if (!res.ok) throw new Error(`Server responded with status: ${res.status}`);
        const newComment = await res.json();
        displayComment(newComment);
        document.getElementById('comment-text').value = '';
        showToast('Comment added successfully!', 'success');
      } catch (error) {
        console.error('Error adding comment:', error);
        showToast('Failed to add comment. Please try again.', 'error');
      }
    } else {
      const emailField = document.getElementById('comment-email');
      const email = emailField?.value.trim();
      if (!email) {
        showToast('Please enter your email.', 'warning');
        return;
      }
      if (!email.includes('@')) {
        showToast('Please enter a valid email address.', 'warning');
        return;
      }
      pendingComment = { contactMethod: 'email', contactValue: email, text };
      try {
        const otpSent = await sendOtp('email', email);
        if (otpSent) {
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

  document.getElementById('comment-verify-otp-btn')?.addEventListener('click', async () => {
    const code = document.getElementById('comment-otp-code')?.value.trim();
    if (!code) {
      showToast('Please enter the verification code.', 'warning');
      return;
    }
    const verifyBtn = document.getElementById('comment-verify-otp-btn');
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    try {
      if (await verifyOtp('email', pendingComment.contactValue, code)) {
        const res = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingComment)
        });
        if (!res.ok) throw new Error(`Server responded with status: ${res.status}`);
        const newComment = await res.json();
        displayComment(newComment);
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
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify OTP';
    }
  });

  // Load existing comments
  loadComments();

  // Campaign nav smooth scroll
  const navLinks = document.querySelectorAll('.campaign-nav a');
  const navBar = document.querySelector('.campaign-nav');
  const scrollOffset = (navBar ? navBar.offsetHeight : 0) + 20;
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navLinks.forEach(el => el.classList.remove('active'));
      e.target.classList.add('active');
      const target = document.querySelector(e.target.getAttribute('href'));
      if (target) {
        const pos = target.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({ top: pos - scrollOffset, behavior: 'smooth' });
      }
    });
  });

  // Dynamic border effect
  document.querySelectorAll('.campaign-content, .pricing-section, .option-card').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
      el.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
    });
    el.addEventListener('mouseleave', () => {
      el.style.setProperty('--mouse-x', '-100px');
      el.style.setProperty('--mouse-y', '-100px');
    });
  });

  // Card click accessibility
  document.querySelectorAll('.option-card').forEach(card => {
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.querySelector('.btn')?.click();
      }
    });
    card.addEventListener('click', e => {
      if (!e.target.closest('button')) {
        card.querySelector('.btn')?.click();
      }
    });
  });

  // Escape key to close modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
        closeModal(modal.id);
      });
    }
  });

  // Phone collection after Google login
  document.getElementById('phone-send-otp-btn')?.addEventListener('click', async () => {
    const phoneNumber = document.getElementById('google-user-phone')?.value.trim();
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

  document.getElementById('phone-verify-otp-btn')?.addEventListener('click', async () => {
    const phoneNumber = document.getElementById('google-user-phone')?.value.trim();
    const code = document.getElementById('phone-otp-code')?.value.trim();
    if (!phoneNumber || !code) {
      showToast('Please enter all required information.', 'warning');
      return;
    }
    const verifyBtn = document.getElementById('phone-verify-otp-btn');
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    try {
      if (await verifyOtp('sms', phoneNumber, code)) {
        const updatedUser = await updateUserProfile(
          currentUser.contactMethod,
          currentUser.contactValue,
          { phone: phoneNumber }
        );
        if (updatedUser) {
          currentUser = { ...currentUser, phone: phoneNumber };
          closeModal('phone-collection-modal');
          const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify OTP';
    }
  });

  // Handle checkout success/canceled
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('success') === 'true') {
    const pendingOrder = JSON.parse(localStorage.getItem('pendingOrder') || '{}');
    if (pendingOrder.amount) {
      const orderInfoHtml = `
        <div class="order-success-info" style="margin-top: 20px; background: #f9f9f9; padding: 15px; border-radius: 5px;">
          <p><strong>Order ID:</strong> <span id="success-order-id">${
            pendingOrder.id || 'order_' + Date.now()
          }</span></p>
          <p><strong>Amount Paid:</strong> $${pendingOrder.amount.toFixed(2)}</p>
          <p><strong>Contact:</strong> ${pendingOrder.contactValue}</p>
          <p><strong>Shipping Address:</strong> ${pendingOrder.shipping.address}, ${
        pendingOrder.shipping.city
      }, ${pendingOrder.shipping.country}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `;
      document.getElementById('order-info-display').innerHTML = orderInfoHtml;
      if (pendingOrder.amount === discountedPrice) {
        purchasedSpots++;
        localStorage.setItem('purchasedSpots', purchasedSpots.toString());
        updateSpotsProgress();
      }
    }
    if (pendingOrder.contactValue) {
      trackTwitterConversion(pendingOrder.amount, pendingOrder.contactValue);
    }
    localStorage.removeItem('pendingOrder');
    openModal('order-success-modal');
    if (!document.getElementById('order-success-close-btn').onclick) {
      document.getElementById('order-success-close-btn').addEventListener('click', () => {
        closeModal('order-success-modal');
      });
    }
  } else if (urlParams.get('canceled') === 'true') {
    showToast('Your order was canceled. If you need assistance, please contact us.', 'warning');
  }

  // Flash Sale Countdown
  const endDate = new Date('2025-05-07T00:00:00Z');

  function hasSaleEnded() {
    return new Date() >= endDate;
  }

  if (hasSaleEnded()) {
    document.querySelectorAll('.countdown-value, .card-countdown-value').forEach(el => {
      el.textContent = '00';
    });
    const button = document.querySelector('.super-deal .btn');
    if (button) {
      button.textContent = 'Offer Expired';
      button.disabled = true;
      button.style.opacity = '0.7';
      button.style.cursor = 'not-allowed';
    }
  } else {
    function updateCountdown() {
      const now = new Date();
      const diff = endDate - now;
      if (diff <= 0) {
        document.querySelectorAll('.countdown-value, .card-countdown-value').forEach(el => {
          el.textContent = '00';
        });
        const button = document.querySelector('.super-deal .btn');
        if (button) {
          button.textContent = 'Offer Expired';
          button.disabled = true;
          button.style.opacity = '0.7';
          button.style.cursor = 'not-allowed';
        }
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const fd = days.toString().padStart(2, '0');
      const fh = hours.toString().padStart(2, '0');
      const fm = minutes.toString().padStart(2, '0');
      const fs = seconds.toString().padStart(2, '0');
      ['top-days','card-days'].forEach(id => document.getElementById(id)?.textContent = fd);
      ['top-hours','card-hours'].forEach(id => document.getElementById(id)?.textContent = fh);
      ['top-minutes','card-minutes'].forEach(id => document.getElementById(id)?.textContent = fm);
      ['top-seconds','card-seconds'].forEach(id => document.getElementById(id)?.textContent = fs);
    }
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  // Flash Deal Button
  const flashDealButton = document.getElementById('flash-deal-button');
  if (flashDealButton) {
    flashDealButton.addEventListener('click', () => {
      currentPurchase.amount = 99;
      if (currentUser) {
        currentPurchase.contactMethod = currentUser.contactMethod;
        currentPurchase.contactValue = currentUser.contactValue;
        openModal('shipping-modal');
        populateShippingForm(currentUser);
      } else {
        openModal('purchase-otp-modal');
      }
    });
  }

  // Email capture form enhancement
  const mcForm = document.getElementById('mc-embedded-subscribe-form');
  if (mcForm) {
    mcForm.addEventListener('submit', function(event) {
      event.preventDefault();
      const emailInput = document.getElementById('mce-EMAIL');
      const emailValue = emailInput?.value.trim();
      if (!emailValue || !validateEmail(emailValue)) {
        const errorResponse = document.getElementById('mce-error-response');
        if (errorResponse) {
          errorResponse.textContent = 'Please enter a valid email address.';
          errorResponse.style.display = 'block';
          setTimeout(() => (errorResponse.style.display = 'none'), 3000);
        }
        emailInput.focus();
      } else {
        const formData = new FormData(mcForm);
        let url = mcForm.getAttribute('action')?.replace('/post?', '/post-json?') || '';
        if (!url.includes('c=')) url += '&c=?';
        const submitButton = document.getElementById('mc-embedded-subscribe');
        const originalButtonText = submitButton.textContent || 'Subscribe';
        submitButton.textContent = 'Subscribing...';
        submitButton.disabled = true;
        const script = document.createElement('script');
        script.src = url + '&' + new URLSearchParams(formData).toString();
        window.mailchimpCallback = function(response) {
          submitButton.textContent = originalButtonText;
          submitButton.disabled = false;
          if (response.result === 'success') {
            showToast('Thank you for subscribing to our updates!', 'success', 5000);
            const successResponse = document.getElementById('mce-success-response');
            if (successResponse) {
              successResponse.textContent = 'Thank you for subscribing!';
              successResponse.style.display = 'block';
              setTimeout(() => (successResponse.style.display = 'none'), 5000);
            }
            emailInput.value = '';
          } else {
            const errorResponse = document.getElementById('mce-error-response');
            if (errorResponse) {
              const errorMessage = response.msg || 'An error occurred. Please try again.';
              errorResponse.innerHTML = errorMessage;
              errorResponse.style.display = 'block';
              setTimeout(() => (errorResponse.style.display = 'none'), 5000);
            }
            showToast('Subscription error: ' + response.msg, 'error', 5000);
          }
          if (script.parentNode) script.parentNode.removeChild(script);
        };
        script.src = script.src.replace('c=?', 'c=mailchimpCallback');
        document.body.appendChild(script);
        if (typeof gtag === 'function') {
          gtag('event', 'newsletter_signup', {
            event_category: 'Engagement',
            event_label: 'Email Updates Form'
          });
        }
      }
    });
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

  // Email validation helper
  function validateEmail(email) {
    const re = /^(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }
});
