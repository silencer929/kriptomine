// history.js
console.log("History page loaded at 03:59 PM EAT, August 17, 2025");

document.addEventListener('DOMContentLoaded', async () => {
  const balanceSpan = document.getElementById('balance');
  const totalInvestedSpan = document.getElementById('totalInvested');
  const activeMiningSpan = document.getElementById('activeMining');
  const dailyEarningsSpan = document.getElementById('dailyEarnings');
  const hourlyRateSpan = document.getElementById('hourlyRate');
  const toggleDetailsBtn = document.getElementById('toggleDetails');
  const detailsSection = document.getElementById('detailsSection');
  const noMiningSection = document.getElementById('noMiningSection');
  const collectAllBtn = document.getElementById('collectAllBtn');
  const completedBtn = document.getElementById('completedBtn');
  const startMiningBtn = document.getElementById('startMiningBtn');
  const activeMiningBtn = document.getElementById('activeMiningBtn');

  // Debug button clicks
  startMiningBtn.addEventListener('click', () => {
    console.log('Start Mining button clicked, redirecting to /trade.html');
    window.location.href = '/trade.html';
  });

  activeMiningBtn.addEventListener('click', () => {
    console.log('Active Mining button clicked, redirecting to /no-mining.html');
    window.location.href = '/no-mining.html';
  });

  // Fetch account data
  const fetchAccountData = async () => {
    try {
      const response = await fetch('/api/account-data', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch account data');
      const data = await response.json();
      console.log('Fetched account data:', data);
      balanceSpan.textContent = `KES ${data.balance.toFixed(2)}`;
      totalInvestedSpan.textContent = `KES ${data.totalInvested.toFixed(2)}`;
      activeMiningSpan.textContent = `${data.activeMining} currencies`;
      dailyEarningsSpan.textContent = `KES ${data.dailyEarnings.toFixed(2)}`;
      hourlyRateSpan.textContent = `KES ${data.hourlyRate.toFixed(2)}`;
      noMiningSection.classList.toggle('active', data.activeMining === 0);
      detailsSection.classList.toggle('active', data.activeMining > 0);
    } catch (err) {
      console.error('Error fetching account data:', err);
      balanceSpan.textContent = 'KES 0.00';
      totalInvestedSpan.textContent = 'KES 0.00';
      activeMiningSpan.textContent = '0 currencies';
      dailyEarningsSpan.textContent = 'KES 0.00';
      hourlyRateSpan.textContent = 'KES 0.00';
      noMiningSection.classList.add('active');
    }
  };

  // Toggle details section
  toggleDetailsBtn.addEventListener('click', () => {
    const isExpanded = detailsSection.classList.toggle('active');
    toggleDetailsBtn.textContent = isExpanded ? 'Hide Details ▲' : 'Show Details ▼';
    toggleDetailsBtn.setAttribute('aria-expanded', isExpanded);
    console.log('Details section toggled:', isExpanded ? 'expanded' : 'collapsed');
  });

  // Collect All button
  collectAllBtn.addEventListener('click', async () => {
    try {
      console.log('Collect All button clicked, sending request to /collect');
      const response = await fetch('/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        await fetchAccountData(); // Refresh data after collecting
        console.log('Collect All successful');
      } else {
        console.error('Failed to collect rewards');
      }
    } catch (err) {
      console.error('Error collecting rewards:', err);
    }
  });

  // Completed button
  completedBtn.addEventListener('click', async () => {
    try {
      console.log('Completed button clicked, sending request to /completed');
      const response = await fetch('/completed', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch completed data');
      console.log('Completed data fetched successfully');
      // Handle response as needed (e.g., display data or redirect)
    } catch (err) {
      console.error('Error fetching completed data:', err);
    }
  });

  // Initialize navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.getAttribute('data-page');
      console.log(`Nav item clicked, redirecting to /${page}.html`);
      window.location.href = `/${page}.html`;
    });
  });

  // Fetch account data on load
  await fetchAccountData();
});