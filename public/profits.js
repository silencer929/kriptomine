const token = localStorage.getItem('token');
const username = localStorage.getItem('username');
if (!token || !username) window.location.href = '/login.html';

const socket = io('http://localhost:3000');
socket.emit('join', username);

async function loadProfits() {
  try {
    const res = await fetch('http://localhost:3000/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username })
    });
    const data = await res.json();
    const list = document.getElementById('profits-list');
    list.innerHTML = '';
    for (let coin in data.miningStatus) {
      const mining = data.miningStatus[coin];
      const item = document.createElement('div');
      item.className = 'bg-gray-800 p-4 rounded';
      item.innerHTML = `
        <p><strong>Coin:</strong> ${coin}</p>
        <p><strong>Total Earned:</strong> KES ${mining.totalEarned.toFixed(2)}</p>
        <p><strong>Start Time:</strong> ${new Date(mining.startTime).toLocaleString()}</p>
        <p><strong>Units:</strong> ${mining.units}</p>
      `;
      list.appendChild(item);
    }
  } catch (err) {
    console.error('Profits error:', err);
    alert('Error loading profits');
  }
}

socket.on('transaction-update', loadProfits);
window.onload = loadProfits;