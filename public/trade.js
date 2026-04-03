/**
 * CryptoMiningPro - Trade Logic & Dynamic Rendering with Modals & Direct M-Pesa
 */

"use strict";

const TradeApp = (() => {
  const CONFIG = {
    CURRENCY: 'KES',
    MAX_POLLS: 24,
    POLL_INTERVAL_MS: 5000,
    API: {
      PORTFOLIO: '/api/portfolio',
      START_MINING: '/api/start-mining',
      DEPOSIT: '/api/deposit',
      CHECK_TX: '/api/check-transaction',
      CSRF: '/api/csrf-token'
    }
  };

  const MARKET_DATA = [
    { name: "Bitcoin", symbol: "BTC", img: "/images/bitcoin-new-logo.png", period: "6 days", stock: 3, daily: 2000, return: 12000, price: 5000 },
    { name: "Ripple XRP", symbol: "XRP", img: "/images/xrp-xrp-logo.png", period: "2 days", stock: 1, daily: 150, return: 300, price: 250 },
    { name: "Solona Coin", symbol: "SOL", img: "/images/solana-sol-logo.png", period: "90 days", stock: 20, daily: 70, return: 6300, price: 1200 },
    { name: "Doge Coin", symbol: "DOGE", img: "/images/dogecoin-doge-logo.png", period: "60 days", stock: 2, daily: 300, return: 18000, price: 8000 },
    { name: "BNB Coin", symbol: "BNB", img: "/images/bnb-coin-logo.png", period: "1200 days", stock: 5, daily: 1200, return: 37000, price: 15000 },
    { name: "Ethereum", symbol: "ETH", img: "/images/ethereum-eth-logo.png", period: "10 days", stock: 10, daily: 1200, return: 120000, price: 5000 },
    { name: "Tether", symbol: "USDT", img: "/images/tether-usdt-logo.png", period: "20 days", stock: 8, daily: 3200, return: 64000, price: 30000 },
    { name: "LiteCoin", symbol: "LTC", img: "/images/litecoin-ltc-logo.png", period: "6 days", stock: 100, daily: 6000, return: 36000, price: 10000 }
  ];

  const State = {
    balance: 0,
    phone: '',
    token: localStorage.getItem('token') || null,
    pollInterval: null,
    socket: null,
    
    // Modal State
    activeCoin: null,
    selectedQuantity: 1,
    pendingTotalCost: 0,

    updateBalance(newBalance) {
      if (typeof newBalance !== 'number' || isNaN(newBalance)) return;
      this.balance = newBalance;
      UIManager.renderBalance();
    }
  };

  const UIManager = {
    renderBalance() {
      const balanceEl = document.getElementById('balance-amount');
      if (balanceEl) balanceEl.textContent = State.balance.toFixed(2);
    },

    renderMarketGrid() {
      const gridContainer = document.getElementById('mining-grid');
      if (!gridContainer) return;

      gridContainer.innerHTML = MARKET_DATA.map(coin => `
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
                <span class="text-gray-200">${coin.stock} units</span>
              </div>
            </div>
            <div class="border-t border-app-border my-4"></div>
            <div class="grid grid-cols-3 gap-1 text-center mt-auto pb-2">
              <div>
                <p class="text-app-textBlue font-bold text-[15px] sm:text-base">${coin.daily}</p>
                <p class="text-gray-400 text-[9px] sm:text-[10px] mt-1 whitespace-nowrap">Daily Yield</p>
              </div>
              <div>
                <p class="text-app-textBlue font-bold text-[15px] sm:text-base">${coin.return}</p>
                <p class="text-gray-400 text-[9px] sm:text-[10px] mt-1 whitespace-nowrap">Total Return</p>
              </div>
              <div>
                <p class="text-app-textBlue font-bold text-[15px] sm:text-base">${coin.price}</p>
                <p class="text-gray-400 text-[9px] sm:text-[10px] mt-1 whitespace-nowrap">Price (KES)</p>
              </div>
            </div>
          </div>
          <button data-action="open-qty" data-symbol="${coin.symbol}" class="w-full bg-app-btnBlue hover:bg-sky-400 text-white font-bold py-3.5 text-sm transition-colors mt-auto">
            Start Mining
          </button>
        </div>
      `).join('');
    },

    notify(message, isError = false) {
      alert(isError ? `⚠️ Error: ${message}` : `✅ ${message}`);
    }
  };

  const ModalController = {
    elements: {
      backdrop: document.getElementById('modal-backdrop'),
      qtyModal: document.getElementById('quantity-modal'),
      mpesaModal: document.getElementById('mpesa-modal'),
      
      coinName: document.getElementById('modal-coin-name'),
      qtyInput: document.getElementById('qty-input'),
      dailyYield: document.getElementById('modal-daily'),
      totalReturn: document.getElementById('modal-return'),
      availStock: document.getElementById('modal-stock'),
      totalInvest: document.getElementById('modal-investment'),
      
      mpesaAmount: document.getElementById('mpesa-amount'),
      mpesaPhone: document.getElementById('mpesa-phone'),
      mpesaStatus: document.getElementById('mpesa-status'),
      mpesaError: document.getElementById('mpesa-error'),
      payMpesaBtn: document.getElementById('btn-pay-mpesa'),
      payMpesaText: document.getElementById('btn-pay-mpesa-text'),
      payMpesaSpinner: document.getElementById('btn-pay-mpesa-spinner')
    },

    openQuantityModal(coinSymbol) {
      const coin = MARKET_DATA.find(c => c.symbol === coinSymbol);
      if (!coin) return;

      State.activeCoin = coin;
      State.selectedQuantity = 1;

      if (coin.stock < 1) {
        UIManager.notify("This coin is currently out of stock.", true);
        return;
      }

      this.updateQuantityUI();
      this.elements.backdrop.classList.remove('hidden');
      this.elements.qtyModal.classList.remove('hidden');
      setTimeout(() => {
        this.elements.backdrop.classList.remove('opacity-0');
        this.elements.qtyModal.classList.remove('opacity-0', 'scale-95');
      }, 10);
    },

    updateQuantityUI() {
      const coin = State.activeCoin;
      const q = State.selectedQuantity;

      this.elements.coinName.textContent = coin.name;
      this.elements.qtyInput.value = q;
      this.elements.dailyYield.textContent = `${CONFIG.CURRENCY} ${coin.daily * q}`;
      this.elements.totalReturn.textContent = `${CONFIG.CURRENCY} ${coin.return * q}`;
      this.elements.availStock.textContent = `${coin.stock} units`;
      this.elements.totalInvest.textContent = `${CONFIG.CURRENCY} ${coin.price * q}`;
    },

    changeQuantity(delta) {
      if (!State.activeCoin) return;
      let newQty = State.selectedQuantity + delta;
      if (newQty < 1) newQty = 1;
      if (newQty > State.activeCoin.stock) newQty = State.activeCoin.stock;

      State.selectedQuantity = newQty;
      this.updateQuantityUI();
    },

    processMiningRequest() {
      State.pendingTotalCost = State.activeCoin.price * State.selectedQuantity;

      if (State.balance >= State.pendingTotalCost) {
        // Sufficient Balance - Buy Directly
        if (confirm(`Confirm purchase of ${State.selectedQuantity}x ${State.activeCoin.name} for KES ${State.pendingTotalCost}?`)) {
          Actions.finalizeMining();
        }
      } else {
        // Insufficient Balance - Show M-Pesa Deposit Modal
        this.elements.qtyModal.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
          this.elements.qtyModal.classList.add('hidden');
          
          this.elements.mpesaAmount.textContent = `${CONFIG.CURRENCY} ${State.pendingTotalCost}`;
          this.elements.mpesaPhone.value = State.phone || localStorage.getItem('mobile') || '';
          this.showMpesaMessage('', false);
          
          this.elements.mpesaModal.classList.remove('hidden');
          setTimeout(() => {
            this.elements.mpesaModal.classList.remove('opacity-0', 'scale-95');
          }, 10);
        }, 300);
      }
    },

    setMpesaLoading(isLoading) {
      this.elements.payMpesaBtn.disabled = isLoading;
      if (isLoading) {
        this.elements.payMpesaText.textContent = "Processing...";
        this.elements.payMpesaSpinner.classList.remove('hidden');
      } else {
        this.elements.payMpesaText.textContent = "Pay Now";
        this.elements.payMpesaSpinner.classList.add('hidden');
      }
    },

    showMpesaMessage(msg, isError = false) {
      if (isError) {
        this.elements.mpesaError.textContent = msg;
        this.elements.mpesaError.classList.remove('hidden');
        this.elements.mpesaStatus.classList.add('hidden');
      } else {
        this.elements.mpesaStatus.textContent = msg;
        if(msg) this.elements.mpesaStatus.classList.remove('hidden');
        this.elements.mpesaError.classList.add('hidden');
      }
    },

    closeAll() {
      if(State.pollInterval) clearInterval(State.pollInterval);
      
      if(this.elements.backdrop) this.elements.backdrop.classList.add('opacity-0');
      if(this.elements.qtyModal) this.elements.qtyModal.classList.add('opacity-0', 'scale-95');
      if(this.elements.mpesaModal) this.elements.mpesaModal.classList.add('opacity-0', 'scale-95');
      
      setTimeout(() => {
        if(this.elements.backdrop) this.elements.backdrop.classList.add('hidden');
        if(this.elements.qtyModal) this.elements.qtyModal.classList.add('hidden');
        if(this.elements.mpesaModal) this.elements.mpesaModal.classList.add('hidden');
      }, 300);
    }
  };

  const ApiService = {
    async fetchWithAuth(url, options = {}) {
      if (!State.token) return window.location.href = '/login.html';

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${State.token}`,
        ...(options.headers || {})
      };

      const response = await fetch(url, { ...options, headers, credentials: 'include' });
      if (response.status === 401) {
        localStorage.clear();
        window.location.href = '/login.html';
      }
      
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);
      return data;
    },

    async getCsrfToken() {
      try {
        const res = await fetch(CONFIG.API.CSRF, { credentials: 'include' });
        return res.ok ? (await res.json()).csrfToken : null;
      } catch { return null; }
    }
  };

  const Actions = {
    formatPhone(phoneRaw) {
      if (!phoneRaw) return null;
      let p = phoneRaw.replace(/\s+/g, '');
      if (/^(07|01)\d{8}$/.test(p)) return '+254' + p.slice(1);
      if (/^254(7|1)\d{8}$/.test(p)) return '+' + p;
      if (/^\+254(7|1)\d{8}$/.test(p)) return p;
      return null;
    },

    async loadPortfolio() {
      try {
        const data = await ApiService.fetchWithAuth(CONFIG.API.PORTFOLIO);
        if (data) {
          if (typeof data.balance !== 'undefined') State.updateBalance(Number(data.balance));
          if (data.mobile) State.phone = data.mobile;
        }
      } catch (error) {
        console.warn('Failed to load portfolio.');
      }
    },

    async finalizeMining() {
      const coin = State.activeCoin;
      const qty = State.selectedQuantity;
      
      try {
        const csrfToken = await ApiService.getCsrfToken();
        const headers = csrfToken ? { 'X-CSRF-Token': csrfToken } : {};

        const result = await ApiService.fetchWithAuth(CONFIG.API.START_MINING, {
          method: 'POST',
          headers,
          body: JSON.stringify({ coin: coin.symbol, quantity: qty })
        });

        if (result && result.success) {
          ModalController.closeAll();
          UIManager.notify(`Successfully purchased ${qty}x ${coin.name}!`);
          if (typeof result.newBalance !== 'undefined') State.updateBalance(Number(result.newBalance));
          else await this.loadPortfolio();
        }
      } catch (error) {
        UIManager.notify(error.message || `Failed to purchase contract.`, true);
      }
    },

    async initiateMpesaDeposit() {
      const phoneInput = ModalController.elements.mpesaPhone.value;
      const formattedPhone = this.formatPhone(phoneInput);

      if (!formattedPhone) {
        return ModalController.showMpesaMessage('Enter a valid phone number (e.g. 07XXXXXXXX)', true);
      }

      ModalController.setMpesaLoading(true);
      ModalController.showMpesaMessage('Initiating M-Pesa prompt... Check your phone.');

      try {
        const csrfToken = await ApiService.getCsrfToken();
        const headers = csrfToken ? { 'X-CSRF-Token': csrfToken } : {};

        const data = await ApiService.fetchWithAuth(CONFIG.API.DEPOSIT, {
          method: 'POST',
          headers,
          body: JSON.stringify({ amount: State.pendingTotalCost, phoneNumber: formattedPhone })
        });

        const reference = data.reference || data.checkoutRequestId;
        if (reference) this.startPolling(reference);
      } catch (error) {
        ModalController.showMpesaMessage(error.message || 'Payment initiation failed.', true);
        ModalController.setMpesaLoading(false);
      }
    },

    startPolling(reference) {
      if (State.pollInterval) clearInterval(State.pollInterval);
      let attempts = 0;

      State.pollInterval = setInterval(async () => {
        attempts++;
        try {
          const csrfToken = await ApiService.getCsrfToken();
          const headers = csrfToken ? { 'X-CSRF-Token': csrfToken } : {};

          const result = await ApiService.fetchWithAuth(CONFIG.API.CHECK_TX, {
            method: 'POST',
            headers,
            body: JSON.stringify({ reference })
          });

          if (result.updated) {
            if (['SUCCESS', 'COMPLETED'].includes(result.status.toUpperCase())) {
              this.handleDepositSuccess();
            } else if (['FAILED', 'REJECTED'].includes(result.status.toUpperCase())) {
              clearInterval(State.pollInterval);
              ModalController.showMpesaMessage('Payment failed or cancelled by user.', true);
              ModalController.setMpesaLoading(false);
            }
          }
        } catch (error) {
          console.error("Polling error", error);
        }

        if (attempts >= CONFIG.MAX_POLLS) {
          clearInterval(State.pollInterval);
          ModalController.showMpesaMessage('Timeout waiting for confirmation.', true);
          ModalController.setMpesaLoading(false);
        }
      }, CONFIG.POLL_INTERVAL_MS);
    },

    async handleDepositSuccess() {
      if (State.pollInterval) clearInterval(State.pollInterval);
      ModalController.showMpesaMessage('Deposit successful! Purchasing contract...');
      
      // Auto-buy the contract now that balance is funded
      await this.finalizeMining();
      ModalController.setMpesaLoading(false);
    }
  };

  function setupSockets() {
    if (typeof io !== 'undefined') {
      State.socket = io();
      State.socket.on('deposit_update', (data) => {
        const myUser = localStorage.getItem('username');
        if (data.username === myUser && State.pendingTotalCost > 0) {
           // Direct socket confirmation received
           Actions.handleDepositSuccess();
        }
      });
    }
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const target = event.target;

      const openBtn = target.closest('[data-action="open-qty"]');
      if (openBtn) ModalController.openQuantityModal(openBtn.dataset.symbol);

      const mineBtn = target.closest('[data-action="mine"]');
      if (mineBtn) ModalController.openQuantityModal(mineBtn.dataset.coin);

      if (target.id === 'qty-plus') ModalController.changeQuantity(1);
      if (target.id === 'qty-minus') ModalController.changeQuantity(-1);

      if (target.id === 'btn-proceed-payment') ModalController.processMiningRequest();
      if (target.id === 'btn-pay-mpesa') Actions.initiateMpesaDeposit();
      
      if (target.id === 'close-qty-modal' || target.id === 'btn-cancel-mpesa' || target.id === 'modal-backdrop') {
        ModalController.closeAll();
      }

      if (target.id === 'deposit-btn') window.location.href = '/deposit.html';
    });
  }

  function init() {
    if (!State.token) return window.location.href = '/login.html';

    setupSockets();
    UIManager.renderMarketGrid();
    bindEvents();
    Actions.loadPortfolio();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', TradeApp.init);