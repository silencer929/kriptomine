/**
 * Navbar Loader & Navigation Manager
 * Loads /navbar.html into #app-nav, manages URL routing, and sets active UI states.
 */

'use strict';

const NavbarManager = (() => {
  // 1. Centralized Routing Configuration
  const ROUTES = {
    'portfolio': '/portfolio.html',
    'trade': '/trade.html',
    'history': '/history.html',
    'profits': '/profits.html',
    'referrals': '/referrals.html',
    'admin': '/admin.html'
  };

  // 2. Navigation Click Handler
  function handleNavigation(event) {
    const navItem = event.target.closest('.nav-item');
    if (!navItem) return;

    event.preventDefault();
    const pageKey = navItem.dataset.page;
    const targetUrl = ROUTES[pageKey];

    if (!targetUrl) {
      console.error(`[Navbar Manager] Invalid route key: ${pageKey}`);
      return;
    }

    // Only redirect if we are not already on that page
    if (window.location.pathname !== targetUrl) {
      window.location.href = targetUrl;
    }
  }

  // 2.5 Admin Permission Checker
  function checkAdminPermissions() {
    const token = localStorage.getItem('token');
    const adminNavItem = document.querySelector('#app-nav .nav-item[data-page="admin"]');
    
    if (!adminNavItem) return;
    
    if (token && isTokenValid(token)) {
      adminNavItem.classList.remove('hidden');
    } else {
      adminNavItem.classList.add('hidden');
    }
  }

  // Helper function to validate admin token
  function isTokenValid(token) {
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    try {
      const payload = JSON.parse(atob(parts[1]));
      return payload.username && typeof payload.is_admin === 'boolean' && payload.is_admin;
    } catch (error) {
      return false;
    }
  }

  // 3. UI Active State Manager
  function setActiveState() {
    const currentPage = window.location.pathname;
    const navItems = document.querySelectorAll('#app-nav .nav-item');

    // Check admin permissions and show/hide admin nav
    checkAdminPermissions();

    navItems.forEach(item => {
      const pageKey = item.dataset.page;
      const itemUrl = ROUTES[pageKey];
      
      // Reset all items to inactive state (Tailwind classes)
      item.classList.remove('text-teal-400', 'active');
      item.classList.add('text-gray-500');
      
      // Remove existing indicator if any
      const existingIndicator = item.querySelector('.active-indicator');
      if (existingIndicator) existingIndicator.remove();

      // Check if this item is the current active page
      // (Also handles edge case where current page is "/" meaning portfolio)
      if (currentPage === itemUrl || (currentPage === '/' && pageKey === 'portfolio')) {
        item.classList.add('text-teal-400', 'active');
        item.classList.remove('text-gray-500');
        
        // Inject the teal active indicator line at the top
        const border = document.createElement('div');
        border.className = 'active-indicator absolute -top-3 w-8 h-1 bg-teal-500 rounded-b-full';
        item.appendChild(border);
      }
    });
  }

  // 4. HTML Injector (Your function, enhanced)
  async function loadNavbar() {
    try {
      const response = await fetch('/navbar.html', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Unable to load navbar.html (status: ${response.status})`);
      }

      const html = await response.text();
      const navContainer = document.getElementById('app-nav');
      
      if (!navContainer) {
        throw new Error('Navbar container #app-nav not found.');
      }

      navContainer.innerHTML = html;
      
      // Dispatch custom event once HTML is injected
      window.dispatchEvent(new Event('navbar.loaded'));
    } catch (error) {
      console.error('[Navbar Manager] Failed to load navbar:', error);
    }
  }

  // Expose the loader
  return { loadNavbar, handleNavigation, setActiveState };
})();

// ==========================================
// Bootstrapping
// ==========================================

// 1. Initialize Loader when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', NavbarManager.loadNavbar);
} else {
  NavbarManager.loadNavbar();
}

// 2. Listen for HTML injection completion, then attach logic
window.addEventListener('navbar.loaded', () => {
  const navContainer = document.getElementById('app-nav');
  
  // Attach event delegation for clicks
  navContainer.addEventListener('click', NavbarManager.handleNavigation);
  
  // Set the active highlight based on current URL
  NavbarManager.setActiveState();
});