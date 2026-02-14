// ========================================
// Razorpay Checkout Integration
// For GemCrest License Purchase
// ========================================

// Configuration - Update these values
const CONFIG = {
    // Public URL for Supabase Edge Function
    serverUrl: 'https://uigmdykavqllplgdxtxs.supabase.co/functions/v1/licensing',
    // Public Key ID (Safe to expose on frontend)
    razorpayKey: 'rzp_live_SG6a7nPhqywN2j',
    amount: 500000, // Default fallback, updated by fetchPrice
    currency: 'INR',
    productName: 'GemCrest',
    productDescription: 'Lifetime License - Single Device'
};

let isEmailVerified = false;

// ----------------------------------------
// Initialize Checkout Form
// ----------------------------------------
function initCheckout() {
    // Fetch dynamic price globally
    fetchPrice();

    const payBtn = document.getElementById('pay-btn');
    const purchaseForm = document.getElementById('purchase-form');

    if (!payBtn || !purchaseForm) return;

    payBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await handlePurchase();
    });

    // OTP Listeners
    const actionBtn = document.getElementById('smart-action-btn');
    if (actionBtn) {
        actionBtn.addEventListener('click', handleSmartAction);
    }
}

async function fetchPrice() {
    try {
        const res = await fetch(`${CONFIG.serverUrl}/get-settings`, { method: 'POST' });
        const data = await res.json();

        if (data && data.price) {
            CONFIG.amount = parseInt(data.price);

            // Format price (Paise -> Rupees)
            const rupees = (CONFIG.amount / 100).toLocaleString('en-IN');
            const originalPrice = (CONFIG.amount * 3 / 100).toLocaleString('en-IN'); // Fake original price (3x)

            // Update UI
            const priceValEl = document.getElementById('price-value'); // Fixed ID
            if (priceValEl) priceValEl.textContent = rupees;

            const heroBtn = document.getElementById('hero-price-btn');
            if (heroBtn) heroBtn.textContent = `Purchase for ₹${rupees}`;

            // Update original price (crossed out)
            const originalPriceEls = document.querySelectorAll('.pricing-original');
            originalPriceEls.forEach(el => el.textContent = `₹${originalPrice}`);

            // Update any other price tags
            const allPriceTags = document.querySelectorAll('.dynamic-price');
            allPriceTags.forEach(el => el.textContent = `₹${rupees}`);
        }
    } catch (err) {
        console.error('Failed to load price', err);
        // Fallback to default if fetch fails
        const rupees = (CONFIG.amount / 100).toLocaleString('en-IN');
        const priceValEl = document.getElementById('price-value'); // Fixed ID
        if (priceValEl) priceValEl.textContent = rupees;

        const heroBtn = document.getElementById('hero-price-btn');
        if (heroBtn) heroBtn.textContent = `Purchase for ₹${rupees}`;
    }
}

// ----------------------------------------
// OTP Flow
// ----------------------------------------

// State Machine for Smart Input
// 0: Initial (Show Verify)
// 1: OTP Sent (Show Confirm, Input transforms)
// 2: Verified (Show Check, Input Green)
let smartState = 0;

async function handleSmartAction() {
    if (smartState === 0) {
        await handleSendOTP();
    } else if (smartState === 1) {
        await handleVerifyOTP();
    }
}

async function handleSendOTP() {
    const emailInput = document.getElementById('customer-email');
    const nameInput = document.getElementById('customer-name');
    const actionBtn = document.getElementById('smart-action-btn');
    const container = document.getElementById('smart-container');

    const email = emailInput?.value?.trim();
    const name = nameInput?.value?.trim();

    if (!isValidEmail(email)) {
        showOTPMessage('Please enter a valid email first.', 'red');
        return;
    }

    setButtonLoading(actionBtn, true);

    try {
        const res = await fetch(`${CONFIG.serverUrl}/send-purchase-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name })
        });

        if (res.ok) {
            // TRANSITION TO OTP MODE
            smartState = 1;
            container.classList.add('otp-mode');

            showOTPMessage('OTP sent! Check your email.', 'green');

            actionBtn.textContent = 'CONFIRM';
            actionBtn.style.backgroundColor = 'var(--accent-color)';
            actionBtn.style.color = '#000';

            // Focus OTP input
            setTimeout(() => document.getElementById('email-otp-input').focus(), 300);
        } else {
            throw new Error('Failed to send OTP');
        }
    } catch (err) {
        console.error(err);
        showOTPMessage('Failed to send email. Try again.', 'red');
    } finally {
        setButtonLoading(actionBtn, false);
    }
}

async function handleVerifyOTP() {
    const emailInput = document.getElementById('customer-email');
    const otpInput = document.getElementById('email-otp-input'); // Updated ID
    const actionBtn = document.getElementById('smart-action-btn');
    const container = document.getElementById('smart-container');

    const email = emailInput?.value?.trim();
    const otp = otpInput?.value?.trim();

    if (!otp) {
        showOTPMessage('Please enter OTP.', 'red');
        return;
    }

    setButtonLoading(actionBtn, true);

    try {
        const res = await fetch(`${CONFIG.serverUrl}/verify-purchase-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });

        if (res.ok) {
            isEmailVerified = true;
            smartState = 2;

            // TRANSITION TO VERIFIED MODE
            container.classList.remove('otp-mode');
            container.classList.add('verified');

            showOTPMessage('', 'green'); // Clear message

            actionBtn.innerHTML = '✓';
            actionBtn.style.backgroundColor = '#28a745';
            actionBtn.style.color = '#fff';

            // Lock inputs
            emailInput.readOnly = true;
            otpInput.style.display = 'none'; // Hide OTP input explicitly

        } else {
            throw new Error('Invalid OTP');
        }
    } catch (err) {
        console.error(err);
        showOTPMessage('Invalid or Expired OTP.', 'red');
    } finally {
        if (smartState !== 2) {
            setButtonLoading(actionBtn, false);
        }
    }
}

function showOTPMessage(msg, color) {
    const el = document.getElementById('otp-message');
    if (!el) return;
    el.textContent = msg;
    el.style.color = color === 'green' ? '#155724' : '#721c24';
    el.style.background = color === 'green' ? '#d4edda' : '#f8d7da';
    el.style.border = `1px solid ${color === 'green' ? '#c3e6cb' : '#f5c6cb'}`;
    el.classList.remove('hidden');
    if (!msg) el.classList.add('hidden');
}

// ----------------------------------------
// Handle Purchase Flow
// ----------------------------------------
async function handlePurchase() {
    const nameInput = document.getElementById('customer-name');
    const emailInput = document.getElementById('customer-email');
    const payBtn = document.getElementById('pay-btn');

    const name = nameInput?.value?.trim().replace(/\b\w/g, l => l.toUpperCase());
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

    if (!isEmailVerified) {
        showError('Please verify your email address via OTP first.');
        return;
    }

    // Update button state
    setButtonLoading(payBtn, true);

    try {
        // Step 1: Create Order (Standard Flow)
        const order = await createOrder();

        // Step 2: Show QR UI Container (Fake embedded feel)
        showQRUI();

        // Step 3: Open Razorpay Checkout (Configured for QR)
        openRazorpayCheckout(order, name, email);

    } catch (error) {
        console.error('Purchase error:', error);
        showError('Something went wrong. Please try again or contact support.');
        resetUI();
        setButtonLoading(payBtn, false);
    }
}

// ----------------------------------------
// Create Order via Server
// ----------------------------------------
async function createOrder() {
    const response = await fetch(`${CONFIG.serverUrl}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: CONFIG.amount })
    });

    if (!response.ok) throw new Error('Failed to create order');
    return await response.json();
}

function showQRUI() {
    // We just show a loading state here because Razorpay opens an overlay
    const payBtn = document.getElementById('pay-btn');
    if (payBtn) {
        payBtn.textContent = 'OPENING CHECKOUT...';
        payBtn.disabled = true;
        payBtn.style.background = '#333';
        payBtn.style.cursor = 'default';
    }
}

function resetUI() {
    const payBtn = document.getElementById('pay-btn');
    if (payBtn) {
        setButtonLoading(payBtn, false);
    }
}

// ----------------------------------------
// Open Razorpay Checkout (UPI QR Mode)
// ----------------------------------------
function openRazorpayCheckout(order, name, email) {
    const options = {
        key: CONFIG.razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: CONFIG.productName,
        description: CONFIG.productDescription,
        order_id: order.id,
        handler: async function (response) {
            document.getElementById('pay-btn').textContent = 'VERIFYING...';
            await handlePaymentSuccess(response, name, email);
        },
        prefill: { name, email },
        theme: {
            color: "#ccff00"
        },
        modal: {
            ondismiss: function () {
                resetUI();
            }
        }
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function (response) {
        showError('Payment failed. Please try again.');
        resetUI();
    });
    rzp.open();
}

// ----------------------------------------
// Handle Payment Success
// ----------------------------------------
async function handlePaymentSuccess(response, name, email) {
    const purchaseForm = document.getElementById('purchase-form');
    const successView = document.getElementById('success-view');
    const licenseCodeEl = document.getElementById('license-code');
    const qrContainer = document.getElementById('qr-payment-container');

    if (qrContainer) qrContainer.style.display = 'none';
    if (purchaseForm) purchaseForm.classList.add('hidden');
    const cta = document.querySelector('.pricing-cta');
    if (cta) cta.classList.add('hidden');
    if (successView) successView.classList.remove('hidden');

    try {
        const verifyRes = await fetch(`${CONFIG.serverUrl}/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                name, email
            })
        });

        const data = await verifyRes.json();

        if (data.success) {
            if (licenseCodeEl) {
                licenseCodeEl.textContent = data.code;
                licenseCodeEl.classList.add('scale-in');
            }
        } else {
            if (licenseCodeEl) licenseCodeEl.textContent = 'CONTACT SUPPORT';
            showError('Verification failed. Payment ID: ' + response.razorpay_payment_id);
        }
    } catch (error) {
        console.error('Verification error:', error);
        if (licenseCodeEl) licenseCodeEl.textContent = 'VERIFICATION ERROR';
        showError('Could not verify payment. Please contact support.');
    }
}

// Utility Functions
// ----------------------------------------

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function setButtonLoading(btn, isLoading) {
    if (!btn) return;

    if (isLoading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.textContent;
        btn.innerHTML = '<span class="spinner"></span> Processing...';
    } else {
        btn.disabled = false;
        btn.textContent = btn.dataset.originalText || 'Buy Now';
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
