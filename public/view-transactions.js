console.log("View Transactions page loaded at", new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));

const socket = io();

// Verify Socket.io connection
socket.on('connect', () => console.log('Socket connected'));
socket.on('disconnect', () => console.log('Socket disconnected'));
socket.on('connect_error', (err) => console.error('Socket error:', err));

// Validate token for API calls
function isTokenValid(token) {
  if (!token) {
    console.error("Token is null or undefined");
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error("Token does not have three parts (header.payload.signature):", token.substring(0, 10) + "...");
    return false;
  }
  try {
    const payload = JSON.parse(atob(parts[1]));
    console.log("Decoded token payload:", payload);
    return payload.username && typeof payload.is_admin === 'boolean' && payload.is_admin;
  } catch (error) {
    console.error("Failed to decode token payload:", error.message);
    return false;
  }
}

// Show error message
function showError(message) {
  const errorMessage = document.getElementById('error-message');
  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    console.error('Error displayed:', message);
  }
}

// Clear error message
function clearError() {
  const errorMessage = document.getElementById('error-message');
  if (errorMessage) {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
  }
}

async function updateTransactionList() {
  console.log('Updating transaction list at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  if (!token || !username) {
    console.warn('No token or username found in localStorage');
    alert('Session expired. Please log in again.');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/login.html';
    return;
  }

  if (!isTokenValid(token)) {
    console.error('Invalid token or non-admin user');
    alert('Invalid session or non-admin access. Please log in again.');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/login.html';
    return;
  }

  try {
    clearError();

    // Fetch user details
    console.log(`Fetching user data for ${username}`);
    const userTimeout = setTimeout(() => {
      showError('Portfolio request timed out. Please try again.');
    }, 10000);
    const userResponse = await fetch('/api/portfolio', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const userResponseBody = await userResponse.text();
    console.log('Portfolio response:', {
      status: userResponse.status,
      statusText: userResponse.statusText,
      body: userResponseBody
    });
    clearTimeout(userTimeout);
    if (!userResponse.ok) {
      let errorData;
      try {
        errorData = JSON.parse(userResponseBody);
      } catch {
        errorData = { error: 'No response data' };
      }
      throw new Error(errorData.error || `HTTP ${userResponse.status}`);
    }
    const userData = JSON.parse(userResponseBody);
    console.log('User data received:', userData);

    // Update user info in header
    const userName = document.getElementById('user-name');
    const userMobile = document.getElementById('user-mobile');
    const avatar = document.getElementById('avatar');
    if (userName) userName.textContent = userData.username || 'Admin';
    if (userMobile) userMobile.textContent = `Mobile: ${userData.mobile || 'Not set'}`;
    if (avatar) avatar.textContent = (userData.username || 'A')[0].toUpperCase();

    // Fetch all transactions
    console.log('Fetching all transactions');
    const transactionsTimeout = setTimeout(() => {
      showError('Transactions request timed out. Please try again.');
    }, 10000);
    const transactionsResponse = await fetch('/api/history', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const transactionsResponseBody = await transactionsResponse.text();
    console.log('Transactions response:', {
      status: transactionsResponse.status,
      statusText: transactionsResponse.statusText,
      body: transactionsResponseBody
    });
    clearTimeout(transactionsTimeout);
    if (!transactionsResponse.ok) {
      let errorData;
      try {
        errorData = JSON.parse(transactionsResponseBody);
      } catch {
        errorData = { error: 'No response data' };
      }
      throw new Error(errorData.error || `HTTP ${transactionsResponse.status}`);
    }
    const transactions = JSON.parse(transactionsResponseBody);
    console.log('Transactions data received:', transactions);
    const transactionList = document.getElementById('transaction-list');
    if (transactionList) {
      transactionList.innerHTML = transactions.length > 0
        ? transactions.map(t => `
            <li class="row-item flex flex-col sm:flex-row justify-between items-center py-3 px-4 bg-gray-800 rounded-lg">
              <span class="text-sm sm:text-base">${t.username || 'Unknown'}: ${t.currency} ${t.amount.toFixed(2)} (${t.reference || 'N/A'}) on ${new Date(t.date).toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}</span>
            </li>
          `).join('')
        : '<li class="text-sm text-gray-400">No transactions found</li>';
    }

    // Update notification dot
    const notificationDot = document.getElementById('notification-dot');
    if (notificationDot) {
      notificationDot.style.display = 'none'; // No notifications for transactions
    }
  } catch (error) {
    console.error('Transaction list update failed:', error.message);
    showError(`Failed to load transactions: ${error.message}. Please check server status or log in again.`);
    if (error.message.includes('401') || error.message.includes('403')) {
      alert('Invalid session or non-admin access. Please log in again.');
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = '/login.html';
    }
  }
}

// Socket.IO listeners
socket.on('portfolio_update', (data) => {
  console.log('Received portfolio update:', data);
  updateTransactionList();
});

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing view transactions page at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  setActiveNavItem();
  updateTransactionList();
});