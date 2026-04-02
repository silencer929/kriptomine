/**
 * CryptoMiningPro - Trade Logic & Dynamic Rendering
 * Excludes navbar logic (handled by navbar.js).
 */

"use strict";

const TradeApp = (() => {
  // ==========================================
  // 1. Configuration & Market Data
  // ==========================================
  const CONFIG = {
    CURRENCY: 'KES',
    API: {
      PORTFOLIO: '/api/portfolio',
      START_MINING: '/api/start-mining',
      CSRF: '/api/csrf-token'
    }
  };

  // Dynamic Market Data (Matches your screenshot exactly)
  // In the future, you can fetch this array from your backend.
  const MARKET_DATA = [
    {
      name: "Bitcoin",
      symbol: "BTC",
      img: "/images/bitcoin-btc-logo.png",
      period: "6 days",
      stock: "3 units",
      daily: 2000,
      return: 12000,
      price: 5000
    },
    {
      name: "Ripple XRP",
      symbol: "XRP",
      img: "/images/xrp-xrp-logo.png",
      period: "2 days",
      stock: "1 units",
      daily: 150,
      return: 300,
      price: 250
    },
    {
      name: "Solona Coin",
      symbol: "SOL",
      img: "/images/solana-sol-logo.png",
      period: "90 days",
      stock: "1 units",
      daily: 70,
      return: 6300,
      price: 3000
    },
    {
      name: "Solona",
      symbol: "SOL",
      img: "/images/solana-sol-logo.png",
      period: "60 days",
      stock: "2 units",
      daily: 300,
      return: 18000,
      price: 8000
    },
    {
      name: "Solona Coin",
      symbol: "SOL",
      img: "/images/solana-sol-logo.png",
      period: "90 days",
      stock: "1 units",
      daily: 70,
      return: 6300,
      price: 3000
    },
    {
      name: "Solona",
      symbol: "SOL",
      img: "/images/solana-sol-logo.png",
      period: "60 days",
      stock: "2 units",
      daily: 300,
      return: 18000,
      price: 8000
    }
  ];

  // ==========================================
  // 2. State Management
  // ==========================================
  const State = {
    balance: 0,
    token: localStorage.getItem('token') || null,
    
    updateBalance(newBalance) {
      if (typeof newBalance !== 'number' || isNaN(newBalance)) return;
      this.balance = newBalance;
      UIManager.renderBalance();
    }
  };

  // ==========================================
  // 3. UI/DOM Manager
  // ==========================================
  const UIManager = {
    renderBalance() {
      const balanceEl = document.getElementById('balance-amount');
      if (balanceEl) {
        // Format to 2 decimal places
        balanceEl.textContent = State.balance.toFixed(2);
      }
    },

    renderMarketGrid() {
      const gridContainer = document.getElementById('mining-grid');
      if (!gridContainer) return;

      const cardsHtml = MARKET_DATA.map(coin => `
        <div class="bg-app-card border border-app-border rounded-xl flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/20">
          
          <div class="h-36 sm:h-40 w-full overflow-hidden bg-app-bg relative">
             <img src="${coin.img}" alt="${coin.name}" class="w-full h-full object-cover object-center p-0" onerror="this.src='https://via.placeholder.com/400x200?text=${coin.symbol}'">
             <div class="absolute inset-0 bg-gradient-to-t from-app-card to-transparent opacity-60"></div>
          </div>

          <div class="p-4 sm:p-5 flex-grow flex flex-col">
            <h4 class="text-white font-bold text-lg mb-4">${coin.name}</h4>
            
            <div class="space-y-2 mb-4">
              <div class="flex justify-between items-center text-sm">
                <span class="text-gray-400">Mining Period</span>
                <span class="text-gray-200">${coin.period}</span>
              </div>
              <div class="flex justify-between items-center text-sm">
                <span class="text-gray-400">Available Stock</span>
                <span class="text-gray-200">${coin.stock}</span>
              </div>
            </div>

            <div class="border-t border-app-border my-4"></div>

            <div class="grid grid-cols-3 gap-1 text-center mt-auto pb-2">
              <div>
                <p class="text-app-textBlue font-bold text-[15px] sm:text-base">${coin.daily}</p>
                <p class="text-gray-400 text-[9px] sm:text-[10px] mt-1 whitespace-nowrap">Daily Yield (${CONFIG.CURRENCY})</p>
              </div>
              <div>
                <p class="text-app-textBlue font-bold text-[15px] sm:text-base">${coin.return}</p>
                <p class="text-gray-400 text-[9px] sm:text-[10px] mt-1 whitespace-nowrap">Total Return (${CONFIG.CURRENCY})</p>
              </div>
              <div>
                <p class="text-app-textBlue font-bold text-[15px] sm:text-base">${coin.price}</p>
                <p class="text-gray-400 text-[9px] sm:text-[10px] mt-1 whitespace-nowrap">Price (${CONFIG.CURRENCY})</p>
              </div>
            </div>
          </div>

          <!-- Trading Action Button -->
          <!-- Note: we attach data-coin and data-price to handle the logic securely -->
          <button data-action="mine" data-coin="${coin.symbol}" data-price="${coin.price}" class="w-full bg-app-btnBlue hover:bg-sky-400 text-white font-bold py-3.5 text-sm transition-colors mt-auto">
            Start Mining
          </button>
        </div>
      `).join('');

      gridContainer.innerHTML = cardsHtml;
    },

    notify(message, isError = false) {
      alert(isError ? `⚠️ Error: ${message}` : `✅ ${message}`);
    }
  };

  // ==========================================
  // 4. API Service
  // ==========================================
  const ApiService = {
    handleAuthError() {
      localStorage.removeItem('token');
      window.location.href = '/login.html';
    },

    async fetchWithAuth(url, options = {}) {
      if (!State.token) {
        this.handleAuthError();
        return null;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${State.token}`,
        ...(options.headers || {})
      };

      try {
        const response = await fetch(url, { ...options, headers });
        
        if (response.status === 401) {
          this.handleAuthError();
          throw new Error('Session expired.');
        }
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`API Error [${url}]:`, error.message);
        throw error;
      }
    },

    async getCsrfToken() {
      try {
        const response = await fetch(CONFIG.API.CSRF, { credentials: 'include' });
        if (!response.ok) return null;
        const data = await response.json();
        return data.csrfToken;
      } catch {
        return null;
      }
    }
  };

  // ==========================================
  // 5. Business Logic (Trading)
  // ==========================================
  const Actions = {
    async loadPortfolio() {
      try {
        const data = await ApiService.fetchWithAuth(CONFIG.API.PORTFOLIO);
        if (data && typeof data.balance !== 'undefined') {
          State.updateBalance(Number(data.balance));
        }
      } catch (error) {
        UIManager.notify('Failed to load portfolio data.', true);
      }
    },

    async startMining(coinSymbol, contractPrice) {
      // 1. Frontend Validation
      if (State.balance < contractPrice) {
        UIManager.notify(`Insufficient balance. You need ${contractPrice} ${CONFIG.CURRENCY} to buy ${coinSymbol}.`, true);
        return;
      }

      // 2. Confirm Purchase
      if (!confirm(`Are you sure you want to buy the ${coinSymbol} mining contract for ${contractPrice} ${CONFIG.CURRENCY}?`)) {
        return;
      }

      // 3. API Request
      try {
        const csrfToken = await ApiService.getCsrfToken();
        const headers = csrfToken ? { 'X-CSRF-Token': csrfToken } : {};

        const result = await ApiService.fetchWithAuth(CONFIG.API.START_MINING, {
          method: 'POST',
          headers,
          body: JSON.stringify({ coin: coinSymbol })
        });

        // 4. Handle Success
        if (result && result.success) {
          UIManager.notify(`Successfully purchased ${coinSymbol} contract!`);
          
          if (typeof result.newBalance !== 'undefined') {
            State.updateBalance(Number(result.newBalance));
          } else {
            await this.loadPortfolio(); // Refetch if new balance isn't provided
          }
        }
      } catch (error) {
        UIManager.notify(error.message || `Failed to purchase ${coinSymbol}.`, true);
      }
    }
  };

  // ==========================================
  // 6. Event Delegation & Initialization
  // ==========================================
  function bindEvents() {
    document.addEventListener('click', (event) => {
      const target = event.target;

      // Handle Mining Buttons
      const mineBtn = target.closest('[data-action="mine"]');
      if (mineBtn) {
        const coin = mineBtn.dataset.coin;
        const price = Number(mineBtn.dataset.price);
        
        if (coin && !isNaN(price)) {
          Actions.startMining(coin, price);
        } else {
          console.error("Invalid coin data attached to button");
        }
        return;
      }

      // Handle Static Buttons
      if (target.id === 'deposit-btn') window.location.href = '/deposit.html';
    });
  }

  function init() {
    if (!State.token) {
      window.location.href = '/login.html';
      return;
    }

    UIManager.renderMarketGrid();
    bindEvents();
    Actions.loadPortfolio();
  }

  // Expose init publicly
  return { init };
})();

// Boot up
document.addEventListener('DOMContentLoaded', TradeApp.init);