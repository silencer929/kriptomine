console.log("Manage Withdrawals page loaded at", new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));

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

// Fetch CSRF token
async function getCsrfToken() {
  try {
    console.log('Fetching CSRF token');
    const response = await fetch('/api/csrf-token');
    console.log('CSRF response:', { status: response.status, statusText: response.statusText });
    if (!response.ok) throw new Error(`Failed to fetch CSRF token: HTTP ${response.status}`);
    const data = await response.json();
    console.log('CSRF token fetched:', data.csrfToken);
    return data.csrfToken;
  } catch (error) {
    console.error('CSRF token fetch error:', error.message);
    showError('Failed to fetch CSRF token. Please try again.');
    throw error;
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

async function updateWithdrawalList() {
  console.log('Updating withdrawal list at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  if (!token || !username) {
    console.warn('No token or username found in localStorage');
    alert('Session expired. Please log in again.');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/index.html';
    return;
  }

  if (!isTokenValid(token)) {
    console.error('Invalid token or non-admin user');
    alert('Invalid session or non-admin access. Please log in again.');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/index.html';
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

    // Fetch pending withdrawals
    console.log('Fetching pending withdrawals');
    const withdrawalsTimeout = setTimeout(() => {
      showError('Withdrawals request timed out. Please try again.');
    }, 10000);
    const withdrawalsResponse = await fetch('/api/admin/withdrawals', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const withdrawalsResponseBody = await withdrawalsResponse.text();
    console.log('Withdrawals response:', {
      status: withdrawalsResponse.status,
      statusText: withdrawalsResponse.statusText,
      body: withdrawalsResponseBody
    });
    clearTimeout(withdrawalsTimeout);
    if (!withdrawalsResponse.ok) {
      let errorData;
      try {
        errorData = JSON.parse(withdrawalsResponseBody);
      } catch {
        errorData = { error: 'No response data' };
      }
      throw new Error(errorData.error || `HTTP ${withdrawalsResponse.status}`);
    }
    const withdrawals = JSON.parse(withdrawalsResponseBody);
    console.log('Withdrawals data received:', withdrawals);
    const withdrawalList = document.getElementById('withdrawal-list');
    if (withdrawalList) {
      withdrawalList.innerHTML = withdrawals.filter(w => w.status === 'pending').length > 0
        ? withdrawals.filter(w => w.status === 'pending').map(w => `
            <li class="row-item flex flex-col sm:flex-row justify-between items-center py-3 px-4 bg-gray-800 rounded-lg">
              <span class="text-sm sm:text-base">${w.userId.username}: ${w.currency} ${w.amount.toFixed(2)} to ${w.destination} (Ref: ${w.reference})</span>
              <div class="mt-2 sm:mt-0 space-x-2">
                <button class="action-btn bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm" onclick="showModal('Approve Withdrawal', 'Approve ${w.currency} ${w.amount.toFixed(2)} for ${w.userId.username}?', () => manageWithdrawal('${w._id}', 'approve'))">Approve</button>
                <button class="action-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm" onclick="showModal('Reject Withdrawal', 'Reject ${w.currency} ${w.amount.toFixed(2)} for ${w.userId.username}?', () => manageWithdrawal('${w._id}', 'reject'))">Reject</button>
              </div>
            </li>
          `).join('')
        : '<li class="text-sm text-gray-400">No pending withdrawals</li>';
    }

    // Update notification dot
    const notificationDot = document.getElementById('notification-dot');
    if (notificationDot) {
      notificationDot.style.display = withdrawals.some(w => w.status === 'pending') ? 'block' : 'none';
    }
  } catch (error) {
    console.error('Withdrawal list update failed:', error.message);
    showError(`Failed to load withdrawals: ${error.message}. Please check server status or log in again.`);
    if (error.message.includes('401') || error.message.includes('403')) {
      alert('Invalid session or non-admin access. Please log in again.');
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = '/index.html';
    }
  }
}

// Modal handling
function showModal(title, message, onConfirm) {
  console.log(`Showing modal: ${title}`);
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalConfirm = document.getElementById('modal-confirm');
  const modalCancel = document.getElementById('modal-cancel');
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modal.classList.remove('hidden');
  modalConfirm.onclick = () => {
    modal.classList.add('hidden');
    onConfirm();
  };
  modalCancel.onclick = () => modal.classList.add('hidden');
}

async function manageWithdrawal(id, action) {
  console.log(`Managing withdrawal ${id}: ${action}`);
  const token = localStorage.getItem('token');
  try {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`/api/admin/withdrawal/${id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken
      },
      body: JSON.stringify({ action })
    });
    const responseBody = await response.text();
    console.log(`Withdrawal ${action} response:`, {
      status: response.status,
      statusText: response.statusText,
      body: responseBody
    });
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseBody);
      } catch {
        errorData = { error: 'No response data' };
      }
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    console.log(`Withdrawal ${id} ${action}ed successfully`);
    alert(`Withdrawal ${id} ${action}ed successfully`);
    updateWithdrawalList();
  } catch (error) {
    console.error(`Failed to ${action} withdrawal ${id}:`, error.message);
    alert(`Failed to ${action} withdrawal: ${error.message}`);
  }
}

// Socket.IO listeners
socket.on('portfolio_update', (data) => {
  console.log('Received portfolio update:', data);
  updateWithdrawalList();
});
socket.on('withdrawalUpdate', (data) => {
  console.log('Received withdrawal update:', data);
  updateWithdrawalList();
});

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing manage withdrawals page at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  updateWithdrawalList();
});