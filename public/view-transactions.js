/**
 * CryptoMiningPro - Admin View Transactions Logic
 * Refactored for clean architecture, performance, and professional UI.
 */

"use strict";

const TransactionsApp = (() => {
  // ==========================================
  // 1. Configuration & State
  // ==========================================
  const CONFIG = {
    API_TIMEOUT: 10000, // 10 seconds
    API: {
      PORTFOLIO: '/api/portfolio',
      HISTORY: '/api/history' // Admin endpoint to get ALL transactions
    }
  };

  const State = {
    token: localStorage.getItem('token'),
    username: localStorage.getItem('username'),
    transactions: []
  };

  // ==========================================
  // 2. UI Manager (DOM Manipulation)
  // ==========================================
  const UI = {
    elements: {
      userName: document.getElementById('user-name'),
      userMobile: document.getElementById('user-mobile'),
      avatar: document.getElementById('avatar'),
      transactionList: document.getElementById('transaction-list'),
      errorMsg: document.getElementById('error-message'),
      notificationDot: document.getElementById('notification-dot')
    },

    showError(message) {
      if (!this.elements.errorMsg) return;
      this.elements.errorMsg.textContent = message;
      this.elements.errorMsg.style.display = 'block';
      this.elements.errorMsg.classList.add('text-red-500', 'bg-red-500/10', 'p-3', 'rounded-lg', 'text-sm', 'mb-4');
    },

    clearError() {
      if (!this.elements.errorMsg) return;
      this.elements.errorMsg.textContent = '';
      this.elements.errorMsg.style.display = 'none';
    },

    renderUserProfile(userData) {
      if (this.elements.userName) this.elements.userName.textContent = userData.username || 'Admin';
      if (this.elements.userMobile) this.elements.userMobile.textContent = `Mobile: ${userData.mobile || 'Not set'}`;
      if (this.elements.avatar) this.elements.avatar.textContent = (userData.username || 'A').charAt(0).toUpperCase();
      if (this.elements.notificationDot) this.elements.notificationDot.style.display = 'none';
    },

    renderTransactions() {
      if (!this.elements.transactionList) return;

      if (!State.transactions || State.transactions.length === 0) {
        this.elements.transactionList.innerHTML = `
          <div class="text-center py-8 bg-[#151F32] rounded-xl border border-white/5">
            <p class="text-gray-400 text-sm">No transactions found.</p>
          </div>
        `;
        return;
      }

      // Generate a modern, styled list of transactions
      const html = State.transactions.map(t => {
        const date = new Intl.DateTimeFormat('en-US', { 
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        }).format(new Date(t.date || t.createdAt));
        
        const amount = parseFloat(t.amount).toFixed(2);
        const type = (t.type || 'Transaction').toUpperCase();
        
        // Status color coding
        const status = (t.status || 'UNKNOWN').toLowerCase();
        let statusColor = 'text-gray-400';
        if (['success', 'completed'].includes(status)) statusColor = 'text-green-400';
        if (['pending', 'processing'].includes(status)) statusColor = 'text-yellow-400';
        if (['failed', 'rejected'].includes(status)) statusColor = 'text-red-400';

        return `
          <li class="bg-[#151F32] border border-white/5 rounded-xl p-4 mb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-white/5 transition-colors">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center border border-blue-500/30 text-blue-400 font-bold">
                ${t.username ? t.username.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <p class="text-white font-bold text-sm tracking-wide">${t.username || 'Unknown User'}</p>
                <div class="flex items-center gap-2 text-xs mt-1">
                  <span class="text-gray-400">${date}</span>
                  <span class="text-gray-600">•</span>
                  <span class="text-gray-400 font-mono">${t.reference || 'No Ref'}</span>
                </div>
              </div>
            </div>
            
            <div class="text-left sm:text-right w-full sm:w-auto pl-14 sm:pl-0">
              <p class="text-white font-bold tracking-wider">${t.currency || 'KES'} ${amount}</p>
              <div class="flex items-center sm:justify-end gap-2 mt-1 text-[10px] font-bold uppercase tracking-widest">
                <span class="text-gray-500">${type}</span>
                <span class="${statusColor}">${status}</span>
              </div>
            </div>
          </li>
        `;
      }).join('');

      this.elements.transactionList.innerHTML = `<ul class="space-y-1">${html}</ul>`;
    }
  };

  // ==========================================
  // 3. API Service
  // ==========================================
  const ApiService = {
    handleAuthError() {
      alert('Session expired or unauthorized access. Please log in again.');
      localStorage.clear();
      window.location.href = '/index.html';
    },

    async fetchWithAuth(url) {
      if (!State.token) return this.handleAuthError();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);

      try {
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${State.token}` },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 401 || response.status === 403) {
          return this.handleAuthError();
        }

        const data = await response.json().catch(() => ({}));
        
        if (!response.ok) {
          throw new Error(data.error || `Server Error (${response.status})`);
        }

        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please check your connection.');
        }
        throw error;
      }
    }
  };

  // ==========================================
  // 4. Business Logic
  // ==========================================
  const Actions = {
    async loadData() {
      UI.clearError();
      if (UI.elements.transactionList) {
        UI.elements.transactionList.innerHTML = `<p class="text-center text-gray-500 text-sm py-4">Loading transactions...</p>`;
      }

      try {
        // Fetch User and Transactions concurrently for faster page load
        const [userData, transactionsData] = await Promise.all([
          ApiService.fetchWithAuth(CONFIG.API.PORTFOLIO),
          ApiService.fetchWithAuth(CONFIG.API.HISTORY)
        ]);

        if (userData) UI.renderUserProfile(userData);
        
        if (transactionsData) {
          State.transactions = transactionsData;
          UI.renderTransactions();
        }

      } catch (error) {
        console.error('Data loading failed:', error.message);
        UI.showError(`Failed to load data: ${error.message}`);
      }
    },

    setupSockets() {
      if (typeof io !== 'undefined') {
        const socket = io();
        socket.on('connect', () => console.log('Socket connected'));
        socket.on('connect_error', (err) => console.error('Socket error:', err));
        
        // Reload transactions if an update occurs
        socket.on('portfolio_update', () => {
          console.log('Update received via socket. Refreshing list...');
          this.loadData();
        });
      }
    }
  };

  // ==========================================
  // 5. Initialization
  // ==========================================
  function init() {
    console.log("Initializing Admin Transactions Page...");
    if (!State.token || !State.username) {
      alert('Session missing. Please log in.');
      window.location.href = '/index.html';
      return;
    }

    Actions.setupSockets();
    Actions.loadData();
  }

  // Expose init
  return { init };
})();

// Bootstrap
document.addEventListener('DOMContentLoaded', TransactionsApp.init);