console.log(`Withdraw page loaded at ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}`);

function initializePage() {
  console.log("Initializing withdraw page...");
  updateBalance();
  attachEventListeners();
  setupSocketListeners();
}

function attachEventListeners() {
  const withdrawBtn = document.getElementById('withdraw-btn');
  const amountInput = document.getElementById('amount');
  const withdrawTab = document.getElementById('withdraw-tab');
  const historyTab = document.getElementById('history-tab');

  if (withdrawBtn) {
    withdrawBtn.addEventListener('click', processWithdrawal);
    console.log("Withdraw button event listener attached.");
  } else {
    console.error("Withdraw button (#withdraw-btn) not found!");
    showError("Withdraw button not found. Please refresh the page.");
  }

  if (amountInput) {
    amountInput.addEventListener('input', validateAmountInput);
    console.log("Amount input event listener attached.");
  }

  if (withdrawTab && historyTab) {
    withdrawTab.addEventListener('click', () => toggleTab(withdrawTab, historyTab));
    historyTab.addEventListener('click', () => toggleTab(historyTab, withdrawTab));
    withdrawTab.classList.add('active');
  }
}

function toggleTab(activeTab, inactiveTab) {
  activeTab.classList.add('active');
  inactiveTab.classList.remove('active');
}

function validateAmountInput(event) {
  const amount = parseFloat(event.target.value);
  const withdrawBtn = document.getElementById('withdraw-btn');
  if (isNaN(amount) || amount < 100) {
    withdrawBtn.disabled = true;
    withdrawBtn.style.opacity = '0.5';
    withdrawBtn.style.cursor = 'not-allowed';
  } else {
    withdrawBtn.disabled = false;
    withdrawBtn.style.opacity = '1';
    withdrawBtn.style.cursor = 'pointer';
  }
}

function isTokenPotentiallyValid(token) {
  if (!token) {
    console.error("Token is null or undefined");
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error("Token does not have three parts:", token.substring(0, 10) + "...");
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

function showError(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg';
  alertDiv.textContent = message;
  document.body.appendChild(alertDiv);
  setTimeout(() => alertDiv.remove(), 5000);
}

function showSuccess(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg';
  alertDiv.textContent = message;
  document.body.appendChild(alertDiv);
  setTimeout(() => alertDiv.remove(), 5000);
}

function setLoadingState(isLoading) {
  const withdrawBtn = document.getElementById('withdraw-btn');
  if (withdrawBtn) {
    withdrawBtn.disabled = isLoading;
    withdrawBtn.textContent = isLoading ? 'Processing...' : 'Withdraw Funds';
    withdrawBtn.style.opacity = isLoading ? '0.5' : '1';
    withdrawBtn.style.cursor = isLoading ? 'not-allowed' : 'pointer';
  }
}

async function updateBalance() {
  const balanceElement = document.getElementById('balance-amount');
  if (!balanceElement) {
    console.error("Balance element not found!");
    showError("Balance display not found. Please refresh the page.");
    return;
  }

  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  console.log("LocalStorage - token:", token ? token.substring(0, 10) + '...' : 'null', "username:", username || 'null');

  if (!token || !username) {
    console.error("Token or username missing");
    showError("Please log in to view your balance.");
    window.location.href = '/index.html';
    return;
  }

  if (!isTokenPotentiallyValid(token)) {
    console.error("Invalid token format");
    showError("Invalid session token. Please log in again.");
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/index.html';
    return;
  }

  try {
    console.log(`Fetching balance for user: ${username}`);
    const response = await fetch('/api/portfolio', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("API response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'No response data' }));
      console.error(`Portfolio fetch failed: ${response.status} ${response.statusText}`, errorData);
      if (response.status === 401) {
        showError("Session expired. Please log in again.");
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.href = '/index.html';
      } else {
        showError(`Failed to fetch balance: ${errorData.error || 'Unknown error'}`);
      }
      return;
    }

    const data = await response.json();
    if (typeof data.balance !== 'number') {
      console.error("Invalid balance data:", data);
      showError("Invalid balance data from server.");
      return;
    }

    balanceElement.textContent = `KES ${data.balance.toFixed(2)}`;
    console.log('Balance updated:', data.balance);
  } catch (error) {
    console.error('Fetch error:', error.message);
    showError('Error fetching balance. Please try again.');
  }
}

async function processWithdrawal() {
  console.log(`Withdraw clicked at ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}`);
  const amountInput = document.getElementById('amount');
  if (!amountInput) {
    console.error("Amount input not found!");
    showError("Amount input not found.");
    return;
  }

  const amount = parseFloat(amountInput.value);
  if (isNaN(amount) || amount < 100) {
    console.error(`Invalid amount: ${amountInput.value}`);
    showError('Please enter a valid amount (minimum KES 100).');
    return;
  }

  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  console.log("LocalStorage for withdrawal - token:", token ? token.substring(0, 10) + '...' : 'null', "username:", username || 'null');

  if (!token || !username) {
    console.error("Token or username missing");
    showError("Please log in to process a withdrawal.");
    window.location.href = '/index.html';
    return;
  }

  if (!isTokenPotentiallyValid(token)) {
    console.error("Invalid token format");
    showError("Invalid session token. Please log in again.");
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/index.html';
    return;
  }

  setLoadingState(true);
  try {
    console.log("Fetching CSRF token...");
    const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
    console.log("CSRF response status:", csrfResponse.status);

    if (!csrfResponse.ok) {
      console.error(`CSRF fetch failed: ${csrfResponse.status} ${csrfResponse.statusText}`);
      showError('Failed to fetch CSRF token.');
      setLoadingState(false);
      return;
    }

    const { csrfToken } = await csrfResponse.json();
    console.log(`Initiating withdrawal: ${amount} for ${username}`);
    const response = await fetch('/api/withdraw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'CSRF-Token': csrfToken
      },
      body: JSON.stringify({ amount })
    });
    console.log("Withdrawal API status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'No response data' }));
      console.error(`Withdrawal failed: ${response.status} ${response.statusText}`, errorData);
      if (response.status === 401) {
        showError("Session expired. Please log in again.");
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.href = '/index.html';
      } else {
        showError(`Withdrawal failed: ${errorData.error || 'Unknown error'}`);
      }
      setLoadingState(false);
      return;
    }

    const data = await response.json();
    showSuccess('Withdrawal request submitted successfully!');
    console.log('Withdrawal response:', data);
    updateBalance();
    amountInput.value = '';
    setLoadingState(false);
  } catch (error) {
    console.error('Withdrawal error:', error.message);
    showError('Error processing withdrawal. Please try again.');
    setLoadingState(false);
  }
}

function setupSocketListeners() {
  const socket = io({
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    console.log('Socket.IO connected');
  });

  socket.on('deposit_update', (data) => {
    if (data.username === localStorage.getItem('username')) {
      const balanceElement = document.getElementById('balance-amount');
      if (balanceElement) {
        balanceElement.textContent = `KES ${data.newBalance.toFixed(2)}`;
        console.log('Socket updated balance:', data.newBalance);
        showSuccess('Balance updated via deposit.');
      } else {
        console.error("Balance element not found for socket update!");
      }
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error.message);
    showError('Real-time updates unavailable. Please refresh the page.');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded, initializing withdraw page...");
  initializePage();
});