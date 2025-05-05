// Enhanced Shipping Form with Google Places API Integration

// Function to initialize Google Places API for address autocomplete
function initGooglePlacesAutocomplete() {
  // Get the shipping address input field and container
  const addressInput = document.getElementById('ship-address-autocomplete');
  const autocompleteContainer = document.getElementById('address-autocomplete-container');
  if (!addressInput || !autocompleteContainer) {
      console.error('Address input or container not found.');
      return;
  }

  // Create options shared by both APIs where applicable
  const options = {
    fields: ["address_components", "formatted_address"],
    types: ["address"],
    componentRestrictions: { country: ["us", "ca"] } // Restrict to US and Canada
  };

  // Clear previous autocomplete instances if any exist in the container
  while (autocompleteContainer.firstChild) {
    autocompleteContainer.removeChild(autocompleteContainer.firstChild);
  }
  // Also clear the input field itself to avoid stale data if re-initializing
  addressInput.value = '';

  // Shared handler function for processing the selected place
  function handlePlaceSelection(place) {
    // Ensure place and address_components exist
    if (!place || !place.address_components) {
      console.error('Place selection error: No address components found in the selected place.', place);
      // Show a user-facing error message
      const validationMessage = document.getElementById('address-validation-message');
      if (validationMessage) {
        validationMessage.textContent = 'Could not retrieve address details. Please try again or enter manually.';
        validationMessage.classList.remove('success', 'hidden');
        validationMessage.classList.add('error'); // Use an 'error' class for styling
      }
      // Optionally clear detailed fields if an error occurs
      const detailedFields = document.getElementById('detailed-address-fields');
      if (detailedFields) {
         // Keep fields visible but clear them
         document.getElementById('ship-street-address').value = '';
         document.getElementById('ship-city').value = '';
         document.getElementById('ship-state').value = '';
         document.getElementById('ship-zip').value = '';
         document.getElementById('ship-country').value = '';
      }
      return;
    }

    // Show the detailed address form fields container
    const detailedFields = document.getElementById('detailed-address-fields');
    if (detailedFields) {
        detailedFields.classList.remove('hidden');
    } else {
        console.error('Detailed address fields container not found.');
    }

    // Extract address components
    let streetNumber = '';
    let streetName = '';
    let city = '';
    let state = ''; // Can be state or province
    let country = '';
    let postalCode = ''; // Can be zip or postal code

    place.address_components.forEach(component => {
      const types = component.types;
      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      } else if (types.includes('route')) { // 'route' usually corresponds to the street name
        streetName = component.long_name;
      } else if (types.includes('locality') || types.includes('sublocality') || types.includes('sublocality_level_1')) {
        // 'locality' is typically city, 'sublocality' can sometimes be used
        city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) { // This is State in US, Province in CA
        state = component.long_name; // Use long_name for full state/province name
      } else if (types.includes('country')) {
        country = component.long_name; // Use long_name for full country name
      } else if (types.includes('postal_code')) {
        postalCode = component.long_name;
      }
    });

    // Populate street address field (handle cases where number or name might be missing)
    let streetAddress = '';
    if (streetNumber && streetName) {
        streetAddress = `${streetNumber} ${streetName}`;
    } else if (place.formatted_address) {
        // Fallback using the first part of formatted_address if components are incomplete
        streetAddress = place.formatted_address.split(',')[0];
        console.warn('Using formatted_address for street due to missing components:', place.formatted_address);
    } else {
        console.warn('Could not determine street address from components or formatted address.');
        streetAddress = ''; // Leave blank if completely unavailable
    }
    const shipStreetAddress = document.getElementById('ship-street-address');
    if (shipStreetAddress) shipStreetAddress.value = streetAddress;


    // Populate city, state/province, zip/postal code, country
    const shipCity = document.getElementById('ship-city');
    const shipState = document.getElementById('ship-state');
    const shipZip = document.getElementById('ship-zip');
    const shipCountry = document.getElementById('ship-country');

    // Check if elements exist before setting value
    if(shipCity) shipCity.value = city;
    if(shipState) shipState.value = state;
    if(shipZip) shipZip.value = postalCode;
    if(shipCountry) shipCountry.value = country;

    // Validate if address is in US or Canada and update UI
    const validationMessage = document.getElementById('address-validation-message');
    if (validationMessage) {
        if (country === 'United States' || country === 'Canada') {
            addressInput.classList.add('validated-address'); // Add visual indicator
            addressInput.classList.remove('invalid-address');
            validationMessage.textContent = 'Address validated';
            validationMessage.classList.remove('hidden', 'error'); // Ensure error class is removed
            validationMessage.classList.add('success'); // Add success class
        } else {
            addressInput.classList.remove('validated-address');
            addressInput.classList.add('invalid-address'); // Add visual indicator for invalid
            validationMessage.textContent = 'Only US and Canada addresses are supported.';
            validationMessage.classList.remove('hidden', 'success'); // Ensure success class is removed
            validationMessage.classList.add('error'); // Add error class
        }
        validationMessage.classList.remove('hidden'); // Make message visible
    }
  } // --- End of handlePlaceSelection ---


  // --- API Initialization Logic ---

  // Check if the NEWER API (PlaceAutocompleteElement) is available
  if (
    window.google &&
    google.maps &&
    google.maps.places &&
    google.maps.places.PlaceAutocompleteElement
  ) {
    // --- Use Newer API ---
    console.log("Using newer PlaceAutocompleteElement API.");
    try {
        // The newer API can directly use the input element or be appended.
        // Using it directly with the input element is often cleaner.
        // Pass the input element in the options for the new API.
        const autocompleteElementOptions = { ...options, inputElement: addressInput };
        const autocompleteElement = new google.maps.places.PlaceAutocompleteElement(autocompleteElementOptions);

        // We might not need to append it if it binds directly to the input.
        // If you want a separate UI element, you'd append it:
        // autocompleteContainer.innerHTML = ''; // Clear container first
        // autocompleteContainer.appendChild(autocompleteElement);
        // If appending, ensure the original input is hidden or styled appropriately.

        // For simplicity, let's assume it binds to the inputElement directly
        // So we make sure the container isn't taking up space unnecessarily
        autocompleteContainer.style.display = 'none'; // Hide container if new API binds to input
        addressInput.style.display = ''; // Ensure original input is visible

        // Add listener for the newer element's event
        autocompleteElement.addEventListener('gmp-placeselect', (event) => {
            const place = event.place;
            console.log("Place selected (New API):", place);
            handlePlaceSelection(place);
        });

    } catch (error) {
        console.error("Error initializing PlaceAutocompleteElement:", error);
        // Fallback to classic if new API initialization fails
        initializeClassicAutocomplete();
    }

  }
  // Check if the CLASSIC API (Autocomplete) is available as a fallback
  else if (window.google && google.maps && google.maps.places && google.maps.places.Autocomplete) {
    // --- Use Classic API (Fallback) ---
     initializeClassicAutocomplete();
  }
  // Handle case where Google Maps or Places library isn't loaded at all
  else {
      console.error("Google Maps Places API not loaded or available.");
      // Display error in the container meant for the autocomplete widget
      if(autocompleteContainer) {
        autocompleteContainer.innerHTML = '<p style="color: red;">Address lookup unavailable. Please enter manually.</p>';
        autocompleteContainer.style.display = 'block'; // Make sure container is visible to show message
        addressInput.style.display = ''; // Ensure main input is still visible
      }
      // Hide detailed fields initially if API fails completely
       const detailedFields = document.getElementById('detailed-address-fields');
       if (detailedFields) {
            detailedFields.classList.add('hidden');
       }
  }

  // --- Helper function for Classic Autocomplete ---
  function initializeClassicAutocomplete() {
       console.log("Using classic Autocomplete API as fallback.");
       try {
           // Classic API binds directly to the input field
           const autocomplete = new google.maps.places.Autocomplete(addressInput, options);
           // setFields might be redundant if already in options, but ensures consistency
           autocomplete.setFields(['address_components', 'formatted_address']);

           // Add listener for the classic autocomplete event
           autocomplete.addListener('place_changed', function() {
               const place = autocomplete.getPlace();
               console.log("Place selected (Classic API):", place);
               handlePlaceSelection(place);
           });

           // Ensure input is visible and container (if used for new API) is hidden
           addressInput.style.display = '';
           autocompleteContainer.style.display = 'none';

       } catch (error) {
            console.error("Error initializing classic Autocomplete:", error);
            // Display error if classic init fails too
             if(autocompleteContainer) {
               autocompleteContainer.innerHTML = '<p style="color: red;">Address lookup failed. Please enter manually.</p>';
               autocompleteContainer.style.display = 'block';
             }
            // Hide detailed fields initially
            const detailedFields = document.getElementById('detailed-address-fields');
            if (detailedFields) {
                 detailedFields.classList.add('hidden');
            }
       }
  }


  // Add focus listener to hide validation message when user starts editing again
  // This should run regardless of which API was initialized successfully or not
  addressInput.addEventListener('focus', function() {
    const validationMessage = document.getElementById('address-validation-message');
    if(validationMessage){
        validationMessage.classList.add('hidden'); // Hide message on focus
        validationMessage.classList.remove('success', 'error'); // Clear status classes
        validationMessage.textContent = ''; // Clear text
    }
    // Remove validation styles from input on focus
    addressInput.classList.remove('validated-address', 'invalid-address');
    // Optionally hide detailed fields again until a new valid address is selected?
    // Depends on desired UX. For now, let's leave them visible once opened.
    // document.getElementById('detailed-address-fields')?.classList.add('hidden');
  });

  // Ensure detailed fields are hidden initially before any selection
  const detailedFields = document.getElementById('detailed-address-fields');
  if (detailedFields) {
       detailedFields.classList.add('hidden');
  }

} // --- End of initGooglePlacesAutocomplete ---


// Initialize the shipping form and Google Places API
function initShippingForm() {
  // Add Google Places API script with proper async loading
  // Check needs to be more robust: checks window.google, maps, and places specifically
  if (typeof window.google === 'undefined' || typeof window.google.maps === 'undefined' || typeof window.google.maps.places === 'undefined') {
    console.log('Google Maps Places API not found, attempting to load script...');
    // Ensure the callback function is globally accessible BEFORE the script loads
    window.initGooglePlacesAutocomplete = initGooglePlacesAutocomplete;

    const script = document.createElement('script');
    // IMPORTANT: Replace YOUR_API_KEY with your actual Google Maps API Key
    const apiKey = 'AIzaSyB8pNGvH1Aa_Flvigzdvp8kOeDcy6Xwgwk'; // Replace with your key
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlacesAutocomplete`;
    script.async = true;
    script.onerror = () => {
        console.error("Failed to load the Google Maps script. Address autocomplete will not work.");
        // Handle script loading failure (e.g., show message to user)
        const autocompleteContainer = document.getElementById('address-autocomplete-container');
         if(autocompleteContainer) {
           autocompleteContainer.innerHTML = '<p style="color: red;">Could not load address lookup. Please enter manually.</p>';
           autocompleteContainer.style.display = 'block';
         }
    };
    document.head.appendChild(script);

  } else {
    // If API is already loaded, just initialize
    console.log('Google Maps Places API already loaded, initializing autocomplete.');
    // Defer initialization slightly to ensure DOM is fully ready, especially if called early
    setTimeout(initGooglePlacesAutocomplete, 0);
  }

  // --- DEFERRED ATTACHMENT OF SHIPPING FORM SUBMIT LISTENER ---
  // Find the form
  const shippingForm = document.getElementById('shipping-form');

  // Check if listener already exists to prevent duplicates
  if (shippingForm && !shippingForm.dataset.listenerAttached) {
      shippingForm.addEventListener('submit', async e => {
          e.preventDefault();
          shippingForm.dataset.listenerAttached = 'true'; // Mark as attached

          const submitBtn = document.getElementById('shipping-submit-btn');
          if(submitBtn){
              submitBtn.disabled = true;
              submitBtn.textContent = 'Processing...';
          } else {
              console.error('Submit button not found');
              return; // Stop if button is missing
          }


          const f = e.target;
          // Combine street address and apartment/suite
          const streetAddress = f['ship-street-address']?.value || '';
          const apartment = f['ship-apartment']?.value || '';
          const fullAddress = apartment ? `${streetAddress}, ${apartment}` : streetAddress;

          const shipping = {
            name: f['ship-name']?.value || '',
            // Use the combined address here
            address: fullAddress,
            city: f['ship-city']?.value || '',
            state: f['ship-state']?.value || '',
            zip: f['ship-zip']?.value || '',
            country: f['ship-country']?.value || '',
            phone: f['ship-phone']?.value || '',
            email: f['ship-email']?.value || ''
          };

          // --- User Profile Update Logic ---
          if (currentUser && authToken) { // Ensure both currentUser and authToken exist
            const updatedContactInfo = {
              // Update only if values exist
              ...(shipping.email && { email: shipping.email }),
              ...(shipping.phone && { phone: shipping.phone }),
              shippingInfo: { // Always update shipping info object
                name: shipping.name,
                address: shipping.address, // Use the combined address
                city: shipping.city,
                state: shipping.state,
                zip: shipping.zip,
                country: shipping.country
              }
            };
            // Check if there's anything to update
            if (Object.keys(updatedContactInfo).length > 1 || Object.keys(updatedContactInfo.shippingInfo).length > 0) {
                try {
                  console.log('Attempting to update user profile...');
                  const updatedUser = await updateUserProfile(
                    currentUser.contactMethod,
                    currentUser.contactValue,
                    updatedContactInfo
                  );
                  if (updatedUser) {
                    console.log('User profile updated successfully.');
                    // Update local currentUser object carefully
                    currentUser = { ...currentUser, ...updatedUser };
                  } else {
                    console.warn('Update user profile call returned null or undefined.');
                  }
                } catch (error) {
                  console.error('Error updating user profile during checkout:', error);
                  // Decide if this error should prevent checkout (e.g., showToast and re-enable button)
                  // For now, we'll log it and continue with checkout
                }
            } else {
                 console.log('No new information to update in user profile.');
            }
          } else {
              console.log('Skipping profile update: No logged-in user or auth token.');
          }


          // --- Checkout Logic ---
          try {
            // Prepare data for localStorage (pending order)
            const pendingOrderData = {
                amount: currentPurchase.amount,
                contactMethod: currentPurchase.contactMethod,
                contactValue: currentPurchase.contactValue,
                shipping: shipping, // Use the extracted shipping object
                id: `order_${Date.now()}`,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('pendingOrder', JSON.stringify(pendingOrderData));
            console.log('Pending order saved to localStorage:', pendingOrderData);

            // Prepare data for the checkout API endpoint
            const checkoutData = {
              amount: currentPurchase.amount,
              contactMethod: currentPurchase.contactMethod,
              contactValue: currentPurchase.contactValue,
              // Send the same shipping object to the backend
              shipping: shipping
            };

            console.log('Sending checkout data to /api/checkout:', checkoutData);
            const res = await fetch('/api/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(checkoutData)
            });

            if (!res.ok) {
              // Try to get error details from response body if possible
              let errorBody = 'No details available';
              try {
                   errorBody = await res.text();
              } catch(_) {/* Ignore error reading body */}
              throw new Error(`Server responded with status: ${res.status}. Details: ${errorBody}`);
            }

            const { sessionUrl } = await res.json();
            if (!sessionUrl) {
                throw new Error('Server response did not include a sessionUrl.');
            }
            console.log('Received checkout session URL, redirecting...');
            window.location = sessionUrl; // Redirect to Stripe checkout

          } catch (error) {
            console.error('Checkout process error:', error);
            showToast(`Checkout failed: ${error.message || 'Please try again.'}`, 'error', 5000); // Show longer toast for errors
            // Re-enable the submit button only if an error occurred
            if(submitBtn){
                submitBtn.disabled = false;
                submitBtn.textContent = 'Continue to Payment';
            }
            // Remove the listener attached flag so it can be re-attached if needed
             if (shippingForm) delete shippingForm.dataset.listenerAttached;
          }
      });
      // Mark that the listener has been attached initially
      shippingForm.dataset.listenerAttached = 'true';
      console.log('Shipping form submit listener attached.');
  } else if (shippingForm) {
      console.log('Shipping form submit listener already attached.');
  } else {
       console.error('Shipping form element not found. Cannot attach submit listener.');
  }
} // --- End of initShippingForm ---


// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOMContentLoaded event fired.'); // Log when DOM is ready

  // Function to initialize shipping form with delay
  // Ensures that the modal transition/rendering is complete
  function deferredInitShippingForm() {
       console.log('Attempting deferred initialization of shipping form...');
      // Add a check to ensure the shipping modal is actually visible or relevant
      const shippingModal = document.getElementById('shipping-modal');
      // Check if modal exists and is not hidden, or if some other condition indicates it should init
      if (shippingModal && !shippingModal.classList.contains('hidden')) {
          console.log('Shipping modal is visible, calling initShippingForm.');
          initShippingForm();
      } else {
          console.log('Shipping modal not visible or not found, skipping initShippingForm for now.');
      }
  }

  // Add listeners that trigger shipping form initialization

  // Trigger on Login button click IF user is already logged in (for profile view -> purchase path?)
  // This might be redundant if purchase buttons also trigger it. Consider if needed.
  document.getElementById('login-button')?.addEventListener('click', function() {
      console.log('Login button clicked.');
      if (currentUser) {
          console.log('User is logged in, scheduling shipping form init.');
          // Use a small delay to allow modal transitions etc.
          setTimeout(deferredInitShippingForm, 300); // Reduced delay
      }
  });

  // Initialize on Purchase buttons click (most common path)
  document.querySelectorAll('.btn-deposit, .btn-buy, #flash-deal-button').forEach(btn => {
      btn.addEventListener('click', function() {
          console.log(`Purchase button (${btn.id || 'generic purchase'}) clicked.`);
          if (currentUser) {
              console.log('User is logged in, scheduling shipping form init for purchase.');
              setTimeout(deferredInitShippingForm, 300); // Use consistent delay
          } else {
              console.log('User not logged in, purchase button click will open OTP modal.');
              // The OTP verification success path should handle calling initShippingForm later
          }
      });
  });

  // Initialize after successful OTP verification for purchase
  const purchaseVerifyOtpBtn = document.getElementById('purchase-verify-otp-btn');
  if (purchaseVerifyOtpBtn) {
      // We need to trigger initShippingForm *after* the OTP verification is successful
      // The existing event listener for 'purchase-verify-otp-btn' handles opening the shipping modal.
      // Let's add the initShippingForm call there, after `openModal('shipping-modal');`
      // SEE MODIFICATION in the 'Verify OTP (purchase)' section below.
      console.log('Purchase OTP verify button found.');
  }

  // --- REST OF DOMContentLoaded ---
  // (Keep all the existing code from your original DOMContentLoaded here)

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
        iconHtml = '<i class="fas fa-check-circle"></i>'; // Make sure FontAwesome is loaded
        break;
        case 'error':
        iconHtml = '<i class="fas fa-exclamation-circle"></i>';
        break;
        case 'warning':
        iconHtml = '<i class="fas fa-exclamation-triangle"></i>';
        break;
        default: // info
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
        // Remove after animation
        setTimeout(() => {
        if(toast.parentNode) toast.remove();
        }, 300);
    });

    // Auto remove after duration
    const timer = setTimeout(() => {
        if (toast.parentNode) {
        toast.classList.add('toast-hide');
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 300);
        }
    }, duration);

    // Optional: Clear timer if closed manually
    closeBtn.addEventListener('click', () => clearTimeout(timer));


    // Add entrance animation class slightly after appending
    setTimeout(() => {
        toast.classList.add('toast-show');
    }, 10); // Small delay ensures transition works
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
            align-items: flex-end; /* Align toasts to the right */
            gap: 10px;
            max-width: 350px;
            width: calc(100% - 40px); /* Take width but respect max-width */
        }

        .toast {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            opacity: 0;
            transform: translateX(100%); /* Start off-screen right */
            transition: all 0.4s cubic-bezier(0.215, 0.610, 0.355, 1); /* Smoother transition */
            border-left: 4px solid #CBD5E1; /* Default border */
            width: 100%; /* Take full width of container */
            box-sizing: border-box;
            margin-bottom: 10px; /* Ensure gap */
        }

        .toast:last-child {
             margin-bottom: 0;
        }


        .toast-show {
            opacity: 1;
            transform: translateX(0); /* Slide in */
        }

        .toast-hide {
            opacity: 0;
            transform: scale(0.8); /* Optional shrink effect */
            /* transform: translateX(100%); */ /* Slide out */
        }

        .toast-icon {
            margin-right: 12px;
            font-size: 1.2em; /* Slightly larger icon */
            flex-shrink: 0;
            line-height: 1; /* Align icon better */
        }

        .toast-message {
            flex-grow: 1;
            font-size: 14px;
            color: #334155;
            line-height: 1.4;
            word-break: break-word; /* Prevent long messages overflowing */
        }

        .toast-close {
            background: none;
            border: none;
            font-size: 20px; /* Larger close button */
            cursor: pointer;
            color: #94A3B8;
            padding: 0 4px; /* Add slight padding */
            margin-left: 12px; /* More space */
            line-height: 1;
            opacity: 0.7;
             transition: opacity 0.2s ease;
        }

        .toast-close:hover {
            opacity: 1;
             color: #64748B;
        }

        /* Toast types */
        .toast-success { border-left-color: #10B981; }
        .toast-success .toast-icon { color: #10B981; }
        .toast-error { border-left-color: #EF4444; }
        .toast-error .toast-icon { color: #EF4444; }
        .toast-warning { border-left-color: #F59E0B; }
        .toast-warning .toast-icon { color: #F59E0B; }
        .toast-info { border-left-color: #3B82F6; }
        .toast-info .toast-icon { color: #3B82F6; }

        /* Responsive */
        @media (max-width: 480px) {
            #toast-container {
            bottom: 10px;
            right: 10px;
            left: 10px;
            max-width: none;
            width: calc(100% - 20px);
            align-items: stretch; /* Stretch toasts full width on mobile */
            }
            .toast {
                 transform: translateY(100%); /* Start off-screen bottom */
                 width: 100%;
            }
             .toast-show {
                transform: translateY(0); /* Slide up */
            }
            .toast-hide {
                 transform: translateY(100%); /* Slide down */
            }
        }
        `;
        document.head.appendChild(style);
    }
    }

    /* ── Stripe object ────────────────────────────────────────────────────── */
    // Ensure Stripe is loaded before using it. It's better to check typeof Stripe !== 'undefined'
    let stripe;
    if (typeof Stripe !== 'undefined') {
         stripe = Stripe('pk_live_51RFlwdHHD8eaYRObFGNzYCnpYOTPGcpFPzwhxePgl0xDVSm6HOnFxQk5vr8Cp2oArwk2UYH0Ro7Pnqh6g98boWiN00gWz3IIo5');
    } else {
        console.error("Stripe.js has not loaded. Payment processing will fail.");
        // Optionally show a user-facing error immediately
        showToast("Payment system failed to load. Please refresh or contact support.", "error", 10000);
    }


    // Pricing constants
    const FULL_PRICE = 499;
    const DISCOUNT_PCT = 0.40; // Example: 40% discount => 0.40
    const EARLY_BIRD_PCT = 0.30; // Example: 30% Early Bird discount
    const depositAmount = 49; // Fixed deposit amount
    // Calculate discounted prices based on FULL_PRICE and percentages
    // const discountedPrice = FULL_PRICE * (1 - DISCOUNT_PCT); // Price after general discount
    const discountedPrice = 299; // Hardcoded based on original code
    const earlyBirdTotal = 349; // Hardcoded based on original code
    // const earlyBirdTotal = FULL_PRICE * (1 - EARLY_BIRD_PCT); // Total price for early bird
    const earlyBirdRemaining = earlyBirdTotal - depositAmount; // Amount due later

    let purchasedSpots = parseInt(localStorage.getItem('purchasedSpots') || '0');
    let MAX_SPOTS = 10; // Default, will be updated from config

    // Global state - initialize objects
    let currentPurchase = { amount: 0, contactMethod: '', contactValue: '' };
    let pendingComment = { contactMethod: '', contactValue: '', text: '' };
    let currentUser = null; // Will be populated by checkStoredAuth or login
    let authToken = null; // Will be populated by checkStoredAuth or login
    let currentContactMethod = 'email'; // Default for OTP modals if not specified

    // Helper functions
    const formatCurrency = (amount) => {
        // Basic currency formatting, consider using Intl.NumberFormat for better localization
        if (typeof amount !== 'number') return '$0.00';
        return '$' + amount.toFixed(2);
    };

    // Check auth token
    async function checkStoredAuth() {
        console.log('Checking for stored authentication token...');
        const storedToken = localStorage.getItem('authToken');
        if (!storedToken) {
            console.log('No auth token found in localStorage.');
            return false;
        }

        console.log('Validating token with server...');
        try {
            const res = await fetch('/api/auth-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'validate', token: storedToken })
            });

            // Check for non-JSON responses or network errors first
            if (!res.ok) {
                 console.error(`Auth validation failed: Server responded with status ${res.status}`);
                 // Decide if token should be removed based on status code (e.g., 401 Unauthorized)
                 if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem('authToken');
                    console.log('Removed invalid auth token.');
                 }
                return false; // Indicate validation failed
            }

            const data = await res.json();
            if (data.valid && data.user) { // Ensure user data is present
                authToken = storedToken;
                currentUser = data.user;
                console.log('Auth token validated successfully. User:', currentUser);
                // Update UI elements
                const loginButton = document.getElementById('login-button');
                const commentForm = document.getElementById('comment-form');
                if(loginButton) loginButton.textContent = 'My Profile';
                if(commentForm) commentForm.classList.add('user-logged-in');
                updateFormValidation(); // Update comment form requirement
                return true;
            } else {
                console.log('Auth token is invalid or expired.');
                localStorage.removeItem('authToken'); // Remove invalid token
                // Reset UI
                 const loginButton = document.getElementById('login-button');
                 const commentForm = document.getElementById('comment-form');
                 if(loginButton) loginButton.textContent = 'Login';
                 if(commentForm) commentForm.classList.remove('user-logged-in');
                return false;
            }
        } catch (error) {
            console.error('Error during auth token validation:', error);
            // Consider removing token on network errors too, or retry logic?
            localStorage.removeItem('authToken');
            // Reset UI
             const loginButton = document.getElementById('login-button');
             const commentForm = document.getElementById('comment-form');
             if(loginButton) loginButton.textContent = 'Login';
             if(commentForm) commentForm.classList.remove('user-logged-in');
            return false;
        }
    }

    // Load comments
    async function loadComments() {
        const list = document.getElementById('comments-list');
        if (!list) {
            console.error('Comments list element not found.');
            return;
        }
        list.innerHTML = '<p style="text-align:center; padding: 20px 0; color: var(--medium-gray);">Loading comments...</p>'; // Improved loading message

        try {
            const res = await fetch('/api/comments'); // Assuming GET request
            if (!res.ok) {
                throw new Error(`Server responded with status: ${res.status}`);
            }
            const comments = await res.json();

            list.innerHTML = ''; // Clear loading message

            if (!Array.isArray(comments) || !comments.length) {
            list.innerHTML = '<p style="color:var(--medium-gray);text-align:center; padding: 20px 0;">Be the first to leave a comment!</p>'; // Nicer empty state
            return;
            }

            // Sort comments by timestamp descending (newest first)
            comments
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .forEach(comment => displayComment(comment, list)); // Pass list element

            console.log(`Loaded ${comments.length} comments.`);

        } catch (error) {
            console.error('Error loading comments:', error);
            list.innerHTML = `<p style="color: var(--alert-color, red); text-align:center; padding: 20px 0;">Could not load comments. Please try refreshing the page.</p>`; // Better error message
        }
    }

    // Display a single comment
    function displayComment(comment, listElement) {
        // Basic validation of comment object
        if (!comment || !comment.contactValue || !comment.text || !comment.timestamp) {
             console.warn('Skipping invalid comment object:', comment);
             return;
        }
        if (!listElement) return; // Need the list to append to

        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment';

        const header = document.createElement('div');
        header.className = 'comment-header';

        const authorStrong = document.createElement('strong');
        // Basic sanitization (replace < >) to prevent simple HTML injection in names
        authorStrong.textContent = comment.contactValue.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        header.appendChild(authorStrong); // Append author first

        if (comment.verified) {
            const badge = document.createElement('span');
            badge.className = 'verified-badge';
            badge.textContent = 'Verified Purchase';
            badge.title = 'This comment is from a verified buyer.'; // Add tooltip
            header.appendChild(badge); // Append badge after author
        }


        const commentTextP = document.createElement('p');
        // Basic sanitization for comment text as well
         commentTextP.textContent = comment.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");


        const dateSmall = document.createElement('small');
        dateSmall.className = 'comment-date'; // Add class for styling
        try {
             dateSmall.textContent = new Date(comment.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); // Nicer date format
        } catch (e) {
             dateSmall.textContent = comment.timestamp; // Fallback if date is invalid
        }


        commentDiv.append(header, commentTextP, dateSmall);
        listElement.appendChild(commentDiv);
    }


    // Modal management - Consider adding focus trapping for accessibility
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
             modal.classList.remove('hidden');
             // Optional: Focus the first focusable element in the modal
             const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
             if (firstFocusable) {
                 firstFocusable.focus();
             }
        } else {
            console.error(`Modal with ID ${modalId} not found.`);
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');

            // Clear non-radio/checkbox inputs
            const inputs = modal.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), textarea');
            inputs.forEach(input => (input.value = ''));

            // Reset specific modal states
            if (modalId === 'purchase-otp-modal' || modalId === 'login-modal' || modalId === 'phone-collection-modal') {
                const otpSection = modal.querySelector('.otp-section'); // Generalize OTP section class
                const initialSection = modal.querySelector('.initial-contact-section'); // Generalize initial section
                const sendOtpBtn = modal.querySelector('.send-otp-btn'); // Generalize send button
                const verifyBtn = modal.querySelector('.verify-otp-btn'); // Generalize verify button

                if(initialSection) initialSection.style.display = 'block';
                if(otpSection) otpSection.style.display = 'none';
                if(sendOtpBtn) {
                    sendOtpBtn.disabled = false;
                    // Reset text based on specific modal if needed
                    if (modalId === 'purchase-otp-modal') sendOtpBtn.textContent = 'Send Verification Code';
                    if (modalId === 'login-modal') sendOtpBtn.textContent = 'Send OTP';
                    if (modalId === 'phone-collection-modal') sendOtpBtn.textContent = 'Verify Phone Number';

                }
                 if (verifyBtn) {
                     verifyBtn.disabled = false;
                     // Reset text
                      if (modalId === 'purchase-otp-modal') verifyBtn.textContent = 'Verify';
                      if (modalId === 'login-modal') verifyBtn.textContent = 'Verify & Load Profile';
                      if (modalId === 'phone-collection-modal') verifyBtn.textContent = 'Verify OTP';
                 }
            }
             // Add specific resets for comment-otp-modal if needed
             if (modalId === 'comment-otp-modal') {
                 const verifyBtn = modal.querySelector('#comment-verify-otp-btn');
                  if (verifyBtn) {
                      verifyBtn.disabled = false;
                      verifyBtn.textContent = 'Verify OTP';
                  }
             }

        } else {
             console.error(`Cannot close modal: ID ${modalId} not found.`);
        }
    }

    // Pre-populate shipping form from user data
    function populateShippingForm(user) {
        if (!user) return; // Guard clause

        console.log('Populating shipping form for user:', user);

        // Helper to set value if element exists
        const setValue = (selector, value) => {
            const element = document.querySelector(selector);
            if (element && value !== undefined && value !== null) { // Check for null/undefined
                 element.value = value;
            } else if (element) {
                 element.value = ''; // Clear if no value provided
            }
        };

        // Populate email/phone based on primary contact method first
        if (user.contactMethod === 'email') {
            setValue('input[name="ship-email"]', user.contactValue);
            setValue('input[name="ship-phone"]', user.phone || ''); // Populate phone if available
        } else if (user.contactMethod === 'sms') {
            setValue('input[name="ship-phone"]', user.contactValue);
            setValue('input[name="ship-email"]', user.email || ''); // Populate email if available
        }

        // Populate shipping info if available
        if (user.shippingInfo) {
            setValue('input[name="ship-name"]', user.shippingInfo.name || '');

            // Handle combined address potentially containing apartment/suite
            const fullAddress = user.shippingInfo.address || '';
            const addressParts = fullAddress.split(','); // Simple split by comma
            const streetAddress = addressParts[0] ? addressParts[0].trim() : '';
            // Assume anything after the first comma might be apartment/suite etc.
            const apartment = addressParts.slice(1).join(',').trim();

            setValue('input[name="ship-street-address"]', streetAddress);
            setValue('input[name="ship-apartment"]', apartment); // Populate apartment field

            setValue('input[name="ship-city"]', user.shippingInfo.city || '');
            setValue('input[name="ship-state"]', user.shippingInfo.state || '');
            setValue('input[name="ship-zip"]', user.shippingInfo.zip || '');
            setValue('input[name="ship-country"]', user.shippingInfo.country || '');
        } else {
            // Clear shipping fields if no shippingInfo exists
             setValue('input[name="ship-name"]', '');
             setValue('input[name="ship-street-address"]', '');
             setValue('input[name="ship-apartment"]', '');
             setValue('input[name="ship-city"]', '');
             setValue('input[name="ship-state"]', '');
             setValue('input[name="ship-zip"]', '');
             setValue('input[name="ship-country"]', '');
        }

         // After populating, maybe trigger Google Places init again?
         // Or ensure it runs if the address field was populated.
         // initGooglePlacesAutocomplete(); // Careful not to cause infinite loops
    }


    // Show profile modal
    async function showProfileModal(user, orders) {
         if (!user) return;

         const profileContactDiv = document.getElementById('profile-contact');
         const orderHistoryUl = document.getElementById('order-history');
         const profileModalContent = document.querySelector('#profile-modal .modal-content');

         if (!profileContactDiv || !orderHistoryUl || !profileModalContent) {
              console.error('Profile modal elements not found.');
              showToast('Could not display profile information.', 'error');
              return;
         }

          // Build Contact Info HTML
          let contactHTML = `<p><strong>Primary Contact (${user.contactMethod}):</strong> ${user.contactValue}</p>`;
          if (user.email && user.contactMethod !== 'email') {
            contactHTML += `<p><strong>Email:</strong> ${user.email}</p>`;
          }
          if (user.phone && user.contactMethod !== 'sms') {
            contactHTML += `<p><strong>Phone:</strong> ${user.phone}</p>`;
          }

          // Build Shipping Info HTML
          if (user.shippingInfo && Object.keys(user.shippingInfo).length > 0) {
            contactHTML += '<p style="margin-top:1em;"><strong>Shipping Address:</strong><br>';
            contactHTML += [
                user.shippingInfo.name,
                user.shippingInfo.address, // This is the full address including apt/suite
                `${user.shippingInfo.city || ''}${user.shippingInfo.state ? `, ${user.shippingInfo.state}` : ''} ${user.shippingInfo.zip || ''}`,
                user.shippingInfo.country
            ].filter(Boolean).join('<br>'); // Join non-empty parts with line breaks
            contactHTML += '</p>';
          } else {
              contactHTML += '<p style="margin-top:1em; color: var(--medium-gray);">No shipping address on file.</p>';
          }
          profileContactDiv.innerHTML = contactHTML;


          // Build Order History List
          orderHistoryUl.innerHTML = ''; // Clear previous entries
          if (!Array.isArray(orders) || !orders.length) {
            orderHistoryUl.innerHTML = '<li>No past orders found.</li>';
          } else {
             // Sort orders by date descending (most recent first)
            orders
            .sort((a, b) => new Date(b.created || b.timestamp) - new Date(a.created || a.timestamp)) // Use 'created' or 'timestamp'
            .forEach(o => {
                const li = document.createElement('li');
                const orderDate = new Date(o.created || o.timestamp); // Use appropriate timestamp field
                const formattedDate = orderDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                const orderAmount = typeof o.amount === 'number' ? formatCurrency(o.amount) : 'N/A';
                // Use order ID if available, fallback to a generic identifier
                const orderId = o.id || `Order from ${formattedDate}`;
                 li.textContent = `${orderId}: ${orderAmount} on ${formattedDate}`;
                 // Maybe add link/details if order IDs are clickable?
                orderHistoryUl.appendChild(li);
             });
          }

          // Logout Button - Ensure it's added only once or replaced correctly
          let logoutBtn = document.getElementById('logout-btn');
          if (!logoutBtn) {
                logoutBtn = document.createElement('button');
                logoutBtn.id = 'logout-btn';
                logoutBtn.className = 'btn btn-secondary'; // Add styling class
                profileModalContent.appendChild(logoutBtn); // Append inside content area
          }
          logoutBtn.textContent = 'Logout';
          // Remove previous listener before adding new one to prevent duplicates
          logoutBtn.replaceWith(logoutBtn.cloneNode(true)); // Simple way to remove listeners
          logoutBtn = document.getElementById('logout-btn'); // Re-select the new button
          logoutBtn.addEventListener('click', () => {
            console.log('Logout button clicked.');
            localStorage.removeItem('authToken');
            authToken = null;
            currentUser = null;
             // Reset UI elements
            const loginButton = document.getElementById('login-button');
            const commentForm = document.getElementById('comment-form');
            if(loginButton) loginButton.textContent = 'Login';
            if(commentForm) commentForm.classList.remove('user-logged-in');
            updateFormValidation();
            closeModal('profile-modal');
            showToast('You have been logged out.', 'info');
          });

          openModal('profile-modal');
    }

    // API calls with error handling

    async function sendOtp(method, value) {
        console.log(`Sending OTP via ${method} to ${value}`);
        try {
            const res = await fetch('/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contactMethod: method, contactValue: value })
            });
            // Check for non-OK status and potentially read error message from backend
            if (!res.ok) {
                let errorMsg = `Server responded with status: ${res.status}`;
                 try {
                     const errorData = await res.json();
                     errorMsg = errorData.message || errorMsg; // Use backend message if available
                 } catch (e) { /* Ignore if response is not JSON */ }
                 throw new Error(errorMsg);
            }
            const data = await res.json();
            // Ensure the backend sends a clear success indicator
            if(data.success === true){
                console.log('OTP sent successfully response from server.');
                return true;
            } else {
                console.warn('OTP send request processed, but backend indicated failure:', data);
                // Use backend message if available, otherwise generic failure
                 showToast(data.message || 'Failed to send OTP. Please check your contact info.', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error sending OTP:', error);
             showToast(`Error sending OTP: ${error.message}`, 'error');
            return false;
        }
    }

    async function verifyOtp(method, value, code) {
         console.log(`Verifying OTP for ${method}:${value} with code ${code}`);
         if (!code || code.length < 4) { // Basic validation
             showToast('Please enter a valid verification code.', 'warning');
             return false;
         }
        try {
            const res = await fetch('/api/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contactMethod: method, contactValue: value, code })
            });
            if (!res.ok) {
                 let errorMsg = `Server responded with status: ${res.status}`;
                 try {
                     const errorData = await res.json();
                     errorMsg = errorData.message || errorMsg;
                 } catch (e) { /* Ignore non-JSON response */ }
                 // Provide more specific feedback for common errors like incorrect code
                 if (res.status === 400 || res.status === 401) {
                    showToast(errorMsg || 'Incorrect verification code.', 'error');
                 } else {
                    showToast(`OTP verification failed: ${errorMsg}`, 'error');
                 }
                 return false; // Indicate failure
            }
            const data = await res.json();
            if (data.verified === true) {
                 console.log('OTP verified successfully.');
                 return true;
            } else {
                 console.warn('OTP verification failed:', data);
                 showToast(data.message || 'Incorrect verification code.', 'error');
                 return false;
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            showToast(`Error verifying OTP: ${error.message}`, 'error');
            return false;
        }
    }

    async function updateUserProfile(currentContactMethod, currentContactValue, updatedInfo) {
         console.log('Updating user profile:', updatedInfo);
         if (!authToken) {
             console.error('Cannot update profile: No auth token available.');
             return null; // Or throw error?
         }
        try {
            const res = await fetch('/api/update-user-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Include Authorization header if your backend expects it
                 // 'Authorization': `Bearer ${authToken}`
             },
            body: JSON.stringify({
                currentContactMethod,
                currentContactValue,
                updatedInfo,
                token: authToken // Send token in body if not using Auth header
            })
            });
            if (!res.ok) {
                let errorMsg = `Server responded with status: ${res.status}`;
                try {
                     const errorData = await res.json();
                     errorMsg = errorData.message || errorMsg;
                } catch (e) {/* Ignore non-JSON */}
                throw new Error(`Failed to update profile: ${errorMsg}`);
            }
            const data = await res.json();
            // Expect the backend to return the updated user object
            if (data.user) {
                console.log('Profile update successful, received updated user data.');
                return data.user;
            } else {
                console.warn('Profile update response did not contain user object.');
                return null; // Indicate success but no updated data returned
            }
        } catch (error) {
            console.error('Error updating user profile API call:', error);
            // Don't necessarily show a toast here, as it might be called in background
            return null; // Indicate failure
        }
    }

    // Form validation toggle (for comment form email)
    function updateFormValidation() {
        const emailField = document.getElementById('comment-email');
        if (emailField) {
            if (currentUser) {
                emailField.removeAttribute('required');
                // Optional: Hide or disable the email field if user is logged in
                 // emailField.closest('.form-group').style.display = 'none';
            } else {
                emailField.setAttribute('required', '');
                // Optional: Ensure field is visible if user logs out
                 // emailField.closest('.form-group').style.display = '';
            }
        }
    }

    // Google Sign-In callback
    window.handleGoogleSignIn = async function(response) {
        console.log('Google Sign-In callback triggered.');
        const idToken = response.credential;
        if (!idToken) {
            console.error('Google Sign-In response missing credential.');
            showToast('Google Sign-In failed. Please try again.', 'error');
            return;
        }
        await authenticateWithGoogle(idToken);
    };
    // Note: Ensure the Google Sign-In library is loaded and configured correctly in your HTML.


    async function authenticateWithGoogle(idToken) {
        console.log('Authenticating with Google using ID token...');
        // Add loading indicator?
        const loginButton = document.getElementById('login-button');
        const originalLoginText = loginButton ? loginButton.textContent : 'Login';
        if(loginButton) {
            loginButton.textContent = 'Authenticating...';
            loginButton.disabled = true;
        }

        try {
            const response = await fetch('/api/google-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
            });

            if (!response.ok) {
                let errorMsg = `Server responded with status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                } catch(e) {/* Ignore */}
                throw new Error(`Google authentication failed: ${errorMsg}`);
            }

            const data = await response.json();
             if (!data.token || !data.user) {
                  throw new Error('Authentication response missing token or user data.');
             }

            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;
            console.log('Google authentication successful:', currentUser);

             // Update UI
            if(loginButton) loginButton.textContent = 'My Profile';
            document.getElementById('comment-form')?.classList.add('user-logged-in');
            updateFormValidation();
            closeModal('login-modal'); // Close login modal if open

            if (data.needsPhone) { // Check if backend indicates phone is needed
                console.log('User needs to provide phone number.');
                openModal('phone-collection-modal');
                showToast('Please add your phone number to complete your profile.', 'info');
            } else {
                // Fetch orders associated with the user to show in profile
                 try {
                      const ordersRes = await fetch('/api/orders', { // Assuming an endpoint to get orders
                           headers: { 'Authorization': `Bearer ${authToken}` }
                      });
                      const orders = ordersRes.ok ? await ordersRes.json() : [];
                       showProfileModal(data.user, orders); // Show profile with fetched orders
                 } catch (orderError) {
                      console.error("Error fetching orders for profile:", orderError);
                       showProfileModal(data.user, []); // Show profile with empty orders on error
                 }
                 showToast('Google authentication successful!', 'success');
            }

        } catch (error) {
            console.error('Google authentication process error:', error);
            showToast(`Google Sign-In Error: ${error.message}`, 'error');
            // Reset UI?
            localStorage.removeItem('authToken');
            currentUser = null;
            authToken = null;
            if(loginButton) loginButton.textContent = originalLoginText;
             document.getElementById('comment-form')?.classList.remove('user-logged-in');

        } finally {
            // Re-enable login button
            if(loginButton) loginButton.disabled = false;
        }
    }

    // Twitter conversion tracking (basic check for function existence)
    function trackTwitterConversion(orderValue, email) {
        if (typeof twq === 'function') {
            console.log('Tracking Twitter conversion:', { value: orderValue, email_address: email });
            try {
                 twq('event', 'tw-pmtpc-pmtpd', { // Ensure event ID is correct
                    value: orderValue.toFixed(2), // Format value consistently
                    email_address: email // Pass email
                    // currency: 'USD' // Optional: Add currency
                 });
            } catch (e) {
                console.error("Error executing Twitter tracking pixel:", e);
            }

        } else {
            console.log('Twitter tracking function (twq) not found.');
        }
    }

    /* ── DOMContentLoaded Initialization ─────────────────────────────────── */
    console.log('Setting up DOMContentLoaded listeners...');

    // Initialize toast styles immediately
    addToastStyles();

    // Demo button setup
    const videoSection = document.querySelector('.product-video');
    const video = videoSection?.querySelector('video'); // Chain querySelector
    if (videoSection && video) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'demo-button-container';
        const demoButton = document.createElement('button');
        demoButton.className = 'btn demo-button'; // Use consistent btn class
        demoButton.textContent = 'Watch product demo';
        buttonContainer.appendChild(demoButton);
        // Insert after the video section
        videoSection.parentNode.insertBefore(buttonContainer, videoSection.nextSibling);

        demoButton.addEventListener('click', function() {
        video.currentTime = 30; // Start at 30 seconds
        video.play().catch(error => console.error('Error playing video:', error));
        // Scroll video into view smoothly
        videoSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        console.log('Demo button setup complete.');
    } else {
        console.log('Video or video section not found, skipping demo button setup.');
    }


    // Order success modal - Create if not exists
    if (!document.getElementById('order-success-modal')) {
        const orderSuccessModal = document.createElement('div');
        orderSuccessModal.id = 'order-success-modal';
        orderSuccessModal.className = 'modal hidden'; // Start hidden
        orderSuccessModal.setAttribute('role', 'dialog');
        orderSuccessModal.setAttribute('aria-labelledby', 'order-success-heading');
        orderSuccessModal.innerHTML = `
        <div class="modal-content">
            <button class="close-modal" data-modal="order-success-modal" aria-label="Close">&times;</button>
            <h3 id="order-success-heading">Order Confirmation</h3>
            <div id="order-success-details">
            <p><strong>Thank you for your purchase!</strong></p>
            <p>Your order has been confirmed. You should receive a confirmation message shortly via ${currentUser?.contactMethod || 'your contact method'}.</p>
            <div id="order-info-display" style="margin-top: 1em; padding: 1em; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;">
                <!-- Order details will be injected here -->
                <p>Loading order details...</p>
            </div>
            </div>
            <button id="order-success-close-btn" class="btn" style="margin-top: 1em;">Close</button>
        </div>
        `;
        document.body.appendChild(orderSuccessModal);
        console.log('Order success modal created.');
    }

    // Populate prices dynamically
    try {
        document.getElementById('full-price-display').textContent = formatCurrency(FULL_PRICE);
        document.getElementById('deposit-price-display').textContent = formatCurrency(depositAmount);
        document.getElementById('deposit-description').innerHTML =
            `Get the Early Bird discount! Pay <strong>${formatCurrency(depositAmount)}</strong> today and just <strong>${formatCurrency(earlyBirdRemaining)}</strong> later when your OneSpark ships (Est. Q4 2025). Total <strong>${formatCurrency(earlyBirdTotal)}</strong> - a ${Math.round(EARLY_BIRD_PCT * 100)}% saving!`;
        document.getElementById('buy-now-original-price').textContent = formatCurrency(FULL_PRICE);
        const buyNowDisp = document.getElementById('buy-now-price-display');
        // Safer way to update price node, assuming structure is e.g., <strike>$XXX</strike> $YYY
         const priceTextNode = Array.from(buyNowDisp.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.includes('$'));
         if (priceTextNode) {
              priceTextNode.nodeValue = ` ${formatCurrency(discountedPrice)}`;
         } else {
             // Fallback if structure is different
              buyNowDisp.innerHTML += ` ${formatCurrency(discountedPrice)}`; // Append if text node not found
         }

        console.log('Prices populated.');
    } catch (e) {
        console.error("Error populating prices:", e);
    }


    // Fetch MAX_SPOTS from config API
    async function fetchConfig() {
         console.log('Fetching configuration...');
         try {
             const response = await fetch('/api/get-config');
             if (!response.ok) {
                 throw new Error(`Config fetch failed: Status ${response.status}`);
             }
             const data = await response.json();
             if (data.MAX_SPOTS) {
                 const newMaxSpots = parseInt(data.MAX_SPOTS);
                 if (!isNaN(newMaxSpots) && newMaxSpots > 0) {
                     MAX_SPOTS = newMaxSpots;
                     console.log(`MAX_SPOTS updated from config: ${MAX_SPOTS}`);
                 } else {
                     console.warn(`Received invalid MAX_SPOTS from config: ${data.MAX_SPOTS}`);
                 }
             } else {
                 console.log('MAX_SPOTS not found in config, using default:', MAX_SPOTS);
             }
             // Initialize or update spots progress after fetching config
             ensureProgressBarInit(); // This will call initializeSpots which uses MAX_SPOTS

         } catch (error) {
             console.error('Error fetching configuration:', error);
             // Still try to initialize with default MAX_SPOTS
              ensureProgressBarInit();
         }
    }


    // Update spots progress bar - ensure elements exist
    function updateSpotsProgress() {
        const progressFill = document.getElementById('spots-progress-fill');
        const spotsAvailableElement = document.getElementById('spots-available');
        const spotsTotalElement = document.getElementById('spots-total');
        const spotsContainer = document.querySelector('.spots-progress-container');

        if (!progressFill || !spotsAvailableElement || !spotsTotalElement || !spotsContainer) {
            // Don't log error repeatedly, just return if elements aren't ready
            return;
        }

        const spotsAvailable = Math.max(0, MAX_SPOTS - purchasedSpots); // Ensure non-negative
        // Prevent division by zero if MAX_SPOTS is somehow 0 or less
        const percentFilled = MAX_SPOTS > 0 ? Math.min(100, (purchasedSpots / MAX_SPOTS) * 100) : 0;

        progressFill.style.width = `${percentFilled}%`;
        spotsAvailableElement.textContent = spotsAvailable;
        spotsTotalElement.textContent = MAX_SPOTS;

        // Add/remove limited spots class
        if (spotsAvailable <= MAX_SPOTS * 0.3 && spotsAvailable > 0) { // Only if spots > 0
            spotsContainer.classList.add('spots-limited');
             spotsContainer.classList.remove('spots-soldout');
        } else if (spotsAvailable <= 0) {
             spotsContainer.classList.add('spots-soldout');
             spotsContainer.classList.remove('spots-limited');
        }
         else {
            spotsContainer.classList.remove('spots-limited', 'spots-soldout');
        }

        // Disable buy button if sold out
        const buyNowButton = document.getElementById('buy-now-button');
        const buyNowCard = buyNowButton?.closest('.option-card'); // Find parent card
        if (buyNowButton) {
            if (spotsAvailable <= 0) {
                buyNowButton.disabled = true;
                buyNowButton.textContent = 'Sold Out';
                if (buyNowCard) buyNowCard.classList.add('sold-out');
            } else {
                 // Ensure button is enabled if spots become available (less likely, but for completeness)
                 buyNowButton.disabled = false;
                 // Reset text if needed (might depend on other logic)
                 // buyNowButton.textContent = 'Buy Now';
                 if (buyNowCard) buyNowCard.classList.remove('sold-out');
            }
        }
    }


    // Initialize spots count from server
    async function initializeSpots() {
        console.log('Initializing spots count...');
        try {
            const response = await fetch('/api/purchase-count'); // Endpoint for purchase count
            if (!response.ok) {
                throw new Error(`Purchase count fetch failed: Status ${response.status}`);
            }
            const data = await response.json();

            // Use server count primarily, but respect higher local count if discrepancy exists
            // This handles cases where local increments occurred but server sync was delayed
            const serverCount = parseInt(data.count || '0');
             const storedCount = parseInt(localStorage.getItem('purchasedSpots') || '0');

            purchasedSpots = Math.max(serverCount, storedCount);

            // Update localStorage to potentially correct it with server value if server is higher
             localStorage.setItem('purchasedSpots', purchasedSpots.toString());

            console.log(`Spots initialized. Server count: ${serverCount}, LocalStorage: ${storedCount}, Using: ${purchasedSpots}`);
            updateSpotsProgress(); // Update UI after getting count

        } catch (error) {
            console.error('Error initializing spots count from server:', error);
            // Fallback to using only localStorage count if server fails
            purchasedSpots = parseInt(localStorage.getItem('purchasedSpots') || '0');
            console.log(`Using localStorage spots count due to server error: ${purchasedSpots}`);
            updateSpotsProgress(); // Still update UI with local count
        }
    }

    // Retry mechanism to ensure progress bar elements are found
    let progressBarInitAttempts = 0;
    const MAX_PROGRESS_BAR_ATTEMPTS = 10;

    function ensureProgressBarInit() {
         progressBarInitAttempts++;
         const required = [
            document.getElementById('spots-progress-fill'),
            document.getElementById('spots-available'),
            document.getElementById('spots-total'),
            document.querySelector('.spots-progress-container')
         ];

         if (required.every(el => el)) {
             console.log('Progress bar elements found. Initializing spots.');
             initializeSpots(); // Initialize spots count now that elements exist
         } else if (progressBarInitAttempts < MAX_PROGRESS_BAR_ATTEMPTS) {
             console.log(`Progress bar elements not ready, retrying... (Attempt ${progressBarInitAttempts})`);
             setTimeout(ensureProgressBarInit, 500); // Retry after 500ms
         } else {
             console.error('Failed to find progress bar elements after multiple attempts.');
         }
    }

    // Start the config fetch, which will then trigger progress bar initialization
    fetchConfig();


    // Check auth status after DOM is ready
    checkStoredAuth().then(isLoggedIn => {
        console.log('Initial authentication check complete. Logged in:', isLoggedIn);
        updateFormValidation(); // Update comment form based on auth status
    });


    // Setup close buttons for all modals
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        const modalId = closeBtn.getAttribute('data-modal');
        if(modalId){
             closeBtn.addEventListener('click', () => closeModal(modalId));
        } else {
             console.warn('Close button found without data-modal attribute:', closeBtn);
        }

    });

    // Close modals on clicking the background overlay (except shipping modal)
    document.querySelectorAll('.modal').forEach(modal => {
        // Add check to ensure it's not the shipping modal, which might have complex interactions
        if (modal.id !== 'shipping-modal') {
             modal.addEventListener('click', e => {
                // Check if the click target is the modal background itself, not its content
                if (e.target === modal) {
                    closeModal(modal.id);
                }
             });
        }
    });

    // Specific close button handlers (if any aren't covered by the general one)
    document.getElementById('profile-close-btn')?.addEventListener('click', () => {
        closeModal('profile-modal');
    });

    document.getElementById('order-success-close-btn')?.addEventListener('click', () => {
        closeModal('order-success-modal');
    });
     document.getElementById('comment-otp-close-btn')?.addEventListener('click', () => { // Example if comment modal has specific btn
         closeModal('comment-otp-modal');
     });


    // Purchase flow initiation
    document.querySelectorAll('.btn-deposit, .btn-buy, #flash-deal-button').forEach(btn => {
        btn.addEventListener('click', () => {
            let amount = 0;
            // Determine amount based on button ID or data attribute
            if (btn.id === 'deposit-button') {
                amount = depositAmount;
            } else if (btn.id === 'buy-now-button') {
                amount = discountedPrice;
            } else if (btn.id === 'flash-deal-button') {
                amount = 99; // Flash deal specific price
            }
             else if (btn.dataset.amount) { // Fallback to data attribute
                 amount = parseFloat(btn.dataset.amount);
             }

            if (isNaN(amount) || amount <= 0) {
                console.error('Invalid purchase amount determined for button:', btn.id);
                showToast('Could not determine purchase amount.', 'error');
                return;
            }

            currentPurchase.amount = amount;
            console.log(`Purchase initiated for amount: ${formatCurrency(amount)}`);

            if (currentUser) {
                currentPurchase.contactMethod = currentUser.contactMethod;
                currentPurchase.contactValue = currentUser.contactValue;
                console.log('User logged in, opening shipping modal.');
                openModal('shipping-modal');
                populateShippingForm(currentUser); // Pre-fill form
                 // Defer Google Places init slightly after opening modal
                 setTimeout(initShippingForm, 100); // initShippingForm now handles Places init

            } else {
                console.log('User not logged in, opening purchase OTP modal.');
                // Reset OTP modal state before opening
                 const purchaseOtpModal = document.getElementById('purchase-otp-modal');
                 if(purchaseOtpModal) {
                      // Reset fields, sections, buttons
                      closeModal('purchase-otp-modal'); // Use closeModal's reset logic
                 }
                openModal('purchase-otp-modal');
            }
        });
    });

    // Toggle email/phone in Purchase OTP modal
    document.getElementById('toggle-contact-method')?.addEventListener('click', function(e) {
        e.preventDefault();
        const contactInput = document.getElementById('purchase-contact-value');
        const toggleLink = this; // Use 'this' for the clicked element
        if (!contactInput) return;

        if (contactInput.type === 'email') {
            contactInput.type = 'tel';
            contactInput.placeholder = 'Enter your US/Canada phone number'; // Be specific
             contactInput.pattern = '\\+?[1]?[-.\\s]?\\(?([0-9]{3})\\)?[-.\\s]?([0-9]{3})[-.\\s]?([0-9]{4})'; // Basic US/CA pattern
             contactInput.title = 'Enter a valid US or Canadian phone number (e.g., +1-555-123-4567)';
            toggleLink.textContent = 'Use email address instead';
            currentContactMethod = 'sms'; // Update global state
        } else {
            contactInput.type = 'email';
            contactInput.placeholder = 'Enter your email address';
            contactInput.pattern = ''; // Remove phone pattern
             contactInput.title = ''; // Remove phone title
            toggleLink.textContent = 'Use phone number instead';
            currentContactMethod = 'email'; // Update global state
        }
        contactInput.value = ''; // Clear input on toggle
        contactInput.focus(); // Focus the input after toggling
    });


    // Resend OTP for Purchase modal
    document.getElementById('purchase-resend-otp')?.addEventListener('click', async function(e) {
        e.preventDefault();
        const resendLink = this;
        const contactInput = document.getElementById('purchase-contact-value');
        if (!contactInput) {
            showToast('Error: Contact input not found.', 'error');
            return;
        }
        const contactValue = contactInput.value.trim();
        // Use the currentContactMethod determined by the toggle
        const method = currentContactMethod;

        if (!contactValue) {
            showToast('Please enter your contact information first.', 'warning');
            return;
        }

        // Disable link temporarily to prevent spamming
        resendLink.style.opacity = '0.5';
        resendLink.style.pointerEvents = 'none';
        showToast(`Resending code to ${method}...`, 'info', 2000);

        try {
            const success = await sendOtp(method, contactValue);
            showToast(
                success
                ? 'Verification code resent successfully.'
                : 'Failed to resend code. Please try again shortly.', // Keep error message concise
                success ? 'success' : 'error'
            );
        } catch (error) {
            // sendOtp should handle showing toast on error, but catch any unexpected issues
            console.error("Unexpected error during resend OTP:", error);
             showToast('An error occurred while resending. Please try again.', 'error');
        } finally {
            // Re-enable link after a delay
            setTimeout(() => {
                resendLink.style.opacity = '1';
                resendLink.style.pointerEvents = 'auto';
            }, 5000); // Longer delay for resend
        }
    });


    // Send OTP (Purchase Flow)
    const purchaseSendOtpBtn = document.getElementById('purchase-send-otp-btn');
    if (purchaseSendOtpBtn) {
        purchaseSendOtpBtn.addEventListener('click', async function() {
            const contactInput = document.getElementById('purchase-contact-value');
            if (!contactInput) {
                showToast('Error: Contact input not found.', 'error');
                return;
            }
            // Determine method from input type, consistent with toggle logic
            const method = contactInput.type === 'email' ? 'email' : 'sms';
            const val = contactInput.value.trim();

            // Validation
            if (!val) {
                showToast(`Please enter your ${method === 'email' ? 'email address' : 'phone number'}.`, 'warning');
                contactInput.focus();
                return;
            }
            if (method === 'email' && !validateEmail(val)) { // Use validation helper
                showToast('Please enter a valid email address.', 'warning');
                contactInput.focus();
                return;
            }
             // Add basic phone validation if possible (complex internationally)
             if (method === 'sms' && !/^\+?[1]?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(val)) {
                  showToast('Please enter a valid US/Canada phone number.', 'warning');
                   contactInput.focus();
                  return;
             }


            this.disabled = true;
            this.textContent = 'Sending...';
            currentContactMethod = method; // Update state
            currentPurchase.contactMethod = method; // Update purchase details
            currentPurchase.contactValue = val;

            try {
                const success = await sendOtp(method, val);
                if (success) {
                    // Transition to OTP entry section
                    document.getElementById('initial-contact-section').style.display = 'none';
                    const otpSection = document.getElementById('purchase-otp-section');
                    otpSection.style.display = 'block';
                    // Update message confirming where code was sent
                    const messageEl = otpSection.querySelector('.otp-sent-message');
                    if (messageEl) {
                        messageEl.textContent = `Verification code sent to ${method === 'email' ? 'your email' : 'your phone'} (${val}).`;
                    }
                    // Focus the OTP input field
                    document.getElementById('purchase-otp-code')?.focus();
                    showToast('Verification code sent!', 'success');
                } else {
                    // sendOtp shows specific error, just re-enable button here
                    this.disabled = false;
                    this.textContent = 'Send Verification Code';
                }
            } catch (error) {
                 // Catch unexpected errors from await sendOtp
                 console.error("Unexpected error sending purchase OTP:", error);
                  showToast('An unexpected error occurred. Please try again.', 'error');
                  this.disabled = false;
                  this.textContent = 'Send Verification Code';
            }
        });
    }


    // Verify OTP (Purchase Flow) - MODIFIED to call initShippingForm
    const purchaseVerifyOtpBtnModified = document.getElementById('purchase-verify-otp-btn');
    if (purchaseVerifyOtpBtnModified) {
        purchaseVerifyOtpBtnModified.addEventListener('click', async function() {
            const verifyButton = this; // Reference to the button
            const contactInput = document.getElementById('purchase-contact-value'); // Get contact value again
            const otpCodeInput = document.getElementById('purchase-otp-code');

            if (!contactInput || !otpCodeInput) {
                showToast('Error: Could not find OTP input fields.', 'error');
                return;
            }
            // Use currentContactMethod state which was set when OTP was sent
            const contactValue = contactInput.value.trim(); // Use value from initial step
            const method = currentContactMethod;
            const code = otpCodeInput.value.trim();

            if (!code || code.length < 4) {
                showToast('Please enter the 4+ digit verification code.', 'warning');
                otpCodeInput.focus();
                return;
            }

            verifyButton.disabled = true;
            verifyButton.textContent = 'Verifying...';

            try {
                const verified = await verifyOtp(method, contactValue, code);

                if (verified) {
                    console.log('Purchase OTP verified successfully.');
                    showToast('Verification successful!', 'success');

                    // Update global state for the user session
                    currentUser = {
                        contactMethod: method,
                        contactValue: contactValue,
                        // Assume no other details known yet
                        email: method === 'email' ? contactValue : null,
                        phone: method === 'sms' ? contactValue : null,
                        shippingInfo: null
                    };
                    currentPurchase.contactMethod = method; // Ensure purchase reflects verified method
                    currentPurchase.contactValue = contactValue;

                    // Update UI elements for logged-in state
                    document.getElementById('login-button')?.textContent = 'My Profile'; // Or maybe 'Verified' temporarily?
                    document.getElementById('comment-form')?.classList.add('user-logged-in');
                    updateFormValidation(); // Update comment form requirements

                    // Attempt to create/retrieve auth token for the session
                    try {
                        const tokenRes = await fetch('/api/auth-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'create', // Or 'findOrCreate'
                            contactMethod: method,
                            contactValue: contactValue
                        })
                        });
                        if (tokenRes.ok) {
                        const tokenData = await tokenRes.json();
                            if (tokenData.token) {
                                authToken = tokenData.token;
                                localStorage.setItem('authToken', authToken);
                                console.log('Auth token created/retrieved and stored.');
                                 // Potentially merge user data from token response if available
                                 if(tokenData.user) {
                                      currentUser = { ...currentUser, ...tokenData.user };
                                      console.log('Merged user data from token response:', currentUser);
                                 }
                            } else {
                                 console.warn('Token creation/retrieval response did not include a token.');
                            }

                        } else {
                             console.error(`Auth token creation/retrieval failed: Status ${tokenRes.status}`);
                        }
                    } catch (tokenError) {
                        console.error('Error creating/retrieving auth token:', tokenError);
                    }

                    // Close OTP modal and open shipping modal
                    closeModal('purchase-otp-modal');
                    openModal('shipping-modal');
                    populateShippingForm(currentUser); // Populate with basic info

                    // *** Initialize Shipping Form & Google Places AFTER opening modal ***
                    setTimeout(initShippingForm, 100); // Allow modal to render

                    // Reset button state (although modal is closing)
                    verifyButton.disabled = false;
                    verifyButton.textContent = 'Verify';

                } else {
                    // verifyOtp shows toast for incorrect code
                    otpCodeInput.value = ''; // Clear incorrect code
                    otpCodeInput.focus();
                    verifyButton.disabled = false;
                    verifyButton.textContent = 'Verify';
                }
            } catch (error) {
                console.error('Unexpected error during purchase OTP verification:', error);
                showToast('An unexpected error occurred during verification. Please try again.', 'error');
                verifyButton.disabled = false;
                verifyButton.textContent = 'Verify';
            }
        });
    }

    // Shipping form submit listener is attached within initShippingForm to avoid duplicates

    // Login flow initiation
    document.getElementById('login-button')?.addEventListener('click', async () => {
        const loginButton = document.getElementById('login-button');
        if (currentUser) {
             // If user is already logged in, show profile modal
            console.log('User logged in, fetching profile data...');
             loginButton.disabled = true; // Prevent double clicks while fetching
             loginButton.textContent = 'Loading Profile...';
             try {
                 // Use the auth token to fetch profile and orders securely
                 const profileRes = await fetch('/api/user-profile', { // Assuming a dedicated profile endpoint
                    headers: { 'Authorization': `Bearer ${authToken}` }
                 });
                 const ordersRes = await fetch('/api/orders', { // Assuming order endpoint
                     headers: { 'Authorization': `Bearer ${authToken}` }
                 });

                 if (!profileRes.ok) {
                     // Handle expired token or other auth issues
                     if (profileRes.status === 401 || profileRes.status === 403) {
                         showToast('Your session has expired. Please log in again.', 'warning');
                         localStorage.removeItem('authToken'); // Clear bad token
                         currentUser = null;
                         authToken = null;
                         loginButton.textContent = 'Login';
                         document.getElementById('comment-form')?.classList.remove('user-logged-in');
                         updateFormValidation();
                         openModal('login-modal'); // Prompt re-login
                     } else {
                         throw new Error(`Profile fetch failed: Status ${profileRes.status}`);
                     }
                 } else {
                      const profileData = await profileRes.json();
                      const ordersData = ordersRes.ok ? await ordersRes.json() : [];
                      // Update local currentUser with potentially newer data from server
                      currentUser = { ...currentUser, ...profileData.user };
                      console.log('Profile and orders fetched successfully.');
                      showProfileModal(currentUser, ordersData);
                      loginButton.textContent = 'My Profile'; // Reset button text
                 }

             } catch (err) {
                console.error('Error fetching profile/orders:', err);
                showToast('Could not load your profile. Please try again later.', 'error');
                 loginButton.textContent = 'My Profile'; // Reset button text even on error
             } finally {
                  loginButton.disabled = false; // Re-enable button
             }

        } else {
            // If user is not logged in, open the login modal
            console.log('User not logged in, opening login modal.');
            // Reset login modal state before opening
             closeModal('login-modal'); // Use reset logic from closeModal
            openModal('login-modal');
        }
    });

    // Login Modal - Toggle Email/Phone Input Type
    document.querySelectorAll('input[name="login-contact-method"]').forEach(radio => {
        radio.addEventListener('change', e => {
            const contactInput = document.getElementById('login-contact-value');
            if (!contactInput) return;

            if (e.target.value === 'sms') {
                contactInput.type = 'tel';
                contactInput.placeholder = 'Enter US/Canada phone number';
                contactInput.pattern = '\\+?[1]?[-.\\s]?\\(?([0-9]{3})\\)?[-.\\s]?([0-9]{3})[-.\\s]?([0-9]{4})';
                contactInput.title = 'Enter a valid US or Canadian phone number';
                currentContactMethod = 'sms'; // Update state for login modal
            } else { // 'email'
                contactInput.type = 'email';
                contactInput.placeholder = 'Enter email address';
                contactInput.pattern = ''; // Remove pattern
                contactInput.title = '';
                currentContactMethod = 'email'; // Update state
            }
            contactInput.value = ''; // Clear input on toggle
            contactInput.focus();
        });
    });

    // Login Modal - Send OTP
    document.getElementById('login-send-otp-btn')?.addEventListener('click', async function() {
         const sendButton = this;
         // Determine method from radio button OR use state if radios aren't present
         const method = document.querySelector('input[name="login-contact-method"]:checked')?.value || currentContactMethod;
         const contactInput = document.getElementById('login-contact-value');
         const val = contactInput?.value.trim();

         if (!contactInput || !val) {
            showToast('Please enter your email or phone number.', 'warning');
             contactInput?.focus();
            return;
         }
          // Add validation
         if (method === 'email' && !validateEmail(val)) {
             showToast('Please enter a valid email address.', 'warning');
              contactInput.focus();
             return;
         }
          if (method === 'sms' && !/^\+?[1]?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(val)) {
             showToast('Please enter a valid US/Canada phone number.', 'warning');
              contactInput.focus();
             return;
          }

         sendButton.disabled = true;
         sendButton.textContent = 'Sending...';
         currentContactMethod = method; // Update state just in case

         try {
             const success = await sendOtp(method, val);
             if (success) {
                 document.getElementById('login-initial-section').style.display = 'none'; // Hide initial
                 const otpSection = document.getElementById('login-otp-section');
                 otpSection.style.display = 'block'; // Show OTP section
                  // Update message
                 const messageEl = otpSection.querySelector('.otp-sent-message');
                 if (messageEl) messageEl.textContent = `Code sent to ${val}.`;

                 document.getElementById('login-otp-code')?.focus(); // Focus OTP input
                 sendButton.textContent = 'Resend Code'; // Change button text
                 showToast('Verification code sent!', 'success');
             } else {
                 // sendOtp handles toast
                 sendButton.textContent = 'Send OTP'; // Reset text on failure
             }
         } catch(error) {
              console.error("Unexpected error sending login OTP:", error);
              showToast('An unexpected error occurred. Please try again.', 'error');
              sendButton.textContent = 'Send OTP';
         } finally {
               sendButton.disabled = false; // Re-enable button unless successful transition occurred
         }
    });


    // Login Modal - Verify OTP & Login
    document.getElementById('login-verify-otp-btn')?.addEventListener('click', async function() {
        const verifyButton = this;
        const contactInput = document.getElementById('login-contact-value');
        const otpCodeInput = document.getElementById('login-otp-code');
        // Use currentContactMethod state set during OTP send
        const method = currentContactMethod;
        const val = contactInput?.value.trim();
        const code = otpCodeInput?.value.trim();

        if (!val || !code || code.length < 4) {
            showToast('Please enter your contact info and the 4+ digit code.', 'warning');
             otpCodeInput?.focus();
            return;
        }

        verifyButton.disabled = true;
        verifyButton.textContent = 'Verifying & Logging In...';

        try {
            // Step 1: Verify the OTP
            const otpVerified = await verifyOtp(method, val, code);

            if (!otpVerified) {
                 // verifyOtp shows toast for incorrect code
                 otpCodeInput.value = '';
                 otpCodeInput.focus();
                 verifyButton.disabled = false;
                 verifyButton.textContent = 'Verify & Load Profile';
                 return; // Stop if OTP is wrong
            }

            // Step 2: OTP is correct, now log the user in (find/create user, generate token)
            console.log('OTP verified, attempting login...');
            const loginRes = await fetch('/api/login', { // Use a dedicated login endpoint
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contactMethod: method, contactValue: val })
            });

            if (!loginRes.ok) {
                 let errorMsg = `Login failed: Status ${loginRes.status}`;
                 try {
                      const errorData = await loginRes.json();
                      errorMsg = errorData.message || errorMsg;
                 } catch(e){/*ignore*/}
                 throw new Error(errorMsg);
            }

            const data = await loginRes.json();
             if (!data.token || !data.user) {
                  throw new Error('Login response missing token or user data.');
             }

            // Login successful! Update state and UI
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;

            document.getElementById('login-button').textContent = 'My Profile';
            document.getElementById('comment-form')?.classList.add('user-logged-in');
            updateFormValidation();
            closeModal('login-modal');
            showToast('Login successful!', 'success');

            // Show profile modal immediately after login
            showProfileModal(data.user, data.orders || []); // Use orders from login response if available


        } catch (error) {
            console.error('Login process error:', error);
            showToast(`Login Error: ${error.message}`, 'error');
             // Reset button state on any error
             verifyButton.disabled = false;
             verifyButton.textContent = 'Verify & Load Profile';
        }
         // No finally block needed here as button state is reset on error or success path closes modal
    });


    // Comments Section Logic

    // Submit Comment Form
    document.getElementById('comment-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const commentForm = e.target;
        const commentTextInput = document.getElementById('comment-text');
        const commentText = commentTextInput?.value.trim();

        if (!commentText) {
            showToast('Please enter your comment.', 'warning');
            commentTextInput?.focus();
            return;
        }

        const submitButton = commentForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton ? submitButton.textContent : 'Post Comment';
        if(submitButton) {
             submitButton.disabled = true;
             submitButton.textContent = 'Posting...';
        }


        if (currentUser && authToken) {
            // --- User is Logged In ---
            console.log('Posting comment as logged-in user:', currentUser.contactValue);
            try {
                const res = await fetch('/api/comments', {
                    method: 'POST',
                    headers: {
                         'Content-Type': 'application/json',
                         // Send auth token if required by backend
                         'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        // Send contact info even if logged in, backend can verify against token
                        contactMethod: currentUser.contactMethod,
                        contactValue: currentUser.contactValue,
                        text: commentText
                    })
                });

                if (!res.ok) {
                     let errorMsg = `Comment post failed: Status ${res.status}`;
                     try{ errorMsg = (await res.json()).message || errorMsg } catch(e){}
                     throw new Error(errorMsg);
                }

                const newComment = await res.json();
                 if (!newComment || !newComment.id) {
                      throw new Error('Comment response was invalid.');
                 }

                // Add comment to the top of the list visually
                const list = document.getElementById('comments-list');
                 displayComment(newComment, list); // Display immediately
                 // Prepend new comment for instant visibility at the top (optional)
                 // if (list.firstChild) {
                 //      list.insertBefore(commentDiv, list.firstChild);
                 // } else {
                 //      list.appendChild(commentDiv);
                 // }


                if(commentTextInput) commentTextInput.value = ''; // Clear input field
                showToast('Comment added successfully!', 'success');

            } catch (error) {
                console.error('Error posting comment (logged in):', error);
                showToast(`Failed to add comment: ${error.message}`, 'error');
            } finally {
                 if(submitButton){
                      submitButton.disabled = false;
                      submitButton.textContent = originalButtonText;
                 }
            }

        } else {
            // --- User is Not Logged In - Use Email + OTP ---
            const emailField = document.getElementById('comment-email');
            const email = emailField?.value.trim();

            if (!email || !validateEmail(email)) {
                showToast('Please enter a valid email address to post your comment.', 'warning');
                emailField?.focus();
                 if(submitButton){ // Re-enable button if validation fails
                      submitButton.disabled = false;
                      submitButton.textContent = originalButtonText;
                 }
                return;
            }

            console.log('Attempting anonymous comment post, sending OTP for email:', email);
            // Store comment data temporarily while verifying OTP
            pendingComment = { contactMethod: 'email', contactValue: email, text: commentText };

            try {
                const otpSent = await sendOtp('email', email);
                if (otpSent) {
                     closeModal('comment-otp-modal'); // Reset modal first
                     openModal('comment-otp-modal');
                      // Update message in OTP modal
                     const otpMessageEl = document.querySelector('#comment-otp-modal .otp-sent-message');
                     if (otpMessageEl) otpMessageEl.textContent = `Enter the code sent to ${email}.`;
                     document.getElementById('comment-otp-code')?.focus();
                     showToast('Verification code sent to your email.', 'info');
                } else {
                    // sendOtp shows toast
                     if(submitButton){
                          submitButton.disabled = false;
                          submitButton.textContent = originalButtonText;
                     }
                }
            } catch (error) {
                // Catch unexpected errors from sendOtp
                console.error("Unexpected error sending comment OTP:", error);
                 showToast('Failed to send verification code. Please try again.', 'error');
                 if(submitButton){
                      submitButton.disabled = false;
                      submitButton.textContent = originalButtonText;
                 }
            }
            // Note: Button state for the main comment form should be reset only after OTP modal interaction finishes or fails.
             // Let the OTP verification handler reset the main form button.
        }
    });


    // Verify Comment OTP & Post Comment
    document.getElementById('comment-verify-otp-btn')?.addEventListener('click', async function() {
        const verifyButton = this;
        const codeInput = document.getElementById('comment-otp-code');
        const code = codeInput?.value.trim();

        if (!code || code.length < 4) {
            showToast('Please enter the 4+ digit verification code.', 'warning');
             codeInput?.focus();
            return;
        }
        if (!pendingComment || !pendingComment.contactValue || !pendingComment.text) {
             console.error("Error: Missing pending comment data for OTP verification.");
             showToast("Cannot verify comment. Please try submitting again.", "error");
             closeModal('comment-otp-modal'); // Close broken modal state
             // Reset main comment form button
              const mainSubmitButton = document.querySelector('#comment-form button[type="submit"]');
              if(mainSubmitButton) {
                   mainSubmitButton.disabled = false;
                   mainSubmitButton.textContent = 'Post Comment';
              }
             return;
        }

        verifyButton.disabled = true;
        verifyButton.textContent = 'Verifying...';

        try {
             // Step 1: Verify OTP
             const otpVerified = await verifyOtp(pendingComment.contactMethod, pendingComment.contactValue, code);

             if (!otpVerified) {
                  codeInput.value = '';
                  codeInput.focus();
                  verifyButton.disabled = false;
                  verifyButton.textContent = 'Verify OTP';
                  // Do not close modal on incorrect OTP
                  return;
             }

             // Step 2: OTP Correct - Post the comment using pending data
             console.log('Comment OTP verified, posting comment...');
             verifyButton.textContent = 'Posting...'; // Update status

             const res = await fetch('/api/comments', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 // Send pending comment data (email + text)
                 body: JSON.stringify(pendingComment)
             });

             if (!res.ok) {
                  let errorMsg = `Comment post failed: Status ${res.status}`;
                  try{ errorMsg = (await res.json()).message || errorMsg } catch(e){}
                  throw new Error(errorMsg);
             }

             const newComment = await res.json();
              if (!newComment || !newComment.id) {
                   throw new Error('Comment response was invalid.');
              }

             // Success! Add comment, clear form, close modal
             const list = document.getElementById('comments-list');
             displayComment(newComment, list); // Display immediately

             // Clear main comment form fields
             document.getElementById('comment-email').value = '';
             document.getElementById('comment-text').value = '';
             closeModal('comment-otp-modal');
             showToast('Comment added successfully!', 'success');
             pendingComment = {}; // Clear pending data

             // Reset main comment form button
              const mainSubmitButton = document.querySelector('#comment-form button[type="submit"]');
              if(mainSubmitButton) {
                   mainSubmitButton.disabled = false;
                   mainSubmitButton.textContent = 'Post Comment';
              }


        } catch (error) {
            console.error('Error verifying comment OTP or posting:', error);
            showToast(`Error posting comment: ${error.message}`, 'error');
             // Reset verify button state on error
             verifyButton.disabled = false;
             verifyButton.textContent = 'Verify OTP';
             // Also reset main comment form button as the flow failed
              const mainSubmitButton = document.querySelector('#comment-form button[type="submit"]');
              if(mainSubmitButton) {
                   mainSubmitButton.disabled = false;
                   mainSubmitButton.textContent = 'Post Comment';
              }
        }
    });

    // Initial load of comments
    loadComments();

    // Campaign Nav Smooth Scroll & Active State
    const navLinks = document.querySelectorAll('.campaign-nav a');
    const navBar = document.querySelector('.campaign-nav');
    // Calculate offset considering potential fixed header height + some padding
    const scrollOffset = (navBar ? navBar.offsetHeight : 0) + 20; // Adjust 20 as needed

    navLinks.forEach(link => {
        link.addEventListener('click', e => {
        e.preventDefault();
        const targetId = e.target.getAttribute('href');
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
            const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - scrollOffset;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });

            // Update active state immediately on click
            navLinks.forEach(el => el.classList.remove('active'));
            e.target.classList.add('active');
        } else {
             console.warn(`Smooth scroll target not found: ${targetId}`);
        }
        });
    });

     // Optional: Add scroll listener to update active nav link based on scroll position
     // This is more complex, involving checking which section is currently in view.
     // Example (simplified):
     /*
     window.addEventListener('scroll', () => {
          let currentSectionId = '';
          navLinks.forEach(link => {
               const section = document.querySelector(link.getAttribute('href'));
               if (section) {
                    const rect = section.getBoundingClientRect();
                    // Check if section top is within viewport or slightly above
                    if (rect.top <= scrollOffset + 5 && rect.bottom >= scrollOffset + 5) {
                         currentSectionId = link.getAttribute('href');
                    }
               }
          });

          navLinks.forEach(link => {
               link.classList.toggle('active', link.getAttribute('href') === currentSectionId);
          });
     }, { passive: true }); // Use passive listener for performance
     */


    // Dynamic border effect for specific elements
    document.querySelectorAll('.campaign-content, .pricing-section, .option-card, .feature-item').forEach(el => { // Added feature-item
        el.addEventListener('mousemove', e => {
        const rect = el.getBoundingClientRect();
        // Calculate position relative to the element's top-left corner
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        el.style.setProperty('--mouse-x', `${x}px`);
        el.style.setProperty('--mouse-y', `${y}px`);
        });
        el.addEventListener('mouseleave', () => {
        // Move the effect off-screen on mouse leave
        el.style.setProperty('--mouse-x', '-200px');
        el.style.setProperty('--mouse-y', '-200px');
        });
    });


    // Card click accessibility & interaction
    document.querySelectorAll('.option-card').forEach(card => {
        // Make the card focusable
        card.setAttribute('tabindex', '0');
        card.style.cursor = 'pointer'; // Indicate it's clickable

        // Click listener for the whole card (if not clicking the button inside)
        card.addEventListener('click', e => {
            // Check if the click target is NOT the button or a link inside the card
            if (!e.target.closest('button, a')) {
                 // Find the primary button within the card and click it
                 const primaryButton = card.querySelector('.btn-deposit, .btn-buy, .btn'); // Look for specific or general btn class
                 primaryButton?.click(); // Trigger click on the button
            }
        });

        // Keyboard accessibility (Enter or Space)
        card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); // Prevent default space scroll
                // Find and click the primary button
                const primaryButton = card.querySelector('.btn-deposit, .btn-buy, .btn');
                 primaryButton?.click();
            }
        });
    });

    // Escape key to close the topmost open modal
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            // Find all visible modals
            const visibleModals = document.querySelectorAll('.modal:not(.hidden)');
            if (visibleModals.length > 0) {
                 // Get the last modal in the DOM order (likely the topmost)
                 const topModal = visibleModals[visibleModals.length - 1];
                 console.log(`Escape key pressed, closing modal: ${topModal.id}`);
                 closeModal(topModal.id);
            }
        }
    });

    // Phone Collection Modal Logic (after Google/Social Login)

    // Send OTP for Phone Collection
    document.getElementById('phone-send-otp-btn')?.addEventListener('click', async function() {
        const sendButton = this;
        const phoneInput = document.getElementById('google-user-phone'); // Ensure correct ID
        const phoneNumber = phoneInput?.value.trim();

        if (!phoneNumber || !/^\+?[1]?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(phoneNumber)) {
            showToast('Please enter a valid US/Canada phone number.', 'warning');
            phoneInput?.focus();
            return;
        }

        sendButton.disabled = true;
        sendButton.textContent = 'Sending Code...';
        currentContactMethod = 'sms'; // Set state for verification

        try {
             const success = await sendOtp('sms', phoneNumber);
             if (success) {
                 document.getElementById('phone-initial-section').style.display = 'none';
                 const otpSection = document.getElementById('phone-otp-section');
                 otpSection.style.display = 'block';
                  // Update message
                 const messageEl = otpSection.querySelector('.otp-sent-message');
                 if (messageEl) messageEl.textContent = `Code sent to ${phoneNumber}.`;

                 document.getElementById('phone-otp-code')?.focus();
                 sendButton.textContent = 'Resend Code'; // Allow resend
                 showToast('Verification code sent!', 'success');
             } else {
                 sendButton.textContent = 'Verify Phone Number'; // Reset text
             }
        } catch (error) {
             console.error("Unexpected error sending phone collection OTP:", error);
              showToast('An error occurred. Please try again.', 'error');
              sendButton.textContent = 'Verify Phone Number';
        } finally {
             sendButton.disabled = false; // Re-enable button
        }
    });

    // Verify OTP for Phone Collection & Update Profile
    document.getElementById('phone-verify-otp-btn')?.addEventListener('click', async function() {
        const verifyButton = this;
        const phoneInput = document.getElementById('google-user-phone');
        const codeInput = document.getElementById('phone-otp-code');
        const phoneNumber = phoneInput?.value.trim();
        const code = codeInput?.value.trim();

        if (!phoneNumber || !code || code.length < 4) {
            showToast('Please enter the phone number and the 4+ digit code.', 'warning');
             codeInput?.focus();
            return;
        }
         if (!currentUser || !authToken) {
              console.error("Cannot verify phone: User or auth token missing.");
              showToast("Verification failed. Please log in again.", "error");
              closeModal('phone-collection-modal');
              // Trigger full logout/re-login state?
              return;
         }

        verifyButton.disabled = true;
        verifyButton.textContent = 'Verifying...';

        try {
            // Step 1: Verify OTP
            const otpVerified = await verifyOtp('sms', phoneNumber, code);
             if (!otpVerified) {
                  codeInput.value = '';
                  codeInput.focus();
                  verifyButton.disabled = false;
                  verifyButton.textContent = 'Verify OTP';
                  return; // Stop if OTP incorrect
             }

             // Step 2: OTP Correct - Update user profile with the verified phone number
             console.log('Phone OTP verified, updating profile...');
             verifyButton.textContent = 'Updating Profile...';

             const updatedUser = await updateUserProfile(
                 currentUser.contactMethod, // Original primary contact method
                 currentUser.contactValue, // Original primary contact value
                 { phone: phoneNumber } // Info to update
             );

             if (updatedUser) {
                 // Success! Update local user state and close modal
                 currentUser = { ...currentUser, ...updatedUser }; // Merge updates
                 console.log('Profile updated with phone number:', currentUser);
                 closeModal('phone-collection-modal');
                 showToast('Phone number verified and added to your profile!', 'success');

                 // Optionally refresh profile modal if it was open or show it now
                 // Fetch fresh orders to show with updated profile
                  try {
                       const ordersRes = await fetch('/api/orders', { headers: { 'Authorization': `Bearer ${authToken}` } });
                       const orders = ordersRes.ok ? await ordersRes.json() : [];
                       showProfileModal(currentUser, orders);
                  } catch (orderError) {
                       console.error("Error fetching orders after phone update:", orderError);
                       showProfileModal(currentUser, []);
                  }

             } else {
                 // updateUserProfile might return null on failure
                 throw new Error('Failed to update profile on the server.');
             }

        } catch (error) {
            console.error('Phone verification/update error:', error);
            showToast(`Error verifying phone: ${error.message}`, 'error');
             verifyButton.disabled = false;
             verifyButton.textContent = 'Verify OTP';
        }
         // No finally block needed as state is handled in success/error paths
    });


    // Handle Checkout Success/Cancel Redirects

    const urlParams = new URLSearchParams(window.location.search);
    const successParam = urlParams.get('success');
    const canceledParam = urlParams.get('canceled');
    const sessionId = urlParams.get('session_id'); // Get Stripe session ID if present

    if (successParam === 'true') {
        console.log('Checkout success detected.');
        const pendingOrderString = localStorage.getItem('pendingOrder');
        let orderDetailsHtml = '<p>Your order details should appear here shortly.</p>'; // Default message

        if (pendingOrderString) {
             try {
                 const pendingOrder = JSON.parse(pendingOrderString);
                 console.log('Processing pending order from localStorage:', pendingOrder);

                 // Basic validation of pending order data
                 if (pendingOrder.amount && pendingOrder.shipping && pendingOrder.contactValue) {
                     orderDetailsHtml = `
                         <p><strong>Order ID:</strong> ${pendingOrder.id || 'Processing...'}</p>
                         <p><strong>Amount Paid:</strong> ${formatCurrency(pendingOrder.amount)}</p>
                         <p><strong>Contact:</strong> ${pendingOrder.contactValue}</p>
                         <p><strong>Shipping To:</strong><br>
                             ${pendingOrder.shipping.name ? pendingOrder.shipping.name + '<br>' : ''}
                             ${pendingOrder.shipping.address || ''}<br>
                             ${pendingOrder.shipping.city || ''}${pendingOrder.shipping.state ? ', ' + pendingOrder.shipping.state : ''} ${pendingOrder.shipping.zip || ''}<br>
                             ${pendingOrder.shipping.country || ''}
                         </p>
                         <p><strong>Date:</strong> ${new Date(pendingOrder.timestamp).toLocaleString()}</p>
                         ${sessionId ? `<p><small>Session ID: ${sessionId}</small></p>` : ''}
                     `;

                      // --- Update Purchased Spots ---
                     // Increment spots only for the full purchase, not deposit
                     if (pendingOrder.amount === discountedPrice || pendingOrder.amount === earlyBirdTotal) { // Check against full payment amounts
                         purchasedSpots++;
                         localStorage.setItem('purchasedSpots', purchasedSpots.toString());
                         console.log(`Incremented purchasedSpots to: ${purchasedSpots}`);
                         updateSpotsProgress(); // Update UI immediately
                     } else {
                          console.log('Order was a deposit or other amount, not incrementing spots.');
                     }

                     // --- Track Conversion ---
                      // Use email if available, fallback to other contact value if needed
                     const emailForTracking = pendingOrder.shipping.email || (pendingOrder.contactMethod === 'email' ? pendingOrder.contactValue : null);
                      if (emailForTracking) {
                           trackTwitterConversion(pendingOrder.amount, emailForTracking);
                      } else {
                           console.warn("Could not determine email for Twitter conversion tracking.");
                      }

                 } else {
                      console.warn("Pending order data from localStorage is incomplete.");
                       orderDetailsHtml = '<p>Could not load all order details from previous session.</p>';
                 }

             } catch (parseError) {
                 console.error('Error parsing pending order from localStorage:', parseError);
                  orderDetailsHtml = '<p>There was an issue retrieving your order details.</p>';
             } finally {
                 // Clear pending order regardless of success/failure in processing it
                 localStorage.removeItem('pendingOrder');
                 console.log('Removed pending order from localStorage.');
             }

        } else {
             console.warn("Checkout success detected, but no pending order found in localStorage.");
              orderDetailsHtml = '<p>Your order is confirmed, but details from the previous session were not found.</p>';
               // Maybe try fetching order details using session_id if available? Requires backend endpoint.
        }

        // Update and show the success modal
        const orderInfoDisplay = document.getElementById('order-info-display');
        if (orderInfoDisplay) {
             orderInfoDisplay.innerHTML = orderDetailsHtml;
        }
         // Update confirmation message with contact method if user is known
         const successDetailsP = document.querySelector('#order-success-details > p:nth-of-type(2)'); // Second paragraph
         if(successDetailsP && currentUser?.contactMethod){
              successDetailsP.innerHTML = `Your order has been confirmed. You should receive a confirmation message shortly via ${currentUser.contactMethod}.`;
         }

        openModal('order-success-modal');

        // Clean the URL parameters after processing
         if (window.history.replaceState) {
             const cleanUrl = window.location.pathname; // URL without query string
             window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
         }


    } else if (canceledParam === 'true') {
        console.log('Checkout canceled detected.');
        showToast('Your order was canceled. You can try again anytime.', 'warning', 5000);
        // Clear pending order if it exists from a canceled checkout
        localStorage.removeItem('pendingOrder');
         // Clean the URL parameters
          if (window.history.replaceState) {
             const cleanUrl = window.location.pathname;
             window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
          }
    }


    // Flash Sale Countdown Timer
    const flashSaleEndDate = new Date('2025-05-07T00:00:00Z'); // Set target date/time in UTC
    const countdownElements = {
        days: ['top-days', 'card-days'],
        hours: ['top-hours', 'card-hours'],
        minutes: ['top-minutes', 'card-minutes'],
        seconds: ['top-seconds', 'card-seconds']
    };
    const flashDealButton = document.getElementById('flash-deal-button'); // Cache button selector
    const flashDealContainers = document.querySelectorAll('.super-deal, .flash-sale-card'); // Select elements containing countdowns

    function updateCountdown() {
        const now = new Date();
        const diff = flashSaleEndDate - now;

        // Find all countdown value elements dynamically each time
         const allCountdownSpans = document.querySelectorAll('.countdown-value, .card-countdown-value');


        if (diff <= 0) {
            // Sale has ended
            allCountdownSpans.forEach(el => { el.textContent = '00'; });

            if (flashDealButton) {
                flashDealButton.textContent = 'Offer Expired';
                flashDealButton.disabled = true;
                 flashDealButton.style.opacity = '0.7';
                 flashDealButton.style.cursor = 'not-allowed';
            }
             // Add expired class to containers for styling
             flashDealContainers.forEach(c => c.classList.add('sale-expired'));

             // Clear the interval timer
             if (window.countdownIntervalId) {
                  clearInterval(window.countdownIntervalId);
             }
            return; // Stop updating
        }

        // Calculate time parts
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        // Format with leading zeros
        const format = (num) => num.toString().padStart(2, '0');

        // Update corresponding elements
        countdownElements.days.forEach(id => {
             const el = document.getElementById(id);
             if (el) el.textContent = format(days);
        });
         countdownElements.hours.forEach(id => {
             const el = document.getElementById(id);
             if (el) el.textContent = format(hours);
         });
         countdownElements.minutes.forEach(id => {
             const el = document.getElementById(id);
             if (el) el.textContent = format(minutes);
         });
         countdownElements.seconds.forEach(id => {
             const el = document.getElementById(id);
             if (el) el.textContent = format(seconds);
         });

         // Ensure containers don't have expired class if sale is active
          flashDealContainers.forEach(c => c.classList.remove('sale-expired'));
          // Ensure button is enabled
           if (flashDealButton) {
                flashDealButton.disabled = false;
                // Reset text if needed (e.g., if it was 'Offer Expired')
                 // flashDealButton.textContent = 'Get Flash Deal';
                flashDealButton.style.opacity = '';
                flashDealButton.style.cursor = '';
           }
    }

    // Initial call and interval setup
    if (document.querySelector('.countdown') || document.querySelector('.card-countdown')) { // Only run if countdown elements exist
        updateCountdown(); // Initial display
        window.countdownIntervalId = setInterval(updateCountdown, 1000); // Update every second
        console.log('Flash sale countdown initialized.');
    } else {
         console.log('Flash sale countdown elements not found, skipping initialization.');
    }


    // Email Capture Form (Mailchimp JSONP) Enhancement

    const mcForm = document.getElementById('mc-embedded-subscribe-form');
    if (mcForm) {
        mcForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent default form submission
            const emailInput = document.getElementById('mce-EMAIL');
            const submitButton = document.getElementById('mc-embedded-subscribe');
            const errorResponseDiv = document.getElementById('mce-error-response');
            const successResponseDiv = document.getElementById('mce-success-response');

             // Hide previous responses
             if(errorResponseDiv) errorResponseDiv.style.display = 'none';
             if(successResponseDiv) successResponseDiv.style.display = 'none';


            const emailValue = emailInput?.value.trim();

            if (!emailInput || !submitButton || !errorResponseDiv || !successResponseDiv) {
                 console.error("Mailchimp form elements missing (input, button, or response divs).");
                 return;
            }

            if (!emailValue || !validateEmail(emailValue)) {
                errorResponseDiv.textContent = 'Please enter a valid email address.';
                errorResponseDiv.style.display = 'block';
                emailInput.focus();
                return; // Stop submission
            }

            // Prepare for JSONP request
            let url = mcForm.getAttribute('action')?.replace('/post?', '/post-json?') || '';
             if (!url) {
                  console.error("Mailchimp form 'action' URL not found.");
                   errorResponseDiv.textContent = 'Form configuration error.';
                   errorResponseDiv.style.display = 'block';
                  return;
             }
             // Ensure JSONP callback parameter is present
             url += (url.includes('&c=') ? '' : '&c=?'); // Add callback param if missing


            const formData = new FormData(mcForm);
            const params = new URLSearchParams(formData).toString();
            const fullUrl = `${url}&${params}`; // Construct full URL

            const originalButtonText = submitButton.value || 'Subscribe'; // Use value for input[type=submit]
            submitButton.value = 'Subscribing...';
            submitButton.disabled = true;

            // Create a unique callback function name
            const callbackName = 'mailchimpCallback_' + Date.now();

            // Define the callback function globally
            window[callbackName] = function(response) {
                 console.log('Mailchimp response:', response);
                 // Re-enable button and restore text
                 submitButton.value = originalButtonText;
                 submitButton.disabled = false;

                 if (response.result === 'success') {
                    showToast('Thank you for subscribing!', 'success', 5000);
                    successResponseDiv.innerHTML = response.msg || 'Subscription successful!'; // Use message from MC if available
                    successResponseDiv.style.display = 'block';
                    emailInput.value = ''; // Clear input on success
                 } else {
                     // Attempt to parse error message, provide fallback
                     let errorMessage = 'An error occurred. Please try again.';
                     try {
                          // Mailchimp errors are often HTML within the 'msg' field
                          const tempDiv = document.createElement('div');
                          tempDiv.innerHTML = response.msg;
                           // Try to find a user-facing error message within the HTML
                          const errorLink = tempDiv.querySelector('a[href*="eepurl.com"]'); // Common pattern
                           errorMessage = errorLink ? errorLink.textContent : (tempDiv.textContent || errorMessage);
                     } catch(e) {
                           errorMessage = response.msg || errorMessage; // Fallback to raw msg
                     }
                      // Sanitize basic HTML from error message before display
                     errorMessage = errorMessage.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

                      showToast(`Subscription Error: ${errorMessage}`, 'error', 7000);
                      errorResponseDiv.innerHTML = `Error: ${errorMessage}`; // Display sanitized error
                      errorResponseDiv.style.display = 'block';
                 }

                 // Cleanup: Remove the script tag and the global callback function
                 document.getElementById(callbackName)?.remove(); // Remove script by ID
                 try { delete window[callbackName]; } catch(e) { window[callbackName] = undefined; }
            };

            // Create and append the JSONP script tag
            const script = document.createElement('script');
            script.id = callbackName; // Use unique ID for easy removal
            script.src = fullUrl.replace('c=?', `c=${callbackName}`); // Replace placeholder with actual callback name
            script.onerror = () => {
                 console.error("Failed to load Mailchimp JSONP script.");
                 showToast("Subscription request failed. Check network or try later.", "error");
                 errorResponseDiv.textContent = 'Could not connect to subscription service.';
                 errorResponseDiv.style.display = 'block';
                 // Cleanup on error
                 submitButton.value = originalButtonText;
                 submitButton.disabled = false;
                  try { delete window[callbackName]; } catch(e) { window[callbackName] = undefined; }
            };
            document.body.appendChild(script);

            // Optional: Google Analytics event tracking
            if (typeof gtag === 'function') {
                gtag('event', 'newsletter_signup', {
                    event_category: 'Engagement',
                    event_label: 'Footer Email Form' // Adjust label if needed
                });
            }
        });

        // Add focus/blur styling enhancement for the email input parent
        const emailInputForStyle = document.getElementById('mce-EMAIL');
        if (emailInputForStyle) {
            const parentDiv = emailInputForStyle.closest('div'); // Adjust selector if needed
            if (parentDiv) {
                 emailInputForStyle.addEventListener('focus', () => parentDiv.classList.add('focused'));
                 emailInputForStyle.addEventListener('blur', () => parentDiv.classList.remove('focused'));
            }
        }
         console.log('Mailchimp form enhancement setup complete.');
    } else {
         console.log('Mailchimp form not found, skipping enhancement setup.');
    }

    // Email validation helper function
    function validateEmail(email) {
        // More robust regex (RFC 5322 standard-ish)
        const re = new RegExp(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
        return re.test(String(email).toLowerCase());
    }

    console.log('DOMContentLoaded setup complete.');

}); // --- End of DOMContentLoaded ---

