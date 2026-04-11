/**
 * CryptoMiningPro - History & Active Mining Dashboard Logic
 */

"use strict";

const HistoryApp = (() => {
  // ==========================================
  // 1. Configuration & State
  // ==========================================
  const CONFIG = {
    CURRENCY: 'KES',
    API: {
      ACCOUNT_DATA: '/api/account-data',
      COLLECT: '/api/collect',
      CSRF: '/api/csrf-token'
    }
  };

  const State = {
    token: localStorage.getItem('token') || null,
    accountData: null
  };

  // ==========================================
  // 2. UI / DOM Manager
  // ==========================================
  const UI = {
    elements: {
      // Summary Stats
      balance: document.getElementById('balance'),
      totalInvested: document.getElementById('totalInvested'),
      activeMining: document.getElementById('activeMining'),
      dailyEarnings: document.getElementById('dailyEarnings'),
      hourlyRate: document.getElementById('hourlyRate'),
      
      // Sections & Toggles
      toggleDetailsBtn: document.getElementById('toggleDetails'),
      detailsSection: document.getElementById('detailsSection'),
      
      // Tabs
      tabActive: document.getElementById('tab-active'),
      tabCompleted: document.getElementById('tab-completed'),
      contentActive: document.getElementById('content-active'),
      contentCompleted: document.getElementById('content-completed'),
      
      // Lists & Fallbacks
      activeTradesList: document.getElementById('active-trades-list'),
      completedTradesList: document.getElementById('completed-trades-list'),
      noMiningSection: document.getElementById('noMiningSection'),
      noCompletedSection: document.getElementById('noCompletedSection'),
      
      // Actions
      collectAllBtn: document.getElementById('collectAllBtn'),
      startMiningBtn: document.getElementById('startMiningBtn')
    },

    updateSummary(data) {
      const { elements } = this;
      
      if (elements.balance) elements.balance.textContent = `${CONFIG.CURRENCY} ${(data.balance || 0).toFixed(2)}`;
      if (elements.totalInvested) elements.totalInvested.textContent = `${CONFIG.CURRENCY} ${(data.totalInvested || 0).toFixed(2)}`;
      if (elements.activeMining) elements.activeMining.textContent = `${data.activeMining || 0} currencies`;
      if (elements.dailyEarnings) elements.dailyEarnings.textContent = `${CONFIG.CURRENCY} ${(data.dailyEarnings || 0).toFixed(2)}`;
      if (elements.hourlyRate) elements.hourlyRate.textContent = `${CONFIG.CURRENCY} ${(data.hourlyRate || 0).toFixed(2)}`;
    },

    renderActiveTrades(trades) {
      const { activeTradesList, noMiningSection } = this.elements;
      if (!activeTradesList || !noMiningSection) return;

      if (!trades || trades.length === 0) {
        activeTradesList.innerHTML = '';
        noMiningSection.classList.remove('hidden');
        return;
      }

      noMiningSection.classList.add('hidden');
      activeTradesList.innerHTML = trades.map(trade => `
        <div class="bg-app-bgDark border border-white/5 rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:border-white/10 transition-colors">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="font-bold text-white text-[15px] tracking-wide">${trade.coinName}</span>
              <span class="text-[10px] bg-[#0EA5E9]/20 text-[#38BDF8] px-2 py-0.5 rounded uppercase font-bold tracking-widest">${trade.status}</span>
            </div>
            <span class="text-[#10B981] font-bold text-sm">+ ${CONFIG.CURRENCY} ${trade.hourlyRate}/hr</span>
          </div>
          
          <div class="w-full bg-black/40 rounded-full h-1.5 overflow-hidden border border-white/5">
            <div class="bg-gradient-to-r from-[#0EA5E9] to-[#10B981] h-1.5 rounded-full" style="width: ${trade.progressPercentage}%"></div>
          </div>
          
          <div class="flex justify-between text-[11px] text-gray-400 font-medium tracking-wide uppercase">
            <span>Invested: ${CONFIG.CURRENCY} ${trade.amount}</span>
            <span class="text-gray-300">Time Left: ${trade.timeLeftStr}</span>
          </div>
        </div>
      `).join('');
    },

    renderCompletedTrades(trades) {
      const { completedTradesList, noCompletedSection } = this.elements;
      if (!completedTradesList || !noCompletedSection) return;

      if (!trades || trades.length === 0) {
        completedTradesList.innerHTML = '';
        noCompletedSection.classList.remove('hidden');
        return;
      }

      noCompletedSection.classList.add('hidden');
      completedTradesList.innerHTML = trades.map(trade => `
        <div class="bg-app-bgDark border border-white/5 rounded-xl p-4 flex justify-between items-center shadow-sm">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="font-bold text-gray-300 text-[15px]">${trade.coinName}</span>
              <span class="text-[10px] bg-gray-700/50 text-gray-400 px-2 py-0.5 rounded uppercase font-bold">Ended</span>
            </div>
            <span class="text-[11px] text-gray-500 uppercase tracking-widest">Invested: ${CONFIG.CURRENCY} ${trade.amount}</span>
          </div>
          <div class="text-right">
            <span class="block text-[#10B981] font-bold text-sm">Earned: ${CONFIG.CURRENCY} ${trade.totalReturn || 0}</span>
          </div>
        </div>
      `).join('');
    },

    toggleDetails() {
      const { toggleDetailsBtn, detailsSection } = this.elements;
      if (!toggleDetailsBtn || !detailsSection) return;

      detailsSection.classList.toggle('hidden-details');
      if (detailsSection.classList.contains('hidden-details')) {
        toggleDetailsBtn.textContent = 'Show Details ▼';
      } else {
        toggleDetailsBtn.textContent = 'Hide Details ▲';
      }
    },

    switchTab(tabName) {
      const { tabActive, tabCompleted, contentActive, contentCompleted } = this.elements;
      if (!tabActive || !tabCompleted) return;

      const activeClasses = ['text-app-textBlue', 'border-app-btnBlue'];
      const inactiveClasses = ['text-gray-500', 'border-transparent'];

      if (tabName === 'active') {
        tabActive.classList.add(...activeClasses);
        tabActive.classList.remove(...inactiveClasses);
        tabCompleted.classList.add(...inactiveClasses);
        tabCompleted.classList.remove(...activeClasses);
        
        contentActive.classList.add('active');
        contentCompleted.classList.remove('active');
      } else {
        tabCompleted.classList.add(...activeClasses);
        tabCompleted.classList.remove(...inactiveClasses);
        tabActive.classList.add(...inactiveClasses);
        tabActive.classList.remove(...activeClasses);
        
        contentCompleted.classList.add('active');
        contentActive.classList.remove('active');
      }
    },

    setLoading(btnElement, isLoading, originalText) {
      if (!btnElement) return;
      btnElement.disabled = isLoading;
      if (isLoading) {
        btnElement.innerHTML = `<span class="opacity-70">Processing...</span>`;
        btnElement.classList.add('cursor-not-allowed');
      } else {
        // Restore inner HTML (keeps SVG if it existed)
        btnElement.innerHTML = originalText;
        btnElement.classList.remove('cursor-not-allowed');
      }
    },

    notify(message, isError = false) {
      alert(isError ? `⚠️ ${message}` : `✅ ${message}`);
    }
  };

  // ==========================================
  // 3. API Service
  // ==========================================
  const ApiService = {
    handleAuthError() {
      alert('Session expired. Please log in again.');
      localStorage.clear();
      window.location.href = '/login.html';
    },

    async fetchWithAuth(url, options = {}) {
      if (!State.token) return this.handleAuthError();

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${State.token}`,
        ...(options.headers || {})
      };

      try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401 || response.status === 403) return this.handleAuthError();
        
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);
        return data;
      } catch (error) {
        console.error(`API Error [${url}]:`, error.message);
        throw error;
      }
    },

    async getCsrf() {
      try {
        const res = await fetch(CONFIG.API.CSRF, { credentials: 'include' });
        return res.ok ? (await res.json()).csrfToken : null;
      } catch { return null; }
    }
  };

  // ==========================================
  // 4. Business Logic (Actions)
  // ==========================================
  const Actions = {
    async fetchAccountData() {
      try {
        const data = await ApiService.fetchWithAuth(CONFIG.API.ACCOUNT_DATA);
        
        State.accountData = {
          balance: data.balance || 0,
          totalInvested: data.totalInvested || 0,
          activeMining: data.activeMining || 0,
          dailyEarnings: data.dailyEarnings || 0,
          hourlyRate: data.hourlyRate || 0,
          activeTrades: data.activeTrades || [],
          completedTrades: data.completedTrades || [] // Assumes backend sends this array
        };

        UI.updateSummary(State.accountData);
        UI.renderActiveTrades(State.accountData.activeTrades);
        UI.renderCompletedTrades(State.accountData.completedTrades);

      } catch (error) {
        console.error('Failed to load account data:', error);
        UI.updateSummary({ balance: 0, totalInvested: 0, activeMining: 0, dailyEarnings: 0, hourlyRate: 0 });
      }
    },

    async collectAll() {
      const btn = UI.elements.collectAllBtn;
      if (!btn) return;
      
      const originalHTML = btn.innerHTML;
      UI.setLoading(btn, true);
      
      try {
        const csrfToken = await ApiService.getCsrf();
        const headers = csrfToken ? { 'X-CSRF-Token': csrfToken } : {};

        const result = await ApiService.fetchWithAuth(CONFIG.API.COLLECT, {
          method: 'POST',
          headers
        });

        UI.notify(result.message || 'Earnings collected successfully!');
        await this.fetchAccountData(); // Refresh data immediately
      } catch (error) {
        UI.notify(error.message || 'Failed to collect rewards.', true);
      } finally {
        UI.setLoading(btn, false, originalHTML);
      }
    }
  };

  // ==========================================
  // 5. Event Delegation & Initialization
  // ==========================================
  function bindEvents() {
    const { 
      startMiningBtn, toggleDetailsBtn, tabActive, tabCompleted, collectAllBtn 
    } = UI.elements;

    // Routing
    if (startMiningBtn) {
      startMiningBtn.addEventListener('click', () => window.location.href = '/trade.html');
    }

    // Toggles & Tabs
    if (toggleDetailsBtn) {
      toggleDetailsBtn.addEventListener('click', () => UI.toggleDetails());
    }

    if (tabActive) {
      tabActive.addEventListener('click', () => UI.switchTab('active'));
    }

    if (tabCompleted) {
      tabCompleted.addEventListener('click', () => UI.switchTab('completed'));
    }

    // Actions
    if (collectAllBtn) {
      collectAllBtn.addEventListener('click', () => Actions.collectAll());
    }
  }

  function init() {
    if (!State.token) {
      window.location.href = '/login.html';
      return;
    }

    bindEvents();
    Actions.fetchAccountData();
    
    // Auto-refresh the progress bars every 60 seconds to keep UI live
    setInterval(() => {
      Actions.fetchAccountData();
    }, 60000);
  }

  return { init };
})();

// Bootstrap the module when DOM loads
document.addEventListener('DOMContentLoaded', HistoryApp.init);