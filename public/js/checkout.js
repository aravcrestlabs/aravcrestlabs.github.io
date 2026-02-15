// ========================================
// Razorpay Checkout Integration
// For GemCrest License Purchase
// ========================================

// Configuration - Update these values
const CONFIG = {
    serverUrl: window.GEMCREST_CONFIG?.serverUrl || 'PLACEHOLDER_SERVER_URL',
    razorpayKey: window.GEMCREST_CONFIG?.razorpayKey || 'PLACEHOLDER_RAZORPAY_KEY',
    amount: window.GEMCREST_CONFIG?.amount || 'PLACEHOLDER_AMOUNT',
    currency: 'INR',
    productName: 'GemCrest',
    productDescription: 'Lifetime License - Single Device'
};

// ----------------------------------------
// Initialize Checkout Form
// ----------------------------------------
function initCheckout() {
    const payBtn = document.getElementById('pay-btn');
    const purchaseForm = document.getElementById('purchase-form');
    const verifyBtn = document.getElementById('smart-action-btn');

    // Fetch dynamic price immediately
    fetchPrice();

    if (verifyBtn) {
        verifyBtn.addEventListener('click', handleVerifyClick);
    }

    // OTP Input Auto-verify
    const otpInput = document.getElementById('email-otp-input');
    if (otpInput) {
        otpInput.addEventListener('input', (e) => {
            if (e.target.value.length === 6) {
                verifyOtp(e.target.value);
            }
        });
    }

    if (!payBtn || !purchaseForm) return;

    payBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await handlePurchase();
    });
}

async function fetchPrice() {
    try {
        const res = await fetch(`${CONFIG.serverUrl}/get-settings`, { method: 'POST' });
        const data = await res.json();

        if (data && data.price) {
            CONFIG.amount = parseInt(data.price);

            // Format price (Paise -> Rupees)
            const rupees = (CONFIG.amount / 100).toLocaleString('en-IN');

            // Update UI - Purchase Page
            const priceValEl = document.getElementById('price-value');
            if (priceValEl) priceValEl.textContent = rupees;

            const heroBtn = document.getElementById('hero-price-btn');
            if (heroBtn) heroBtn.textContent = `Purchase for ₹${rupees}`;

            // Update UI - Home Page / Slashed Price
            const dynamicPriceEls = document.querySelectorAll('.dynamic-price');
            dynamicPriceEls.forEach(el => el.textContent = `₹${rupees}`);

            // Update pricing-original if needed (assuming double the price or similar, logic can be adjusted)
            const originalPriceEls = document.querySelectorAll('.pricing-original');
            originalPriceEls.forEach(el => {
                // Example: Show 20% more as original price
                const original = Math.round((CONFIG.amount / 100) * 1.75).toLocaleString('en-IN');
                el.textContent = `₹${original}`;
            });
        }
    } catch (err) {
        console.error('Failed to load price', err);
    }
}

// ----------------------------------------
// Verification Logic
// ----------------------------------------
let verificationState = {
    email: '',
    verified: false,
    otpSent: false
};

async function handleVerifyClick(e) {
    e.preventDefault();
    const btn = e.target;
    const emailInput = document.getElementById('customer-email');
    const container = document.getElementById('smart-container');
    const messageEl = document.getElementById('otp-message');

    const email = emailInput?.value?.trim();

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address.');
        return;
    }

    if (verificationState.verified) return;

    // Send OTP
    setButtonLoading(btn, true, 'Sending...');

    try {
        const res = await fetch(`${CONFIG.serverUrl}/send-purchase-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await res.json();

        if (data.success) {
            verificationState.email = email;
            verificationState.otpSent = true;

            // Update UI to OTP mode
            container.classList.add('otp-mode');
            btn.textContent = 'VERIFYING...'; // Will be hidden or used for manual submit if needed, but input auto-submits
            btn.style.display = 'none'; // Hide button, let user enter OTP

            if (messageEl) {
                messageEl.textContent = `OTP sent to ${email}`;
                messageEl.classList.remove('hidden');
                messageEl.style.color = 'var(--accent-color)';
            }

            document.getElementById('email-otp-input').focus();
        } else {
            showError(data.message || 'Failed to send OTP');
        }
    } catch (err) {
        console.error('OTP Error:', err);
        showError('Could not send OTP. Please try again.');
    } finally {
        if (!verificationState.otpSent) {
            setButtonLoading(btn, false, 'VERIFY');
        }
    }
}

async function verifyOtp(otp) {
    const container = document.getElementById('smart-container');
    const messageEl = document.getElementById('otp-message');
    const emailInput = document.getElementById('customer-email');

    try {
        const res = await fetch(`${CONFIG.serverUrl}/verify-purchase-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: verificationState.email, otp })
        });

        const data = await res.json();

        if (data.success) {
            verificationState.verified = true;
            container.classList.remove('otp-mode');
            container.classList.add('verified');

            if (messageEl) {
                messageEl.textContent = 'Email Verified Successfully';
                messageEl.style.color = '#28a745';
            }

            // disable email input
            emailInput.readOnly = true;
        } else {
            if (messageEl) {
                messageEl.textContent = 'Invalid OTP. Please try again.';
                messageEl.style.color = 'red';
            }
            // Reset OTP input
            document.getElementById('email-otp-input').value = '';
        }
    } catch (err) {
        console.error('Verify OTP Error:', err);
    }
}

// ----------------------------------------
// Handle Purchase Flow
// ----------------------------------------
async function handlePurchase() {
    const nameInput = document.getElementById('customer-name');
    const emailInput = document.getElementById('customer-email');
    const payBtn = document.getElementById('pay-btn');

    const name = nameInput?.value?.trim();
    const email = emailInput?.value?.trim();

    // Validation
    if (!name || !email) {
        showError('Please fill in all required fields.');
        return;
    }

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address.');
        return;
    }

    // Check verification if strictly required (optional based on UX)
    // if (!verificationState.verified) {
    //      showError('Please verify your email address first.');
    //      return;
    // }

    // Update button state
    setButtonLoading(payBtn, true);

    try {
        // Step 1: Create order on server
        const order = await createOrder();

        // Step 2: Open Razorpay checkout
        await openRazorpayCheckout(order, name, email);

    } catch (error) {
        console.error('Purchase error:', error);
        showError('Something went wrong. Please try again or contact support.');
        setButtonLoading(payBtn, false);
    }
}

// ----------------------------------------
// Create Order via Server
// ----------------------------------------
async function createOrder() {
    const response = await fetch(`${CONFIG.serverUrl}/create-order`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: CONFIG.amount
        })
    });

    if (!response.ok) {
        throw new Error('Failed to create order');
    }

    return await response.json();
}

// ----------------------------------------
// Open Razorpay Checkout
// ----------------------------------------
function openRazorpayCheckout(order, name, email) {
    return new Promise((resolve, reject) => {
        const options = {
            key: CONFIG.razorpayKey,
            amount: order.amount,
            currency: CONFIG.currency,
            name: 'AravCrestLabs',
            description: CONFIG.productDescription,
            image: 'assets/gemcrest-icon.svg',
            order_id: order.id,
            handler: async function (response) {
                // Payment successful - verify on server
                await handlePaymentSuccess(response, name, email);
                resolve(response);
            },
            prefill: {
                name: name,
                email: email
            },
            theme: {
                color: '#fbbf24'
            },
            modal: {
                ondismiss: function () {
                    setButtonLoading(document.getElementById('pay-btn'), false);
                    resolve(null);
                }
            }
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response) {
            showError('Payment failed. Please try again.');
            setButtonLoading(document.getElementById('pay-btn'), false);
            reject(response.error);
        });

        rzp.open();
    });
}

// ----------------------------------------
// Handle Payment Success
// ----------------------------------------
async function handlePaymentSuccess(response, name, email) {
    const payBtn = document.getElementById('pay-btn');
    const purchaseForm = document.getElementById('purchase-form');
    const successView = document.getElementById('success-view');
    const licenseCodeEl = document.getElementById('license-code');

    // Show success view (and hide request form/button)
    if (purchaseForm) purchaseForm.classList.add('hidden');
    const cta = document.querySelector('.pricing-cta');
    if (cta) cta.classList.add('hidden');
    if (successView) successView.classList.remove('hidden');

    try {
        // Verify payment on server
        const verifyRes = await fetch(`${CONFIG.serverUrl}/verify-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                name: name,
                email: email
            })
        });

        const data = await verifyRes.json();

        if (data.success) {
            // Display license code
            if (licenseCodeEl) {
                licenseCodeEl.textContent = data.code;
                licenseCodeEl.classList.add('scale-in');
            }

            // Show email warning if email failed
            if (data.emailError) {
                showEmailWarning();
            }
        } else {
            if (licenseCodeEl) {
                licenseCodeEl.textContent = 'ERROR - CONTACT SUPPORT';
            }
            showError('Verification failed. Please contact support with your payment ID: ' + response.razorpay_payment_id);
        }
    } catch (error) {
        console.error('Verification error:', error);
        if (licenseCodeEl) {
            licenseCodeEl.textContent = 'VERIFICATION ERROR';
        }
        showError('Could not verify payment. Please contact support.');
    }

    setButtonLoading(payBtn, false);
}

// ----------------------------------------
// Utility Functions
// ----------------------------------------

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function setButtonLoading(btn, isLoading, loadingText = 'Processing...') {
    if (!btn) return;

    if (isLoading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.textContent;
        btn.innerHTML = `<span class="spinner"></span> ${loadingText}`;
    } else {
        btn.disabled = false;
        btn.textContent = loadingText === 'Processing...' ? (btn.dataset.originalText || 'Buy Now') : loadingText;
    }
}

function showError(message) {
    // You can customize this to show a toast or modal
    const errorContainer = document.getElementById('error-message');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.classList.remove('hidden');
        setTimeout(() => errorContainer.classList.add('hidden'), 5000);
    } else {
        alert(message);
    }
}

function showEmailWarning() {
    const warningEl = document.createElement('p');
    warningEl.className = 'email-warning';
    warningEl.innerHTML = '⚠️ We couldn\'t email your license code. Please <strong>save it now</strong>.';
    document.getElementById('license-code')?.parentElement?.appendChild(warningEl);
}

// Copy license code to clipboard
function copyLicenseCode() {
    const codeEl = document.getElementById('license-code');
    if (!codeEl) return;

    navigator.clipboard.writeText(codeEl.textContent).then(() => {
        const copyBtn = document.getElementById('copy-btn');
        if (copyBtn) {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy', 2000);
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initCheckout);
