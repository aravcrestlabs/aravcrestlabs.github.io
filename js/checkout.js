// ========================================
// Razorpay Checkout Integration
// For GemCrest License Purchase
// ========================================

// Configuration - Update these values
const CONFIG = {
    serverUrl: 'https://uigmdykavqllplgdxtxs.supabase.co/functions/v1/licensing',
    razorpayKey: 'rzp_test_SCb9YzjstTsU4U', // Replace with live key for production
    amount: 500000, // Amount in paise (₹5,000)
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

    if (!payBtn || !purchaseForm) return;

    payBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await handlePurchase();
    });
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

    // Show success view
    if (purchaseForm) purchaseForm.classList.add('hidden');
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
