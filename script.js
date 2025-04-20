/* ── Stripe object ────────────────────────────────────────────────────── */
const stripe = Stripe('pk_test_51RFlwmHJyDwFvydeuzhvAb1TkNCXqAf2iTy4uoRznLdV1VtprF4dehr0doKDKdxj8e7yftldkamwlvemhx5Zq6sh00ReTJfPfN');

/* ── Pricing constants ────────────────────────────────────────────────── */
const FULL_PRICE = 390;
const DISCOUNT_PCT = 0.30;
const DEPOSIT_PCT  = 0.30;
const depositAmount   = FULL_PRICE * DEPOSIT_PCT;
const discountedPrice = FULL_PRICE * (1 - DISCOUNT_PCT);

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
    const sendBtn = document.getElementById('purchase-send-otp-btn');
    if (sendBtn) sendBtn.disabled = false;
  } else if (modalId === 'login-modal') {
    document.getElementById('login-otp-section').style.display = 'none';
    const sendBtn = document.getElementById('login-send-otp-btn');
    if (sendBtn) sendBtn.disabled = false;
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
  });
  
  // Replace existing logout button if it exists, otherwise append
  const existingLogoutBtn = document.getElementById('logout-btn');
  if (existingLogoutBtn) {
    existingLogoutBtn.parentNode.replaceChild(logoutBtn, existingLogoutBtn);
  } else {
    document.querySelector('#profile-modal .modal-content').appendChild(logoutBtn);
  }
  
  // Update profile modal with new design
  updateProfileModal();
  
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
  if (emailField) {
    if (currentUser) {
      // If logged in, remove required attribute
      emailField.removeAttribute('required');
    } else {
      // If not logged in, add required attribute
      emailField.setAttribute('required', '');
    }
  }
}

// Function to update OTP modals with better error handling
function updateOTPModals() {
  try {
    // Purchase OTP Modal
    const purchaseOTPModal = document.getElementById('purchase-otp-modal');
    if (purchaseOTPModal) {
      // Check if elements exist before manipulating
      const radioLabels = purchaseOTPModal.querySelectorAll('input[name="purchase-contact-method"]');
      if (radioLabels.length === 0) {
        console.log('Radio buttons not found in purchase OTP modal, skipping update');
        return;
      }
      
      const radioContainer = radioLabels[0].closest('label').parentNode;
      const emailRadio = purchaseOTPModal.querySelector('input[value="email"]');
      
      // Set default contact method to email
      if (emailRadio) emailRadio.checked = true;
      
      // Create the container for the new layout
      const newContainer = document.createElement('div');
      newContainer.innerHTML = `
        <div>
          <input id="purchase-contact-value" type="email" placeholder="Enter email address" required>
          <button id="purchase-send-otp-btn">Send Verification Code</button>
          <a class="contact-toggle" id="purchase-toggle-contact">Use phone number instead</a>
        </div>
        <div id="purchase-otp-section" style="display:none">
          <input id="purchase-otp-code" placeholder="Enter verification code" required>
          <div class="otp-actions">
            <button id="purchase-verify-otp-btn">Verify</button>
            <button id="purchase-resend-otp-btn" class="otp-resend">Resend Code</button>
          </div>
        </div>
      `;
      
      // Replace content
      radioContainer.parentNode.replaceChild(newContainer, radioContainer);
      
      // Update event handlers
      const toggleContact = document.getElementById('purchase-toggle-contact');
      const contactInput = document.getElementById('purchase-contact-value');
      
      if (toggleContact && contactInput) {
        toggleContact.addEventListener('click', () => {
          const isEmail = contactInput.type === 'email';
          
          if (isEmail) {
            // Switch to phone
            contactInput.type = 'tel';
            contactInput.placeholder = 'Enter phone number';
            contactInput.pattern = '[0-9+\\-\\s()]{6,20}';
            toggleContact.textContent = 'Use email instead';
            const smsRadio = purchaseOTPModal.querySelector('input[value="sms"]');
            if (smsRadio) smsRadio.checked = true;
          } else {
            // Switch to email
            contactInput.type = 'email';
            contactInput.placeholder = 'Enter email address';
            contactInput.pattern = '';
            toggleContact.textContent = 'Use phone number instead';
            if (emailRadio) emailRadio.checked = true;
          }
        });
      }
      
      // Update resend button functionality
      const resendBtn = document.getElementById('purchase-resend-otp-btn');
      if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
          const method = purchaseOTPModal.querySelector('input[name="purchase-contact-method"]:checked')?.value || 'email';
          const val = document.getElementById('purchase-contact-value')?.value.trim() || '';
          
          if (!val) {
            alert('Please enter your contact information.');
            return;
          }
          
          if (method === 'email' && !val.includes('@')) {
            alert('Please enter a valid email address.');
            return;
          }
          
          resendBtn.disabled = true;
          resendBtn.textContent = 'Sending...';
          
          if (await sendOtp(method, val)) {
            resendBtn.textContent = 'Resend Code';
            resendBtn.disabled = false;
          } else {
            alert('Failed to send verification code. Please try again.');
            resendBtn.textContent = 'Resend Code';
            resendBtn.disabled = false;
          }
        });
      }
      
      // Update original send OTP button event listener to work with new layout
      const sendBtn = document.getElementById('purchase-send-otp-btn');
      if (sendBtn) {
        // Remove existing event listeners using cloning technique
        const newSendBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
        
        newSendBtn.addEventListener('click', async () => {
          const method = purchaseOTPModal.querySelector('input[name="purchase-contact-method"]:checked')?.value || 'email';
          const val = document.getElementById('purchase-contact-value')?.value.trim() || '';
          
          if (!val) {
            alert('Please enter your contact information.');
            return;
          }
          
          if (method === 'email' && !val.includes('@')) {
            alert('Please enter a valid email address.');
            return;
          }
          
          newSendBtn.disabled = true;
          newSendBtn.textContent = 'Sending...';
          
          if (await sendOtp(method, val)) {
            document.getElementById('purchase-otp-section').style.display = 'block';
            newSendBtn.textContent = 'Send Verification Code';
            newSendBtn.disabled = false;
          } else {
            alert('Failed to send OTP. Please try again.');
            newSendBtn.textContent = 'Send Verification Code';
            newSendBtn.disabled = false;
          }
        });
      }
      
      // Update verify OTP button event listener to work with new layout
      const verifyBtn = document.getElementById('purchase-verify-otp-btn');
      if (verifyBtn) {
        // Remove existing event listeners using cloning technique
        const newVerifyBtn = verifyBtn.cloneNode(true);
        verifyBtn.parentNode.replaceChild(newVerifyBtn, verifyBtn);
        
        newVerifyBtn.addEventListener('click', async () => {
          const method = purchaseOTPModal.querySelector('input[name="purchase-contact-method"]:checked')?.value || 'email';
          const val = document.getElementById('purchase-contact-value')?.value.trim() || '';
          const code = document.getElementById('purchase-otp-code')?.value.trim() || '';
          
          if (!code) {
            alert('Please enter the OTP code.');
            return;
          }
          
          newVerifyBtn.disabled = true;
          newVerifyBtn.textContent = 'Verifying...';
          
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
            
            // Pre-populate shipping form with verified contact info
            if (method === 'email') {
              document.querySelector('input[name="ship-email"]').value = val;
            } else if (method === 'sms') {
              document.querySelector('input[name="ship-phone"]').value = val;
            }
          } else {
            alert('Incorrect OTP. Please try again.');
            newVerifyBtn.disabled = false;
            newVerifyBtn.textContent = 'Verify';
          }
        });
      }
    }
    
    // Login OTP Modal - Same pattern with improved error handling
    const loginOTPModal = document.getElementById('login-modal');
    if (loginOTPModal) {
      const radioLabels = loginOTPModal.querySelectorAll('input[name="login-contact-method"]');
      if (radioLabels.length === 0) {
        console.log('Radio buttons not found in login OTP modal, skipping update');
        return;
      }
      
      const radioContainer = radioLabels[0].closest('label').parentNode;
      const emailRadio = loginOTPModal.querySelector('input[value="email"]');
      
      // Set default contact method to email
      if (emailRadio) emailRadio.checked = true;
      
      // Create the container for the new layout
      const newContainer = document.createElement('div');
      newContainer.innerHTML = `
        <div>
          <input id="login-contact-value" type="email" placeholder="Enter email address" required>
          <button id="login-send-otp-btn">Send Verification Code</button>
          <a class="contact-toggle" id="login-toggle-contact">Use phone number instead</a>
        </div>
        <div id="login-otp-section" style="display:none">
          <input id="login-otp-code" placeholder="Enter verification code" required>
          <div class="otp-actions">
            <button id="login-verify-otp-btn">Verify</button>
            <button id="login-resend-otp-btn" class="otp-resend">Resend Code</button>
          </div>
        </div>
      `;
      
      // Replace content
      radioContainer.parentNode.replaceChild(newContainer, radioContainer);
      
      // Update event handlers
      const toggleContact = document.getElementById('login-toggle-contact');
      const contactInput = document.getElementById('login-contact-value');
      
      if (toggleContact && contactInput) {
        toggleContact.addEventListener('click', () => {
          const isEmail = contactInput.type === 'email';
          
          if (isEmail) {
            // Switch to phone
            contactInput.type = 'tel';
            contactInput.placeholder = 'Enter phone number';
            contactInput.pattern = '[0-9+\\-\\s()]{6,20}';
            toggleContact.textContent = 'Use email instead';
            const smsRadio = loginOTPModal.querySelector('input[name="login-contact-method"][value="sms"]');
            if (smsRadio) smsRadio.checked = true;
          } else {
            // Switch to email
            contactInput.type = 'email';
            contactInput.placeholder = 'Enter email address';
            contactInput.pattern = '';
            toggleContact.textContent = 'Use phone number instead';
            if (emailRadio) emailRadio.checked = true;
          }
        });
      }
      
      // Update resend button functionality
      const resendBtn = document.getElementById('login-resend-otp-btn');
      if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
          const method = loginOTPModal.querySelector('input[name="login-contact-method"]:checked')?.value || 'email';
          const val = document.getElementById('login-contact-value')?.value.trim() || '';
          
          if (!val) {
            alert('Please enter your contact information.');
            return;
          }
          
          if (method === 'email' && !val.includes('@')) {
            alert('Please enter a valid email address.');
            return;
          }
          
          resendBtn.disabled = true;
          resendBtn.textContent = 'Sending...';
          
          if (await sendOtp(method, val)) {
            resendBtn.textContent = 'Resend Code';
            resendBtn.disabled = false;
          } else {
            alert('Failed to send verification code. Please try again.');
            resendBtn.textContent = 'Resend Code';
            resendBtn.disabled = false;
          }
        });
      }
      
      // Update original send OTP button event listener
      const sendBtn = document.getElementById('login-send-otp-btn');
      if (sendBtn) {
        // Remove existing event listeners using cloning technique
        const newSendBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
        
        newSendBtn.addEventListener('click', async () => {
          const method = loginOTPModal.querySelector('input[name="login-contact-method"]:checked')?.value || 'email';
          const val = document.getElementById('login-contact-value')?.value.trim() || '';
          
          if (!val) {
            alert('Please enter your contact information.');
            return;
          }
          
          if (method === 'email' && !val.includes('@')) {
            alert('Please enter a valid email address.');
            return;
          }
          
          newSendBtn.disabled = true;
          newSendBtn.textContent = 'Sending...';
          
          if (await sendOtp(method, val)) {
            document.getElementById('login-otp-section').style.display = 'block';
            newSendBtn.textContent = 'Send Verification Code';
            newSendBtn.disabled = false;
          } else {
            alert('Failed to send OTP. Please try again.');
            newSendBtn.textContent = 'Send Verification Code';
            newSendBtn.disabled = false;
          }
        });
      }
      
      // Update verify OTP button event listener
      const verifyBtn = document.getElementById('login-verify-otp-btn');
      if (verifyBtn) {
        // Remove existing event listeners using cloning technique
        const newVerifyBtn = verifyBtn.cloneNode(true);
        verifyBtn.parentNode.replaceChild(newVerifyBtn, verifyBtn);
        
        newVerifyBtn.addEventListener('click', async () => {
          const method = loginOTPModal.querySelector('input[name="login-contact-method"]:checked')?.value || 'email';
          const val = document.getElementById('login-contact-value')?.value.trim() || '';
          const code = document.getElementById('login-otp-code')?.value.trim() || '';
          
          if (!code) {
            alert('Please enter the OTP code.');
            return;
          }
          
          newVerifyBtn.disabled = true;
          newVerifyBtn.textContent = 'Verifying...';
          
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
    
              showProfileModal(data.user, data.orders);
            } else {
              alert('Incorrect OTP. Please try again.');
            }
          } catch (error) {
            console.error('Login error:', error);
            alert('An error occurred during login. Please try again.');
          } finally {
            newVerifyBtn.disabled = false;
            newVerifyBtn.textContent = 'Verify';
          }
        });
      }
    }
    
    // Comment OTP Modal
    const commentOTPModal = document.getElementById('comment-otp-modal');
    if (commentOTPModal) {
      const otpInput = commentOTPModal.querySelector('#comment-otp-code');
      const verifyBtn = commentOTPModal.querySelector('#comment-verify-otp-btn');
      
      if (otpInput && verifyBtn && !commentOTPModal.querySelector('.otp-actions')) {
        // Add resend button
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'otp-actions';
        
        // Move verify button to actions div
        otpInput.parentNode.insertBefore(actionsDiv, verifyBtn);
        actionsDiv.appendChild(verifyBtn);
        
        // Create resend button only if it doesn't already exist
        if (!document.getElementById('comment-resend-otp-btn')) {
          const resendBtn = document.createElement('button');
          resendBtn.id = 'comment-resend-otp-btn';
          resendBtn.className = 'otp-resend';
          resendBtn.textContent = 'Resend Code';
          actionsDiv.appendChild(resendBtn);
          
          // Add event listener for resend
          resendBtn.addEventListener('click', async () => {
            if (!pendingComment || !pendingComment.contactValue) {
              alert('Something went wrong. Please try again.');
              return;
            }
            
            resendBtn.disabled = true;
            resendBtn.textContent = 'Sending...';
            
            try {
              const otpSent = await sendOtp('email', pendingComment.contactValue);
              if (otpSent) {
                resendBtn.textContent = 'Resend Code';
                resendBtn.disabled = false;
              } else {
                alert('Failed to send verification code. Please try again.');
                resendBtn.textContent = 'Resend Code';
                resendBtn.disabled = false;
              }
            } catch (error) {
              console.error('Error sending OTP:', error);
              alert('Failed to send verification code. Please try again.');
              resendBtn.textContent = 'Resend Code';
              resendBtn.disabled = false;
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error updating OTP modals:', error);
  }
}

// Function to update profile modal with better error handling
function updateProfileModal() {
  try {
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) {
      const closeBtn = document.getElementById('profile-close-btn');
      const logoutBtn = document.getElementById('logout-btn');
      
      // Only proceed if both buttons exist
      if (closeBtn && logoutBtn && !profileModal.querySelector('.profile-actions')) {
        // Create actions container
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'profile-actions';
        
        // Move buttons to container
        closeBtn.parentNode.insertBefore(actionsDiv, closeBtn);
        actionsDiv.appendChild(closeBtn);
        actionsDiv.appendChild(logoutBtn);
        
        // Update button text
        closeBtn.textContent = 'Close';
      }
    }
  } catch (error) {
    console.error('Error updating profile modal:', error);
  }
}

/* ── DOMContentLoaded ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
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
    "Secure your Awesome Product now! Pay <strong>" + formatCurrency(depositAmount) + "</strong> today (30%) and the remaining <strong>" + formatCurrency(FULL_PRICE-depositAmount) + "</strong> upon shipment.";
  document.getElementById('buy-now-original-price').textContent = formatCurrency(FULL_PRICE);
  const buyNowDisp = document.getElementById('buy-now-price-display');
  buyNowDisp.childNodes[buyNowDisp.childNodes.length-1].nodeValue = ` ${formatCurrency(discountedPrice)}`;

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
      alert('An error occurred during checkout. Please try again.');
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
      });
    } else {
      openModal('login-modal');
    }
  });
  
  /* ----- Comments with OTP ----- */
  document.getElementById('comment-form').addEventListener('submit', async e => {
    e.preventDefault();
    
    // Get comment text first
    const text = document.getElementById('comment-text').value.trim();
    
    if (!text) {
      alert('Please enter a comment.');
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
        
        alert('Comment added successfully!');
      } catch (error) {
        console.error('Error adding comment:', error);
        alert('Failed to add comment. Please try again.');
      }
    } else {
      // For non-logged in users, use email and OTP verification
      const emailField = document.getElementById('comment-email');
      const email = emailField.value.trim();
      
      if (!email) {
        alert('Please enter your email.');
        return;
      }
      
      // Simple email validation
      if (!email.includes('@')) {
        alert('Please enter a valid email address.');
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
        } else {
          alert('Failed to send verification code. Please try again.');
        }
      } catch (error) {
        console.error('Error sending OTP:', error);
        alert('Failed to send verification code. Please try again.');
      }
    }
  });

  // Handle comment verification
  document.getElementById('comment-verify-otp-btn').addEventListener('click', async () => {
    const code = document.getElementById('comment-otp-code').value.trim();
    
    if (!code) {
      alert('Please enter the verification code.');
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
        alert('Comment added successfully!');
      } else {
        alert('Incorrect verification code. Please try again.');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error saving comment. Please try again.');
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
    alert('Your order was canceled. If you need assistance, please contact us.');
  }
  
  // Call the modal update functions after a short delay to ensure DOM is ready
  setTimeout(() => {
    try {
      updateOTPModals();
      updateProfileModal();
    } catch (error) {
      console.error('Error updating modals:', error);
    }
  }, 100);
});