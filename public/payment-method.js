console.log("Payment Method page loaded at", new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
const socket = io({ withCredentials: true });
socket.on('connect', () => console.log('Socket connected'));
socket.on('disconnect', () => console.log('Socket disconnected'));
socket.on('connect_error', (err) => console.error('Socket error:', err));
function initializePage() {
  console.log("Initializing payment method page...");
  loadDepositAmount();
  loadUserInfo();
  attachEventListeners();
}
function loadDepositAmount() {
  const depositAmount = localStorage.getItem('depositAmount');
  const depositAmountElement = document.getElementById('deposit-amount');
  if (depositAmount && depositAmountElement) {
    depositAmountElement.textContent = `KES ${parseFloat(depositAmount).toFixed(2)}`;
    console.log('Deposit amount loaded:', depositAmount);
  } else {
    console.error('Deposit amount not found in localStorage or DOM element missing');
    showError('No deposit amount specified. Please start over.');
    document.getElementById('pay-btn').disabled = true;
  }
}
async function loadUserInfo() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  if (!token || !username) {
    console.warn('No token or username found in localStorage');
    alert('Session expired. Please log in again.');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('depositAmount');
    window.location.href = '/index.html';
    return;
  }
  try {
    const response = await fetch('/api/portfolio', {
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include'
    });
    console.log('Portfolio response:', { status: response.status, statusText: response.statusText });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch user info`);
    }
    const userData = await response.json();
    console.log('User data received:', userData);
    document.getElementById('user-name').textContent = userData.username || 'User';
    document.getElementById('user-mobile').textContent = `Mobile: ${userData.mobile || 'Not set'}`;
    document.getElementById('avatar').textContent = (userData.username || 'U')[0].toUpperCase();
    document.getElementById('phone-number').value = userData.mobile || '';
    validatePhoneNumber(document.getElementById('phone-number'));
  } catch (error) {
    console.error('Failed to load user info:', error.message);
    showError('Failed to load user info. Please log in again.');
    alert('Session expired. Please log in again.');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('depositAmount');
    window.location.href = '/index.html';
  }
}
function attachEventListeners() {
  const phoneInput = document.getElementById('phone-number');
  const payBtn = document.getElementById('pay-btn');
  const retryBtn = document.getElementById('retry-btn');
  const phoneError = document.getElementById('phone-error');
  if (!phoneInput || !payBtn || !retryBtn || !phoneError) {
    console.error("DOM elements missing:", { phoneInput, payBtn, retryBtn, phoneError });
    showError("Initialization failed: DOM elements missing.");
    return;
  }
  phoneInput.addEventListener('input', () => validatePhoneNumber(phoneInput));
  payBtn.addEventListener('click', async () => {
    if (payBtn.classList.contains('btn-loading')) return;
    await initiatePayment();
  });
  retryBtn.addEventListener('click', async () => {
    if (retryBtn.classList.contains('btn-loading')) return;
    await initiatePayment();
  });
  console.log("Event listeners attached for phone input, pay button, and retry button.");
}
function validatePhoneNumber(input) {
  const phoneError = document.getElementById('phone-error');
  const payBtn = document.getElementById('pay-btn');
  const phoneNumber = input.value.trim();
  const phoneRegex = /^2547\d{8}$/;
  if (!phoneRegex.test(phoneNumber)) {
    input.classList.add('input-error');
    phoneError.textContent = 'Please enter a valid Kenyan phone number (e.g., 2547xxxxxxxx)';
    phoneError.classList.remove('hidden');
    payBtn.disabled = true;
  } else {
    input.classList.remove('input-error');
    phoneError.textContent = '';
    phoneError.classList.add('hidden');
    payBtn.disabled = !localStorage.getItem('depositAmount');
  }
}
async function initiatePayment() {
  const phoneInput = document.getElementById('phone-number');
  const payBtn = document.getElementById('pay-btn');
  const retryBtn = document.getElementById('retry-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');
  const token = localStorage.getItem('token');
  const amount = parseFloat(localStorage.getItem('depositAmount'));
  if (!phoneInput || !payBtn || !retryBtn || !btnText || !btnSpinner) {
    console.error("DOM elements missing for payment initiation");
    showError("Initialization failed: DOM elements missing.");
    return;
  }
  if (!amount || isNaN(amount) || amount <= 0) {
    console.error("Invalid or missing deposit amount:", amount);
    showError("Invalid deposit amount. Please start over.");
    localStorage.removeItem('depositAmount');
    window.location.href = '/deposit.html';
    return;
  }
  const phoneNumber = phoneInput.value.trim();
  const phoneRegex = /^2547\d{8}$/;
  if (!phoneRegex.test(phoneNumber)) {
    console.error("Invalid phone number:", phoneNumber);
    showError("Please enter a valid Kenyan phone number (e.g., 2547xxxxxxxx)");
    return;
  }
  payBtn.classList.add('btn-loading');
  btnText.textContent = 'Initiating M-Pesa STK Push...';
  btnSpinner.classList.remove('hidden');
  payBtn.disabled = true;
  retryBtn.classList.add('hidden');
  try {
    const csrfResponse = await fetch('/api/csrf-token', {
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include'
    });
    console.log('CSRF response:', { status: csrfResponse.status, statusText: csrfResponse.statusText });
    if (!csrfResponse.ok) throw new Error(`Failed to fetch CSRF token: HTTP ${csrfResponse.status}`);
    const { csrfToken } = await csrfResponse.json();
    console.log('CSRF token fetched:', csrfToken);
    const response = await fetch('/api/deposit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ amount, phoneNumber }),
      credentials: 'include'
    });
    console.log('Deposit response:', { status: response.status, statusText: response.statusText, url: response.url });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}: ${data.details || 'Unknown error'}`);
    console.log('M-Pesa STK push initiated:', data);
    showError('M-Pesa STK push sent. Please check your phone and complete the payment.');
  } catch (error) {
    console.error('M-Pesa STK push failed:', error.message, error.stack);
    showError(`Payment failed: ${error.message}. Please try again or contact support.`);
    retryBtn.classList.remove('hidden');
    if (error.message.includes('401') || error.message.includes('403')) {
      alert('Invalid session. Please log in again.');
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('depositAmount');
      window.location.href = '/index.html';
    }
  } finally {
    payBtn.classList.remove('btn-loading');
    btnText.textContent = 'Initiate M-Pesa Payment';
    btnSpinner.classList.add('hidden');
    payBtn.disabled = !phoneRegex.test(phoneInput.value);
  }
}
function showError(message) {
  const errorMessage = document.getElementById('error-message');
  const errorDetails = document.getElementById('error-details');
  if (errorMessage && errorDetails) {
    errorMessage.textContent = message.includes('STK push sent') ? 'M-Pesa Payment Initiated' : 'Payment Error';
    errorDetails.textContent = message.includes('STK push sent')
      ? 'Please check your phone for the M-Pesa STK push and enter your PIN to complete the payment.'
      : `Error: ${message}. Please try again or contact support at support@novasoftwaves.com.`;
    errorMessage.classList.remove('hidden');
    errorDetails.classList.remove('hidden');
    console.error('Error displayed:', message);
  }
}
document.addEventListener('DOMContentLoaded', initializePage);
socket.on('deposit_update', (data) => {
  if (data.username === localStorage.getItem('username')) {
    console.log('Socket updated balance to:', data.newBalance);
    alert(`Deposit of KES ${data.amount.toFixed(2)} successful!`);
    localStorage.removeItem('depositAmount');
    window.location.href = '/trade.html';
  }
});
// Note: No changes made to this file for environment mismatch or STK Push logging,
// as these are handled server-side in server.js. The M-Pesa API URLs are set to
// https://api.safaricom.co.ke in server.js, and STK Push error logging is added
// there. This comment block ensures the line count matches the original file.