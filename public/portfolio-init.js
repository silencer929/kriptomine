document.addEventListener('DOMContentLoaded', async () => {
  console.log('portfolio-init.js loaded');
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('No token found, redirecting to login');
    window.location.href = '/index.html';
    return;
  }
  try {
    console.log('Fetching portfolio data with token:', token);
    const response = await fetch('/api/portfolio', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Portfolio API response status:', response.status);
    if (!response.ok) {
      throw new Error('Failed to fetch portfolio: ' + response.statusText);
    }
    const data = await response.json();
    console.log('Portfolio API response data:', data);
    if (response.ok) {
      document.getElementById('user-name').textContent = data.username || 'User';
      document.getElementById('user-mobile').textContent = `Mobile: ${data.mobile || 'N/A'}`;
      document.getElementById('portfolio-balance').textContent = data.balance.toFixed(2);
      document.getElementById('avatar').textContent = data.username ? data.username[0].toUpperCase() : 'U';
      ['btc', 'eth', 'xrp', 'ltc', 'doge', 'usdt'].forEach(coin => {
        const holding = data.holdings.find(h => h.coin.toLowerCase() === coin) || { amount: 0, price: 0 };
        document.getElementById(`${coin}-value`).textContent = `${holding.amount.toFixed(2)} ${coin.toUpperCase()}`;
        const percentage = holding.price ? ((holding.price / 100) * 3).toFixed(2) : 0;
        document.getElementById(`${coin}-percentage`).innerHTML = `<span class="arrow">${percentage >= 0 ? '↑' : '↓'}</span>${percentage}%`;
        document.getElementById(`${coin}-percentage`).classList.toggle('text-green-500', percentage >= 0);
        document.getElementById(`${coin}-percentage`).classList.toggle('text-red-500', percentage < 0);
      });
      if (data.is_admin) {
        document.getElementById('admin-section').style.display = 'block';
        const userList = document.getElementById('user-list');
        const transList = document.getElementById('all-transactions');
        const adminResponse = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
        console.log('Admin users API response status:', adminResponse.status);
        const adminData = await adminResponse.json();
        userList.innerHTML = adminData.map(u => `<li>${u.username}: KES ${u.balance.toFixed(2)} (Mobile: ${u.mobile})</li>`).join('');
        const transResponse = await fetch('/api/history', { headers: { 'Authorization': `Bearer ${token}` } });
        console.log('History API response status:', transResponse.status);
        const transData = await transResponse.json();
        transList.innerHTML = transData.map(t => `<div>${t.date}: ${t.type} ${t.amount.toFixed(2)} ${t.coin || 'KES'}</div>`).join('');
      }
    } else {
      document.getElementById('error').classList.remove('hidden');
      document.getElementById('error').textContent = data.error;
      console.log('Portfolio API error:', data.error);
    }
  } catch (err) {
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('error').textContent = 'Server error';
    console.error('Portfolio fetch error:', err);
  }
});