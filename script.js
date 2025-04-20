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
    document.getElementById('purchase-send-otp-btn').disabled = false;
  } else if (modalId === 'login-modal') {
    document.getElementById('login-otp-section').style.display = 'none';
    document.getElementById('login-send-otp-btn').disabled = false;
  }
}

// Show profile modal with user data
async function showProfileModal(user, orders) {
  document.getElementById('profile-contact').textContent =
    `Signed in as ${user.contactMethod}: ${user.contactValue}`;
  
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
    closeModal('profile-modal');
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
      body: JSON.stringify({contactMethod: method, contactValue: value, code})
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

/* ── DOMContentLoaded ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
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
      alert('Please enter your contact information.');
      return;
    }
    
    // Simple validation
    if (method === 'email' && !val.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    
    document.getElementById('purchase-send-otp-btn').disabled = true;
    document.getElementById('purchase-send-otp-btn').textContent = 'Sending...';
    
    if (await sendOtp(method, val)) {
      document.getElementById('purchase-otp-section').style.display = 'block';
      document.getElementById('purchase-send-otp-btn').textContent = 'Resend OTP';
      document.getElementById('purchase-send-otp-btn').disabled = false;
    } else {
      alert('Failed to send OTP. Please try again.');
      document.getElementById('purchase-send-otp-btn').textContent = 'Send OTP';
      document.getElementById('purchase-send-otp-btn').disabled = false;
    }
  });

  /* verify OTP (purchase) */
  document.getElementById('purchase-verify-otp-btn').addEventListener('click', async () => {
    const method = document.querySelector('input[name="purchase-contact-method"]:checked').value;
    const val = document.getElementById('purchase-contact-value').value.trim();
    const code = document.getElementById('purchase-otp-code').value.trim();
    
    if (!code) {
      alert('Please enter the OTP code.');
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
    } else {
      alert('Incorrect OTP. Please try again.');
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
      phone: f['ship-phone'].value
    };
    
    try {
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
        showProfileModal(data.user, data.orders);
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
    const val = document.getElementById('login-contact-value').value.trim();
    
    if (!val) {
      alert('Please enter your contact information.');
      return;
    }
    
    // Simple validation
    if (method === 'email' && !val.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    
    document.getElementById('login-send-otp-btn').disabled = true;
    document.getElementById('login-send-otp-btn').textContent = 'Sending...';
    
    if (await sendOtp(method, val)) {
      document.getElementById('login-otp-section').style.display = 'block';
      document.getElementById('login-send-otp-btn').textContent = 'Resend OTP';
      document.getElementById('login-send-otp-btn').disabled = false;
      if (await sendOtp(method, val)) {
        document.getElementById('login-otp-section').style.display = 'block';
        document.getElementById('login-send-otp-btn').textContent = 'Resend OTP';
        document.getElementById('login-send-otp-btn').disabled = false;
      } else {
        alert('Failed to send OTP. Please try again.');
        document.getElementById('login-send-otp-btn').textContent = 'Send OTP';
        document.getElementById('login-send-otp-btn').disabled = false;
      }
    });
    
    document.getElementById('login-verify-otp-btn').addEventListener('click', async () => {
      const method = document.querySelector('input[name="login-contact-method"]:checked').value;
      const val = document.getElementById('login-contact-value').value.trim();
      const code = document.getElementById('login-otp-code').value.trim();
      
      if (!code) {
        alert('Please enter the OTP code.');
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
          
          showProfileModal(data.user, data.orders);
        } else {
          alert('Incorrect OTP. Please try again.');
        }
      } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login. Please try again.');
      } finally {
        document.getElementById('login-verify-otp-btn').disabled = false;
        document.getElementById('login-verify-otp-btn').textContent = 'Verify & Load Profile';
      }
    });
  
    /* ----- Comments with OTP ----- */
    document.getElementById('comment-form').addEventListener('submit', async e => {
      e.preventDefault();
      
      // If user is already logged in, use their info
      if (currentUser) {
        const text = document.getElementById('comment-text').value.trim();
        
        if (!text) {
          alert('Please enter a comment.');
          return;
        }
        
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
        const email = document.getElementById('comment-email').value.trim();
        const text = document.getElementById('comment-text').value.trim();
        
        if (!email || !text) {
          alert('Please enter both email and comment.');
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
        if (await sendOtp('email', email)) {
          // Open comment OTP modal instead of using prompt
          openModal('comment-otp-modal');
        } else {
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
      alert('Thank you for your purchase! You will receive a confirmation shortly.');
    } else if (urlParams.get('canceled') === 'true') {
      alert('Your order was canceled. If you need assistance, please contact us.');
    }
  });
