console.log("Manage Users page loaded at", new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));

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
    const response = await fetch('/api/csrf-token', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
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

async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Fetching ${url} (Attempt ${i + 1}/${retries})`);
      const response = await fetch(url, options);
      const responseBody = await response.text();
      console.log(`Response from ${url}:`, {
        status: response.status,
        statusText: response.statusText,
        body: responseBody
      });
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseBody);
        } catch {
          errorData = { error: `No response data (HTTP ${response.status})` };
        }
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      return { response, body: JSON.parse(responseBody) };
    } catch (error) {
      console.error(`Fetch attempt ${i + 1} failed for ${url}:`, error.message);
      if (i < retries - 1) {
        console.log(`Retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

async function updateUserList() {
  console.log('Updating user list at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
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
    const { response: userResponse, body: userData } = await fetchWithRetry('/api/portfolio', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    clearTimeout(userTimeout);
    console.log('User data received:', userData);
    // Update user info in header
    const userName = document.getElementById('user-name');
    const userMobile = document.getElementById('user-mobile');
    const avatar = document.getElementById('avatar');
    if (userName) userName.textContent = userData.username || 'Admin';
    if (userMobile) userMobile.textContent = `Mobile: ${userData.mobile || 'Not set'}`;
    if (avatar) avatar.textContent = (userData.username || 'A')[0].toUpperCase();
    // Fetch all users
    console.log('Fetching all users');
    const usersTimeout = setTimeout(() => {
      showError('Users request timed out. Please try again.');
    }, 10000);
    const { response: usersResponse, body: users } = await fetchWithRetry('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    clearTimeout(usersTimeout);
    console.log('Users data received:', users);
    const userList = document.getElementById('user-list');
    if (userList) {
      userList.innerHTML = users.length > 0
        ? users.map(user => `
            <li class="row-item flex flex-col sm:flex-row justify-between items-center py-3 px-4 bg-gray-800 rounded-lg">
              <span class="text-sm sm:text-base">${user.username}: KES ${user.balance.toFixed(2)} (Mobile: ${user.mobile || 'Not set'})</span>
              <div class="mt-2 sm:mt-0 space-x-2">
                <button class="action-btn bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm" onclick="showModal('Block User', 'Are you sure you want to block ${user.username}?', () => manageUser('${user.username}', 'block'))">Block</button>
                <button class="action-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm" onclick="showModal('Remove User', 'Are you sure you want to remove ${user.username}?', () => manageUser('${user.username}', 'remove'))">Remove</button>
              </div>
            </li>
          `).join('')
        : '<li class="text-sm text-gray-400">No users found</li>';
    } else {
      console.error('User list element not found');
      showError('Failed to update user list: DOM element missing');
    }
    // Update notification dot
    const notificationDot = document.getElementById('notification-dot');
    if (notificationDot) {
      notificationDot.style.display = 'none'; // Will be updated by manage-withdrawals.js
    }
  } catch (error) {
    console.error('User list update failed:', error.message);
    showError(`Failed to load users: ${error.message}. Please check server status or log in again.`);
    if (error.message.includes('401') || error.message.includes('403')) {
      alert('Invalid session or non-admin access. Please log in again.');
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = '/login.html';
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
  if (modal && modalTitle && modalMessage && modalConfirm && modalCancel) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.classList.remove('hidden');
    modalConfirm.onclick = () => {
      modal.classList.add('hidden');
      onConfirm();
    };
    modalCancel.onclick = () => modal.classList.add('hidden');
  } else {
    console.error('Modal elements not found');
  }
}

async function manageUser(username, action) {
  console.log(`Managing user ${username}: ${action}`);
  const token = localStorage.getItem('token');
  try {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`/api/admin/user/${username}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ action })
    });
    const responseBody = await response.text();
    console.log(`User ${action} response:`, {
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
    console.log(`User ${username} ${action}ed successfully`);
    alert(`User ${username} ${action}ed successfully`);
    updateUserList();
  } catch (error) {
    console.error(`Failed to ${action} user ${username}:`, error.message);
    alert(`Failed to ${action} user: ${error.message}`);
  }
}

// Socket.IO listeners
socket.on('portfolio_update', (data) => {
  console.log('Received portfolio update:', data);
  updateUserList();
});

socket.on('userUpdate', (data) => {
  console.log('Received user update:', data);
  updateUserList();
});

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing manage users page at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  updateUserList();
});