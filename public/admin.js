console.log("Admin page loaded at", new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));

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

async function updateAdminDashboard() {
  console.log('Starting updateAdminDashboard at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
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
    const responseBody = await userResponse.text(); // Read body once
    console.log('Portfolio response:', {
      status: userResponse.status,
      statusText: userResponse.statusText,
      body: responseBody
    });
    clearTimeout(userTimeout);
    if (!userResponse.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseBody);
      } catch {
        errorData = { error: 'No response data' };
      }
      throw new Error(errorData.error || `HTTP ${userResponse.status}`);
    }
    const userData = JSON.parse(responseBody); // Parse the stored body
    console.log('User data received:', userData);

    // Update user info in header
    const userName = document.getElementById('user-name');
    const userMobile = document.getElementById('user-mobile');
    const avatar = document.getElementById('avatar');
    if (userName) userName.textContent = userData.username || 'Admin';
    if (userMobile) userMobile.textContent = `Mobile: ${userData.mobile || 'Not set'}`;
    if (avatar) avatar.textContent = (userData.username || 'A')[0].toUpperCase();
  } catch (error) {
    console.error('Admin dashboard update failed:', error.message);
    showError(`Failed to load admin data: ${error.message}. Please check server status or log in again.`);
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

// Navigation functions
function navigateTo(url) {
  console.log(`Navigating to: ${url}`);
  if (window.location.pathname !== url) {
    window.location.href = url;
  } else {
    console.warn(`Already on page: ${url}`);
  }
}

// Attach button event listeners
function setupButtonListeners() {
  console.log('Setting up button listeners');
  const buttons = [
    { id: 'users-btn', url: '/manage-users.html' },
    { id: 'withdrawals-btn', url: '/manage-withdrawals.html' },
    { id: 'transactions-btn', url: '/view-transactions.html' }
  ];
  buttons.forEach(({ id, url }) => {
    const button = document.getElementById(id);
    if (button) {
      button.addEventListener('click', () => {
        console.log(`Button ${id} clicked, navigating to ${url}`);
        navigateTo(url);
      });
      console.log(`Event listener attached to ${id}`);
    } else {
      console.warn(`Button ${id} not found in DOM`);
    }
  });
}

// Socket.IO listeners
socket.on('portfolio_update', (data) => {
  console.log('Received portfolio update:', data);
  updateAdminDashboard();
});

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing admin page at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  updateAdminDashboard();
  setupButtonListeners();

  // Retry button listeners after a delay to handle slow DOM loading
  setTimeout(setupButtonListeners, 1000);
});