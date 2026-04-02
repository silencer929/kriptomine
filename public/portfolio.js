console.log("Portfolio page loaded at 12:25 PM EAT, August 17, 2025");
const socket = io();
// Verify Socket.io connection
socket.on('connect', () => console.log('Socket connected'));
socket.on('disconnect', () => console.log('Socket disconnected'));
socket.on('connect_error', (err) => console.error('Socket error:', err));
// Sample data for coin prices and percentages
const coinData = {
  'bitcoin': {
    price: 82643.46,
    change_24h: 9.82,
    '1H': Array.from({ length: 60 }, (_, i) => ({
      time: new Date(Date.now() - (60 - i) * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: 82643.46 + Math.sin(i / 10) * 300 + (i > 40 ? 300 : 0) - (i > 20 && i < 30 ? 300 : 0)
    })),
    '1D': Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.now() - (24 - i) * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: 82643.46 * (1 + (i / 24) * 0.01) + Math.random() * 200
    })),
    '1W': Array.from({ length: 7 }, (_, i) => ({
      time: new Date(Date.now() - (7 - i) * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      price: 82643.46 * (1 - 0.0459 + (i / 7) * 0.0459) + Math.random() * 500
    })),
    '1M': Array.from({ length: 30 }, (_, i) => ({
      time: new Date(Date.now() - (30 - i) * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      price: 82643.46 * (1 - 0.10 + (i / 30) * 0.10) + Math.random() * 1000
    })),
    '1Y': Array.from({ length: 12 }, (_, i) => ({
      time: new Date(Date.now() - (12 - i) * 30 * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', year: '2-digit' }),
      price: 60000 * (1 + (i / 12)) + Math.random() * 5000
    }))
  },
  'ethereum': {
    price: 4604.9,
    change_24h: 9.11,
    '1H': Array.from({ length: 60 }, (_, i) => ({
      time: new Date(Date.now() - (60 - i) * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: 4604.9 + Math.sin(i / 10) * 20 + (i > 40 ? 20 : 0)
    })),
    '1D': Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.now() - (24 - i) * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: 4604.9 * (1 + (i / 24) * 0.0785) + Math.random() * 50
    })),
    '1W': Array.from({ length: 7 }, (_, i) => ({
      time: new Date(Date.now() - (7 - i) * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      price: 4604.9 * (1 - 0.1725 + (i / 7) * 0.1725) + Math.random() * 100
    })),
    '1M': Array.from({ length: 30 }, (_, i) => ({
      time: new Date(Date.now() - (30 - i) * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      price: 4604.9 * (1 - 0.20 + (i / 30) * 0.20) + Math.random() * 200
    })),
    '1Y': Array.from({ length: 12 }, (_, i) => ({
      time: new Date(Date.now() - (12 - i) * 30 * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', year: '2-digit' }),
      price: 2800 * (1 + (i / 12) * 0.5) + Math.random() * 300
    }))
  },
  'ripple': {
    price: 0.63,
    change_24h: 8.81,
    '1H': Array.from({ length: 60 }, (_, i) => ({
      time: new Date(Date.now() - (60 - i) * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: 0.63 + Math.sin(i / 10) * 0.005 + (i > 40 ? 0.005 : 0)
    })),
    '1D': Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.now() - (24 - i) * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: 0.63 * (1 + (i / 24) * 0.0815) + Math.random() * 0.01
    })),
    '1W': Array.from({ length: 7 }, (_, i) => ({
      time: new Date(Date.now() - (7 - i) * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      price: 0.63 * (1 - 0.0618 + (i / 7) * 0.0618) + Math.random() * 0.02
    })),
    '1M': Array.from({ length: 30 }, (_, i) => ({
      time: new Date(Date.now() - (30 - i) * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      price: 0.63 * (1 - 0.30 + (i / 30) * 0.30) + Math.random() * 0.05
    })),
    '1Y': Array.from({ length: 12 }, (_, i) => ({
      time: new Date(Date.now() - (12 - i) * 30 * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', year: '2-digit' }),
      price: 0.58 * (1 + (i / 12) * 0.1) + Math.random() * 0.1
    }))
  },
  'litecoin': {
    price: 97.82,
    change_24h: 9.74,
    '1H': Array.from({ length: 60 }, (_, i) => ({
      time: new Date(Date.now() - (60 - i) * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: 97.82 + Math.sin(i / 10) * 0.5
    })),
    '1D': Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.now() - (24 - i) * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: 97.82 * (1 + (i / 24) * 0.0934) + Math.random() * 1
    })),
    '1W': Array.from({ length: 7 }, (_, i) => ({
      time: new Date(Date.now() - (7 - i) * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      price: 97.82 * (1 - 0.0722 + (i / 7) * 0.0722) + Math.random() * 2
    })),
    '1M': Array.from({ length: 30 }, (_, i) => ({
      time: new Date(Date.now() - (30 - i) * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      price: 97.82 * (1 - 0.15 + (i / 30) * 0.15) + Math.random() * 3
    })),
    '1Y': Array.from({ length: 12 }, (_, i) => ({
      time: new Date(Date.now() - (12 - i) * 30 * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', year: '2-digit' }),
      price: 83 * (1 + (i / 12) * 0.2) + Math.random() * 5
    }))
  },
  'dogecoin': {
    price: 0.14,
    change_24h: 7.53,
    '1H': Array.from({ length: 60 }, (_, i) => ({
      time: new Date(Date.now() - (60 - i) * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: 0.14 + Math.sin(i / 10) * 0.001
    })),
    '1D': Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.now() - (24 - i) * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: 0.14 * (1 + (i / 24) * 0.1077) + Math.random() * 0.005
    })),
    '1W': Array.from({ length: 7 }, (_, i) => ({
      time: new Date(Date.now() - (7 - i) * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      price: 0.14 * (1 - 0.1209 + (i / 7) * 0.1209) + Math.random() * 0.01
    })),
    '1M': Array.from({ length: 30 }, (_, i) => ({
      time: new Date(Date.now() - (30 - i) * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      price: 0.14 * (1 - 0.20 + (i / 30) * 0.20) + Math.random() * 0.02
    })),
    '1Y': Array.from({ length: 12 }, (_, i) => ({
      time: new Date(Date.now() - (12 - i) * 30 * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', year: '2-digit' }),
      price: 0.14 * (1 + (i / 12) * 0.1) + Math.random() * 0.03
    }))
  },
  'tether': {
    price: 1.17,
    change_24h: 6.68,
    '1H': Array.from({ length: 60 }, (_, i) => ({
      time: new Date(Date.now() - (60 - i) * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: 1.17 + Math.random() * 0.001 - 0.0005
    })),
    '1D': Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.now() - (24 - i) * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: 1.17 + Math.random() * 0.002 - 0.001
    })),
    '1W': Array.from({ length: 7 }, (_, i) => ({
      time: new Date(Date.now() - (7 - i) * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      price: 1.17 + Math.random() * 0.003 - 0.0015
    })),
    '1M': Array.from({ length: 30 }, (_, i) => ({
      time: new Date(Date.now() - (30 - i) * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      price: 1.17 + Math.random() * 0.004 - 0.002
    })),
    '1Y': Array.from({ length: 12 }, (_, i) => ({
      time: new Date(Date.now() - (12 - i) * 30 * 24 * 3600 * 1000).toLocaleDateString([], { month: 'short', year: '2-digit' }),
      price: 1.17 + Math.random() * 0.005 - 0.0025
    }))
  }
};
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
    return payload.username && typeof payload.is_admin === 'boolean';
  } catch (error) {
    console.error("Failed to decode token payload:", error.message, error.stack);
    return false;
  }
}
async function updateUserDetails() {
  console.log('Updating user details at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
 
  // Check for token and username
  if (!token || !username) {
    console.warn('No token or username found in localStorage, redirecting to login');
    alert('Session expired. Please log in again.');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/index.html';
    return;
  }
  // Validate token
  if (!isTokenValid(token)) {
    console.error('Invalid token format, redirecting to login');
    alert('Invalid session token. Please log in again.');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/index.html';
    return;
  }
  try {
    console.log(`Fetching portfolio data for user: ${username}`);
    const response = await fetch('/api/portfolio', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    // Check response status
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'No response data' }));
      console.error(`Portfolio fetch failed with status: ${response.status} ${response.statusText}`, errorData);
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('Portfolio data received:', data);
    // Validate response data
    if (!data || typeof data !== 'object') {
      console.error('Invalid portfolio data: Response is not an object', data);
      throw new Error('Invalid portfolio data: Response is not an object');
    }
    // DOM elements
    const userName = document.getElementById('user-name');
    const userMobile = document.getElementById('user-mobile');
    const avatar = document.getElementById('avatar');
    const portfolioBalance = document.getElementById('portfolio-balance');
    const adminNav = document.getElementById('admin-nav');
    const adminSection = document.getElementById('admin-section');
    // Update user name
    if (userName) {
      userName.textContent = data.username || username || 'User';
      console.log('User name updated to:', userName.textContent);
    } else {
      console.error('User name element (#user-name) not found');
    }
    // Update mobile
    if (userMobile) {
      userMobile.textContent = `Mobile: ${data.mobile || 'Not set'}`;
      console.log('Mobile updated to:', userMobile.textContent);
      if (!data.mobile) {
        console.warn('Mobile number not set in response');
        alert('Your mobile number is not set. Please update your profile.');
      }
    } else {
      console.error('User mobile element (#user-mobile) not found');
    }
    // Update avatar
    if (avatar) {
      avatar.textContent = (data.username || username || 'U')[0].toUpperCase();
      console.log('Avatar updated to:', avatar.textContent);
    } else {
      console.error('Avatar element (#avatar) not found');
    }
    // Update balance
    if (portfolioBalance) {
      const balance = typeof data.balance === 'number' ? data.balance : parseFloat(data.balance);
      if (isNaN(balance)) {
        console.error('Invalid balance data:', data.balance);
        throw new Error('Invalid balance data');
      }
      portfolioBalance.textContent = balance.toFixed(2);
      console.log('Balance updated to:', portfolioBalance.textContent);
    } else {
      console.error('Portfolio balance element (#portfolio-balance) not found');
    }
    // Update admin navigation and section
    if (adminNav) {
      if (typeof data.is_admin === 'boolean' && data.is_admin) {
        adminNav.classList.remove('hidden');
        console.log('Admin navigation button displayed for user:', username, 'is_admin:', data.is_admin);
      } else {
        adminNav.classList.add('hidden');
        console.log('Admin navigation button hidden, is_admin:', data.is_admin);
      }
    } else {
      console.error('Admin navigation element (#admin-nav) not found');
    }

    if (adminSection && typeof data.is_admin === 'boolean' && data.is_admin) {
      adminSection.classList.remove('hidden');
      console.log('Admin section displayed');
      try {
        const adminResponse = await fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!adminResponse.ok) throw new Error(`Admin fetch failed: HTTP ${adminResponse.status}`);
        const adminData = await adminResponse.json();
        const userList = document.getElementById('user-list');
        if (userList) {
          userList.innerHTML = adminData.map(u => `<li>${u.username}: KES ${u.balance.toFixed(2)} (Mobile: ${u.mobile})</li>`).join('');
          console.log('Admin user list updated');
        }
      } catch (adminError) {
        console.error('Admin section update failed:', adminError.message);
      }
    } else if (adminSection) {
      adminSection.classList.add('hidden');
      console.log('Admin section hidden, is_admin:', data.is_admin);
    } else {
      console.error('Admin section element (#admin-section) not found');
    }
    // Update portfolio (if applicable)
    if (data.portfolio) {
      const coins = ['btc', 'eth', 'xrp', 'ltc', 'doge', 'usdt'];
      coins.forEach(symbol => {
        const valueElement = document.getElementById(`${symbol}-value`);
        if (valueElement) {
          const amount = data.portfolio[symbol] || 0;
          valueElement.textContent = `${amount.toFixed(4)} ${symbol.toUpperCase()}`;
          console.log(`Updated ${symbol} value to: ${valueElement.textContent}`);
        }
      });
    } else {
      console.warn('No portfolio data in response');
    }
  } catch (error) {
    console.error('Portfolio update failed:', error.message);
    alert(`Failed to load portfolio data: ${error.message}. Please log in again or check server status.`);
    // Reset UI elements on error
    const userName = document.getElementById('user-name');
    const userMobile = document.getElementById('user-mobile');
    const avatar = document.getElementById('avatar');
    const portfolioBalance = document.getElementById('portfolio-balance');
    const adminNav = document.getElementById('admin-nav');
    const adminSection = document.getElementById('admin-section');
    if (userName) userName.textContent = 'User';
    if (userMobile) userMobile.textContent = 'Mobile: Not set';
    if (avatar) avatar.textContent = 'U';
    if (portfolioBalance) portfolioBalance.textContent = '0.00';
    if (adminNav) {
      adminNav.classList.add('hidden');
      console.log('Admin navigation button hidden due to error');
    }
    if (adminSection) {
      adminSection.classList.add('hidden');
      console.log('Admin section hidden due to error');
    }
    if (error.message.includes('401')) {
      console.warn('Unauthorized access, redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = '/index.html';
    }
  }
}
// Update coin prices and percentages
async function updateCoinPrices() {
  console.log('Updating coin prices at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  const coins = [
    { id: 'bitcoin', symbol: 'btc', trendId: 'bitcoin' },
    { id: 'ethereum', symbol: 'eth', trendId: 'ethereum' },
    { id: 'ripple', symbol: 'xrp', trendId: 'ripple' },
    { id: 'litecoin', symbol: 'ltc', trendId: 'litecoin' },
    { id: 'dogecoin', symbol: 'doge', trendId: 'dogecoin' },
    { id: 'tether', symbol: 'usdt', trendId: 'tether' }
  ];
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coins.map(c => c.id).join(',')}&vs_currencies=usd&include_24hr_change=true`);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json();
    coins.forEach(({ id, symbol, trendId }) => {
      const price = data[id].usd;
      const change = data[id].usd_24h_change.toFixed(2);
      const trendPriceElement = document.getElementById(`${trendId}-price`);
      const trendPercentageElement = document.getElementById(`${trendId}-trend`);
      if (trendPriceElement) trendPriceElement.textContent = `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (trendPercentageElement) {
        trendPercentageElement.innerHTML = `<span class="arrow"></span>${change > 0 ? '+' : ''}${change}%`;
        trendPercentageElement.classList.toggle('text-green-500', change > 0);
        trendPercentageElement.classList.toggle('text-red-500', change <= 0);
      }
      coinData[id].price = price;
      coinData[id].change_24h = parseFloat(change);
      console.log(`Updated ${id}: $${price}, ${change}%`);
    });
  } catch (error) {
    console.warn('Failed to fetch coin prices, using sample data:', error);
    coins.forEach(({ id, symbol, trendId }) => {
      const price = coinData[id].price;
      const change = coinData[id].change_24h.toFixed(2);
      const trendPriceElement = document.getElementById(`${trendId}-price`);
      const trendPercentageElement = document.getElementById(`${trendId}-trend`);
      if (trendPriceElement) trendPriceElement.textContent = `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (trendPercentageElement) {
        trendPercentageElement.innerHTML = `<span class="arrow"></span>${change > 0 ? '+' : ''}${change}%`;
        trendPercentageElement.classList.toggle('text-green-500', change > 0);
        trendPercentageElement.classList.toggle('text-red-500', change <= 0);
      }
      console.log(`Fallback updated ${id}: $${price}, ${change}%`);
    });
  }
}
function updateCoinPercentages() {
  console.log('Updating coin percentages at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  const coins = [
    { id: 'bitcoin', symbol: 'btc', trendId: 'bitcoin' },
    { id: 'ethereum', symbol: 'eth', trendId: 'ethereum' },
    { id: 'ripple', symbol: 'xrp', trendId: 'ripple' },
    { id: 'litecoin', symbol: 'ltc', trendId: 'litecoin' },
    { id: 'dogecoin', symbol: 'doge', trendId: 'dogecoin' },
    { id: 'tether', symbol: 'usdt', trendId: 'tether' }
  ];
  coins.forEach(({ id, symbol, trendId }) => {
    const percentageElement = document.getElementById(`${symbol}-percentage`);
    const trendPercentageElement = document.getElementById(`${trendId}-trend`);
    if (!percentageElement) console.error(`Percentage element #${symbol}-percentage not found`);
    if (!trendPercentageElement) console.error(`Trend element #${trendId}-trend not found`);
    if (percentageElement || trendPercentageElement) {
      let currentChange = coinData[id].change_24h || 0;
      const randomChange = (Math.random() * 2 - 1) * 0.5; // Random ±0.1% to ±1%
      currentChange = (parseFloat(currentChange) + randomChange).toFixed(2);
      coinData[id].change_24h = parseFloat(currentChange);
      if (percentageElement) {
        percentageElement.innerHTML = `<span class="arrow"></span>${currentChange > 0 ? '+' : ''}${currentChange}%`;
        percentageElement.classList.toggle('text-green-500', currentChange > 0);
        percentageElement.classList.toggle('text-red-500', currentChange <= 0);
      }
      if (trendPercentageElement) {
        trendPercentageElement.innerHTML = `<span class="arrow"></span>${currentChange > 0 ? '+' : ''}${currentChange}%`;
        trendPercentageElement.classList.toggle('text-green-500', currentChange > 0);
        trendPercentageElement.classList.toggle('text-red-500', currentChange <= 0);
      }
      console.log(`Updated ${id} percentage: ${currentChange}%`);
    }
  });
}
// Fix navigation bar
function loadPage(page, event) {
  console.log('loadPage called for:', page, 'at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  const pages = {
    'portfolio': '/portfolio.html',
    'trade': '/trade.html',
    'history': '/history.html',
    'profits': '/profits.html',
    'referrals': '/referrals.html',
    'admin': '/admin.html'
  };
  if (event) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
    console.log('Active nav item set to:', page);
  }
  const targetPage = pages[page];
  if (targetPage && window.location.pathname !== targetPage) {
    console.log('Navigating to:', targetPage);
    window.location.href = targetPage;
  } else {
    console.error('Invalid page or already on page:', page);
  }
}
function setActiveNavItem() {
  console.log('Setting active nav item at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  const pages = {
    '/portfolio.html': 'portfolio',
    '/trade.html': 'trade',
    '/history.html': 'history',
    '/profits.html': 'profits',
    '/referrals.html': 'referrals',
    '/admin.html': 'admin'
  };
  const currentPage = pages[window.location.pathname];
  if (currentPage) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-page="${currentPage}"]`);
    if (navItem) {
      navItem.classList.add('active');
      console.log('Active nav item set to:', currentPage);
    } else {
      console.error('Nav item not found for:', currentPage);
    }
  } else {
    console.warn('Current page not recognized:', window.location.pathname);
  }
}
// Fix transaction slideshow
const transactionData = [
  { coin: 'DOGE', reference: '25****582', amount: 'KES 174,463', time: 'Just now' },
  { coin: 'BTC', reference: '12****345', amount: 'KES 1,234,567', time: 'Just now' },
  { coin: 'ETH', reference: '34****678', amount: 'KES 456,789', time: 'Just now' },
  { coin: 'XRP', reference: '56****901', amount: 'KES 12,345', time: 'Just now' },
  { coin: 'LTC', reference: '78****123', amount: 'KES 197,731', time: 'Just now' },
  { coin: 'USDT', reference: '90****456', amount: 'KES 130,000', time: 'Just now' }
];
let currentTransactionIndex = 0;
async function updateTransaction() {
  console.log('Updating transaction slideshow at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  const transactionList = document.getElementById('transaction-list');
  if (!transactionList) {
    console.error('Transaction list element (#transaction-list) not found');
    return;
  }
  const coins = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', logo: '/images/bitcoin-btc-logo.png' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', logo: '/images/ethereum-eth-logo.png' },
    { id: 'ripple', symbol: 'XRP', name: 'Ripple', logo: '/images/xrp-xrp-logo.png' },
    { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', logo: '/images/litecoin-ltc-logo.png' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', logo: '/images/dogecoin-doge-logo.png' },
    { id: 'tether', symbol: 'USDT', name: 'Tether', logo: '/images/tether-usdt-logo.png' }
  ];
  const coin = coins[currentTransactionIndex % coins.length];
  const coinInfo = coinData[coin.id];
  const sampleTransaction = transactionData.find(t => t.coin === coin.symbol) || transactionData[0];
  const usdToKesRate = 129; // Sample conversion rate (USD to KES)
  const kesValue = (coinInfo.price * usdToKesRate).toFixed(2);
  const change = coinInfo.change_24h.toFixed(2);
  transactionList.innerHTML = `
    <div class="transaction-row transaction-card-inner animate-slide-in">
      <div class="transaction-asset">
        <img src="${coin.logo}" alt="${coin.name} logo" class="transaction-logo">
        <div>
          <div class="transaction-symbol">${coin.symbol}</div>
          <div class="transaction-reference">${sampleTransaction.reference}</div>
          <span class="transaction-badge">Deposit</span>
        </div>
      </div>
      <div class="amount-info">
        <span class="transaction-kes">${sampleTransaction.amount || `KES ${kesValue}`}</span>
        <span class="percentage text-sm ${change > 0 ? 'text-green-500' : 'text-red-500'}">${change > 0 ? '+' : ''}${change}%</span>
        <span class="transaction-time">${sampleTransaction.time}</span>
      </div>
    </div>
  `;
  console.log(`Displayed ${coin.name}: $${coinInfo.price}, ${change}%, KES ${kesValue}, Logo: ${coin.logo}`);
  currentTransactionIndex = (currentTransactionIndex + 1) % coins.length;
}
let currentCoin = 'bitcoin';
let currentCoinSymbol = 'BTC';
let currentTime = '1D';
function initializeChart() {
  console.log('Initializing chart at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  const canvas = document.getElementById('priceChart');
  if (!canvas) {
    console.error('Canvas element #priceChart not found');
    alert('Graph cannot be displayed: Canvas element missing.');
    return;
  }
  canvas.width = 1200;
  canvas.height = window.matchMedia('(max-width: 768px)').matches ? 240 : 300;
  console.log('Chart initialized with width:', canvas.width, 'height:', canvas.height);
  updateChart();
}
async function fetchCoinData(coinId, timeRange) {
  console.log(`Fetching coin data for ${coinId} (${timeRange}) at`, new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  try {
    const days = { '1H': 1, '1D': 1, '1W': 7, '1M': 30, '1Y': 365 }[timeRange];
    const interval = { '1H': 'minutely', '1D': 'hourly', '1W': 'hourly', '1M': 'daily', '1Y': 'daily' }[timeRange];
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json();
    const prices = data.prices;
    const result = prices.map(p => ({
      time: timeRange === '1H' || timeRange === '1D'
        ? new Date(p[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date(p[0]).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      price: p[1]
    }));
    console.log(`Fetched data for ${coinId} (${timeRange}):`, result);
    return result;
  } catch (error) {
    console.warn(`Failed to fetch data for ${coinId} (${timeRange}):`, error);
    return coinData[coinId]?.[timeRange] || [];
  }
}
async function fetchCurrentPrice(coinId) {
  console.log(`Fetching current price for ${coinId} at`, new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json();
    console.log(`Fetched price for ${coinId}:`, data[coinId]);
    return {
      price: data[coinId].usd,
      change_24h: data[coinId].usd_24h_change
    };
  } catch (error) {
    console.warn(`Failed to fetch current price for ${coinId}:`, error);
    return {
      price: coinData[coinId]?.price || 0,
      change_24h: coinData[coinId]?.change_24h || 0
    };
  }
}
let chartData = [];
function simulateChartMotion() {
  console.log('Simulating chart motion at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  if (!chartData.length) return;
  const lastPoint = chartData[chartData.length - 1];
  const newPrice = lastPoint.price * (1 + (Math.random() - 0.5) * 0.01);
  const newTime = new Date(Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' });
  chartData.push({ time: newTime, price: newPrice });
  if (chartData.length > 50) chartData.shift();
  drawCustomChart(chartData);
  updateChartUI({ price: newPrice, change_24h: coinData[currentCoin].change_24h });
}
async function updateChart() {
  console.log('Updating chart at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  try {
    chartData = await fetchCoinData(currentCoin, currentTime);
    const priceData = await fetchCurrentPrice(currentCoin);
    drawCustomChart(chartData);
    updateChartUI(priceData);
  } catch (error) {
    console.error('Chart update failed:', error);
    chartData = coinData[currentCoin][currentTime] || [];
    drawCustomChart(chartData);
    updateChartUI({ price: coinData[currentCoin].price, change_24h: coinData[currentCoin].change_24h });
  }
}
function drawCustomChart(data) {
  console.log('Drawing chart with data:', data);
  const canvas = document.getElementById('priceChart');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!data || data.length === 0) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
    return;
  }
  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;
  const padding = 40;
  const chartHeight = canvas.height - padding * 2;
  const chartWidth = canvas.width - padding * 2;
  ctx.beginPath();
  ctx.moveTo(padding, canvas.height - padding);
  ctx.lineTo(padding + chartWidth, canvas.height - padding);
  ctx.strokeStyle = '#374151';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(padding, canvas.height - padding);
  ctx.lineTo(padding, padding);
  ctx.stroke();
  ctx.fillStyle = '#9ca3af';
  ctx.font = '12px Inter';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const price = minPrice + (i / 5) * priceRange;
    const y = canvas.height - padding - (i / 5) * chartHeight;
    ctx.fillText(`$${price.toFixed(2)}`, padding - 10, y + 5);
  }
  ctx.textAlign = 'center';
  for (let i = 0; i < data.length; i += Math.ceil(data.length / 5)) {
    ctx.fillText(data[i].time, padding + (i / (data.length - 1)) * chartWidth, canvas.height - padding + 20);
  }
  ctx.beginPath();
  ctx.moveTo(padding, canvas.height - padding - ((data[0].price - minPrice) / priceRange) * chartHeight);
  for (let i = 1; i < data.length; i++) {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = canvas.height - padding - ((data[i].price - minPrice) / priceRange) * chartHeight;
    ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineTo(padding + chartWidth, canvas.height - padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
  ctx.fill();
}
function updateChartUI(priceData) {
  console.log('Updating chart UI with:', priceData);
  const coinPair = document.getElementById('coin-pair');
  const coinPrice = document.getElementById('coin-price');
  const coinPercentage = document.getElementById('coin-percentage');
  const lastUpdated = document.getElementById('last-updated');
  if (coinPair) coinPair.textContent = `${currentCoinSymbol}/USD`;
  if (coinPrice) coinPrice.textContent = `$${priceData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (coinPercentage) {
    const change = priceData.change_24h.toFixed(2);
    coinPercentage.innerHTML = `<span class="arrow"></span>${change > 0 ? '+' : ''}${change}%`;
    coinPercentage.classList.toggle('text-green-500', change > 0);
    coinPercentage.classList.toggle('text-red-500', change <= 0);
  }
  if (lastUpdated) lastUpdated.textContent = `Last updated: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}`;
}
function changeTime(time, event) {
  console.log('Changing time to:', time);
  currentTime = time;
  updateChart();
  document.querySelectorAll('.time-button').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}
function changeCoin(coinId, symbol, event) {
  console.log('Changing coin to:', coinId, symbol);
  currentCoin = coinId;
  currentCoinSymbol = symbol;
  updateChart();
  document.querySelectorAll('.coin-button').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}
function openDeposit() {
  console.log('Navigating to /deposit.html at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  window.location.href = '/deposit.html';
}
function openWithdraw() {
  console.log('Navigating to /withdraw.html at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  window.location.href = '/withdraw.html';
}
function openMiningPackages() {
  console.log('Navigating to /trade.html#mining at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  window.location.href = '/trade.html#mining';
}
function openMyDeposits() {
  console.log('Navigating to /deposits.html at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  window.location.href = '/deposits.html';
}
function openWithdrawals() {
  console.log('Navigating to /withdraw.html at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  window.location.href = '/withdraw.html';
}
function openSupport() {
  console.log('Navigating to /support.html at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  window.location.href = '/support.html';
}
function openCompany() {
  console.log('Navigating to /company.html at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  window.location.href = '/company.html';
}
socket.on('portfolio_update', (data) => {
  console.log('Received portfolio update:', data);
  const portfolioBalance = document.getElementById('portfolio-balance');
  if (data.username === localStorage.getItem('username') && portfolioBalance) {
    const balance = typeof data.balance === 'number' ? data.balance : 0;
    portfolioBalance.textContent = balance.toFixed(2);
    console.log('Balance updated via socket:', balance);
  }
});
// Initialize all components
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing page at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  setActiveNavItem();
  initializeChart();
  updateUserDetails();
  updateCoinPrices();
  updateTransaction();
  // Ensure all buttons are clickable
  // Balance Buttons
  const depositButton = document.querySelector('.deposit-btn');
  const withdrawButton = document.querySelector('.withdraw-btn');
  if (depositButton) depositButton.addEventListener('click', openDeposit);
  if (withdrawButton) withdrawButton.addEventListener('click', openWithdraw);

  document.querySelectorAll('.time-button').forEach(button => {
    button.addEventListener('click', (event) => changeTime(button.getAttribute('data-time') || button.textContent.trim(), event));
    if ((button.getAttribute('data-time') || button.textContent.trim()) === currentTime) {
      button.classList.add('active');
    }
  });

  const coinButtons = {
    'BTC': ['bitcoin', 'BTC'],
    'ETH': ['ethereum', 'ETH'],
    'XRP': ['ripple', 'XRP'],
    'LTC': ['litecoin', 'LTC'],
    'DOGE': ['dogecoin', 'DOGE'],
    'USDT': ['tether', 'USDT']
  };
  document.querySelectorAll('.coin-button').forEach(button => {
    button.addEventListener('click', (event) => {
      const label = button.getAttribute('data-symbol') || button.textContent.trim();
      const coin = coinButtons[label];
      if (coin) changeCoin(coin[0], coin[1], event);
    });
    if ((button.getAttribute('data-symbol') || button.textContent.trim()) === currentCoinSymbol) {
      button.classList.add('active');
    }
  });

  const miningButtonHandlers = {
    'deposit': openDeposit,
    'mining-packages': openMiningPackages,
    'my-deposits': openMyDeposits,
    'withdrawals': openWithdrawals,
    'support': openSupport,
    'company': openCompany
  };
  document.querySelectorAll('.mining-button').forEach(button => {
    const action = button.getAttribute('data-action');
    if (miningButtonHandlers[action]) {
      button.addEventListener('click', miningButtonHandlers[action]);
    } else {
      console.error('No handler found for mining button action:', action);
    }
  });

  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (event) => {
      const page = item.getAttribute('data-page');
      if (page) loadPage(page, event);
    });
  });
  setInterval(simulateChartMotion, 5000);
  setInterval(updateChart, 60000);
  setInterval(updateTransaction, 5000);
  setInterval(updateCoinPercentages, 10000);
  setInterval(updateCoinPrices, 15000);
});