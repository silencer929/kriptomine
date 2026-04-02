// deposit.js
console.log("Deposit page loaded at", new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));

const socket = io();
socket.on('connect', () => console.log('Socket connected'));
socket.on('disconnect', () => console.log('Socket disconnected'));
socket.on('connect_error', (err) => console.error('Socket error:', err));

let pollInterval = null;
let pollAttempts = 0;
const MAX_POLL_ATTEMPTS = 24; // ~2 minutes if interval=5000ms

// Validate token for API calls
function isTokenValid(token) {
  if (!token) {
    console.error("Token is null or undefined");
    return false;
  }
  const parts = token.split('.');
  console.log("Token parts:", token);
  if (parts.length !== 3) {
    console.error("Token does not have three parts (header.payload.signature):", token.substring(0, 10) + "...");
    return false;
  }
  try {
    const payload = JSON.parse(atob(parts[1]));
    console.log("Decoded token payload:", payload);
    return payload.username && typeof payload.is_admin === 'boolean';
  } catch (error) {
    console.error("Failed to decode token payload:", error.message);
    return false;
  }
}

function initializePage() {
  attachEventListeners();
  loadUserInfo();
}

function attachEventListeners() {
  const amountInput = document.getElementById('amount');
  const phoneInput = document.getElementById('phone');
  const continueBtn = document.getElementById('continue-btn');
  const amountError = document.getElementById('amount-error');
  const phoneError = document.getElementById('phone-error');

  if (!amountInput || !phoneInput || !continueBtn || !amountError || !phoneError) {
    console.error("DOM elements missing during attachEventListeners");
    showError("Initialization failed: DOM elements missing.");
    return;
  }

  amountInput.addEventListener('input', validateForm);
  phoneInput.addEventListener('input', validateForm);

  continueBtn.addEventListener('click', async () => {
    if (continueBtn.classList.contains('btn-loading')) return;
    await handleDeposit();
  });

  console.log("Event listeners attached for amount, phone and continue button.");
}

function validateForm() {
  const amountInput = document.getElementById('amount');
  const phoneInput = document.getElementById('phone');
  const continueBtn = document.getElementById('continue-btn');
  const amountError = document.getElementById('amount-error');
  const phoneError = document.getElementById('phone-error');

  const amount = parseFloat(amountInput.value);
  const phone = (phoneInput.value || '').trim();

  let valid = true;

  if (isNaN(amount) || amount < 10) {
    amountInput.classList.add('input-error');
    amountError.textContent = 'Please enter an amount of at least KES 300';
    amountError.classList.remove('hidden');
    valid = false;
  } else {
    amountInput.classList.remove('input-error');
    amountError.textContent = '';
    amountError.classList.add('hidden');
  }

  // basic phone validation: must be 10 digits starting with 07 or starts with +2547 or 2547
  const normalizedPhone = normalizePhoneForValidation(phone);
  if (!normalizedPhone) {
    phoneInput.classList.add('input-error');
    phoneError.textContent = 'Enter a valid phone (07XXXXXXXX or +2547XXXXXXXX)';
    phoneError.classList.remove('hidden');
    valid = false;
  } else {
    phoneInput.classList.remove('input-error');
    phoneError.textContent = '';
    phoneError.classList.add('hidden');
  }

  continueBtn.disabled = !valid;
}

function normalizePhoneForValidation(phoneRaw) {
  if (!phoneRaw) return null;
  let p = phoneRaw.replace(/\s+/g, '');
  // Accept formats: 07XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX
  if (/^07\d{8}$/.test(p)) return p;
  if (/^\+2547\d{8}$/.test(p)) return p;
  if (/^2547\d{8}$/.test(p)) return p;
  if (/^2541\d{8}$/.test(p)) return p;
  return null;
}

// Convert phone to format accepted by backend/PayHero (we'll send as +2547XXXXXXXX)
function formatPhoneForApi(phoneRaw) {
  let p = phoneRaw.replace(/\s+/g, '');
  if (/^07\d{8}$/.test(p)) return '+254' + p.slice(1);
  if (/^2547\d{8}$/.test(p)) return '+' + p;
  if (/^2541\d{8}$/.test(p)) return '+' + p;
  if (/^\+2547\d{8}$/.test(p)) return p;
  // fallback to raw
  return p;
}

async function loadUserInfo() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const phoneInput = document.getElementById('phone');

  if (!isTokenValid(token)) {
    console.warn('No token, username, or invalid token found in localStorage');
    alert('Session expired. Please log in again.');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/index.html';
    return;
  }

  try {
    const response = await fetch('/api/portfolio', {
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch user info`);
    }
    const userData = await response.json();
    document.getElementById('user-name').textContent = userData.username || 'User';
    document.getElementById('user-mobile').textContent = `Mobile: ${userData.mobile || 'Not set'}`;
    document.getElementById('avatar').textContent = (userData.username || 'U')[0].toUpperCase();
    localStorage.setItem('mobile', userData.mobile || '');
    // prefill phone input with stored mobile (prefer localStorage mobile)
    if (phoneInput) {
      phoneInput.value = userData.mobile || localStorage.getItem('mobile') || '';
    }
    // enable validation check after prefill
    validateForm();
  } catch (error) {
    console.error('Failed to load user info:', error.message);
    showError('Failed to load user info. Please log in again.');
    alert('Session expired. Please log in again.');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/index.html';
  }
}

async function getCsrfToken() {
  try {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include' // necessary so the cookie is included
    });
    if (!response.ok) throw new Error(`CSRF token fetch failed: ${response.status}`);
    const body = await response.json();
    return body.csrfToken;
  } catch (err) {
    console.error('Failed to fetch CSRF token:', err.message);
    return null;
  }
}

async function handleDeposit() {
  const amountInput = document.getElementById('amount');
  const phoneInput = document.getElementById('phone');
  const continueBtn = document.getElementById('continue-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');

  const amount = parseFloat(amountInput.value);
  const phoneRaw = (phoneInput.value || '').trim();
  const phoneForApi = formatPhoneForApi(phoneRaw);
  const token = localStorage.getItem('token');

  if (!token || !isTokenValid(token)) {
    alert('Session expired. Please log in again.');
    window.location.href = '/index.html';
    return;
  }
  if (isNaN(amount) || amount < 300) {
    showError('Please enter a valid amount (minimum KES 300)');
    return;
  }
  if (!normalizePhoneForValidation(phoneRaw)) {
    showError('Enter a valid phone (07XXX 0r 01xxx or +2547XxX 0r  +2541XXX)');
    return;
  }

  continueBtn.classList.add('btn-loading');
  btnText.textContent = 'Processing...';
  btnSpinner.classList.remove('hidden');
  continueBtn.disabled = true;
  clearStatus();

  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) throw new Error('CSRF token error');

    // call server deposit endpoint (server will call PayHero)
    const resp = await fetch('/api/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrfToken
      },
      credentials: 'include',
      body: JSON.stringify({ amount, phoneNumber: phoneForApi })
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      console.error('Deposit initiation failed:', data);
      showError(data.error || 'Failed to initiate payment. Please try again.');
      return;
    }

    // expected: { message, success, reference, checkoutRequestId }
    const reference = data.reference || data.checkoutRequestId || null;
    localStorage.setItem('lastDepositReference', reference || '');
    localStorage.setItem('depositAmount', amount);

    showStatus(`Payment initiated. Reference: ${reference || 'N/A'}. Waiting for confirmation...`);
    // Start polling as a fallback while socket awaits server-side callback
    startPollingReference(reference);

  } catch (err) {
    console.error('Error initiating deposit:', err.message);
    showError(`Failed to initiate payment: ${err.message}`);
  } finally {
    continueBtn.classList.remove('btn-loading');
    btnText.textContent = 'Pay with M-Pesa (PayHero)';
    btnSpinner.classList.add('hidden');
    continueBtn.disabled = false;
  }
}

function startPollingReference(reference) {
  stopPolling();
  pollAttempts = 0;
  if (!reference) {
    console.warn('No reference to poll for. Relying on socket events.');
    return;
  }
  pollInterval = setInterval(async () => {
    pollAttempts++;
    try {
      console.log(`Polling for transaction status (attempt ${pollAttempts}) reference=${reference}`);
      const token = localStorage.getItem('token');
      const csrfToken = await getCsrfToken(); // re-fetch csrf for each POST
      if (!csrfToken || !token || !isTokenValid(token)) {
        console.warn('Missing token, csrf, or invalid token while polling');
        stopPolling();
        return;
      }
      const resp = await fetch('/api/check-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ reference })
      });
      const result = await resp.json().catch(() => ({}));
      console.log('Poll result:', result);

      if (result.updated && (result.status === 'SUCCESS' || result.status === 'SUCCESS' || result.status === 'COMPLETED')) {
        showStatus('Deposit confirmed. Redirecting...');
        localStorage.removeItem('depositAmount');
        localStorage.removeItem('lastDepositReference');
        stopPolling();
        setTimeout(() => {
          window.location.href = '/trade.html';
        }, 900);
        return;
      } else if (result.updated && (result.status === 'FAILED' || result.status === 'FAILED' || result.status === 'REJECTED')) {
        showError('Deposit failed. Please try again or contact support.');
        stopPolling();
        return;
      } else {
        // still queued/pending — continue polling until attempts exhausted
        if (pollAttempts >= MAX_POLL_ATTEMPTS) {
          showError('Still waiting for payment confirmation. We will reconcile and update your account shortly.');
          stopPolling();
          return;
        }
      }
    } catch (err) {
      console.error('Polling error:', err.message);
      if (pollAttempts >= MAX_POLL_ATTEMPTS) {
        showError('Unable to confirm transaction status right now.');
        stopPolling();
      }
    }
  }, 5000);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

// Socket event for deposit updates from server
socket.on('deposit_update', (data) => {
  const myUser = localStorage.getItem('username');
  if (!myUser) return;
  if (data.username === myUser) {
    console.log('Socket deposit_update received:', data);
    const amount = data.amount != null ? Number(data.amount) : null;
    alert(amount ? `Deposit of KES ${amount.toFixed(2)} successful!` : 'Deposit successful!');
    localStorage.removeItem('depositAmount');
    localStorage.removeItem('lastDepositReference');
    stopPolling();
    window.location.href = '/trade.html';
  }
});

function showError(message) {
  const errorMessage = document.getElementById('error-message');
  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    errorMessage.classList.add('block');
  }
  // clear status if any
  clearStatus();
}

function showStatus(message) {
  const statusEl = document.getElementById('status-message');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.classList.remove('hidden');
    statusEl.classList.add('block', 'text-gray-300');
  }
  // hide any previous error
  const errorMessage = document.getElementById('error-message');
  if (errorMessage) {
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');
  }
}

function clearStatus() {
  const statusEl = document.getElementById('status-message');
  if (statusEl) {
    statusEl.textContent = '';
    statusEl.classList.add('hidden');
  }
}

function loadPage(page, event) {
  console.log('loadPage called for:', page, 'at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  const pages = {
    'portfolio': '/portfolio.html',
    'trade': '/trade.html',
    'history': '/history.html',
    'profits': '/profits.html',
    'referrals': '/referrals.html'
  };
  if (event) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
  }
  const targetPage = pages[page];
  if (targetPage && window.location.pathname !== targetPage) {
    window.location.href = targetPage;
  } else {
    console.error('Invalid page or already on page:', page);
  }
}

document.addEventListener('DOMContentLoaded', initializePage);
