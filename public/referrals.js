// Redirect function for placeholder buttons
function redirectTo(page) {
  console.log(`Redirecting to: /${page}.html`); // Debug log
  window.location.href = `/${page}.html`;
}

// Existing DOM content loaded event listener
document.addEventListener('DOMContentLoaded', async () => {
  // Token check with debugging
  const token = localStorage.getItem('token');
  console.log('Token:', token); // Debug: Check token value
  if (!token) {
    console.warn('No token found, redirecting to login');
    window.location.href = '/login.html';
    return;
  }

  // Navigation mappings
  const pageMappings = {
    'portfolio': '/portfolio.html',
    'trade': '/trade.html',
    'history': '/history.html',
    'profits': '/profits.html',
    'referrals': '/referrals.html'
  };

  // Set active navigation item based on current page
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item').forEach(item => {
    const page = item.getAttribute('data-page');
    if (pageMappings[page] === `/${currentPage}`) {
      item.classList.add('active');
    }
  });

  // Attach click listeners to nav items with debugging
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.getAttribute('data-page');
      console.log('Nav item clicked:', page); // Debug: Log clicked item
      if (pageMappings[page]) {
        console.log('Redirecting to:', pageMappings[page]); // Debug: Log redirect
        window.location.href = pageMappings[page];
      } else {
        console.error('No mapping found for page:', page); // Debug: Log missing mapping
        alert('Page not found. Please try another option.');
      }
    });
  });

  // Add click listeners to redirect buttons
  document.querySelectorAll('.redirect-button').forEach(button => {
    button.addEventListener('click', (e) => {
      const page = e.target.textContent.trim().split(' ')[0].toLowerCase().replace(' ', '-');
      console.log(`Button clicked, redirecting to: ${page}`); // Debug log
      redirectTo(page);
    });
  });

  try {
    console.log('Fetching referral data...'); // Debug: Confirm fetch attempt
    // Placeholder for referral data fetch
    // Add your fetch logic here
  } catch (err) {
    console.error('Error fetching referral data:', err);
  }
});