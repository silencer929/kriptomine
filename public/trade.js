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
    // 4 Hours - Ultra Fast Bait (Price: 250 | Return: 400)
    { name: "Ripple XRP", symbol: "XRP", img: "/images/xrp-xrp-logo.png", period: "4 hours", stock: 10, hourly: 100, return: 400, price: 250 },
    
    // 6 Hours - Short & Sweet (Price: 1,200 | Return: 1,920)
    { name: "Solona Coin", symbol: "SOL", img: "/images/solana-sol-logo.png", period: "6 hours", stock: 20, hourly: 320, return: 1920, price: 1200 },
    
    // 8 Hours - Quick Shift (Price: 5,000 | Return: 8,000)
    { name: "Bitcoin", symbol: "BTC", img: "/images/bitcoin-new-logo.png", period: "8 hours", stock: 3, hourly: 1000, return: 8000, price: 5000 },
    
    // 10 Hours - Overnight (Price: 5,000 | Return: 8,000)
    { name: "Ethereum", symbol: "ETH", img: "/images/ethereum-eth-logo.png", period: "10 hours", stock: 10, hourly: 800, return: 8000, price: 5000 },
    
    // 16 Hours (Price: 8,000 | Return: 12,800)
    { name: "Doge Coin", symbol: "DOGE", img: "/images/dogecoin-doge-logo.png", period: "16 hours", stock: 2, hourly: 800, return: 12800, price: 8000 },
    
    // 20 Hours (Price: 10,000 | Return: 16,000)
    { name: "LiteCoin", symbol: "LTC", img: "/images/litecoin-ltc-logo.png", period: "20 hours", stock: 100, hourly: 800, return: 16000, price: 10000 },
    
    // 24 Hours - 1 Day (Price: 15,000 | Return: 24,000)
    { name: "BNB Coin", symbol: "BNB", img: "/images/bnb-coin-logo.png", period: "24 hours", stock: 5, hourly: 1000, return: 24000, price: 15000 },
    
    // 48 Hours - 2 Days (Price: 30,000 | Return: 48,000)
    { name: "Tether", symbol: "USDT", img: "/images/tether-usdt-logo.png", period: "48 hours", stock: 8, hourly: 1000, return: 48000, price: 30000 }
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

  function showSuccessModal(title, message) {
    const modal = document.getElementById('success-modal');
    document.getElementById('success-title').textContent = title;
    document.getElementById('success-message').textContent = message;
    
    modal.classList.remove('hidden');
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      modal.firstElementChild.classList.remove('scale-95');
    }, 10);
  }

  function closeSuccessModal() {
    const modal = document.getElementById('success-modal');
    modal.classList.add('opacity-0');
    modal.firstElementChild.classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
  }

  const UIManager = {
    renderBalance() {
      const balanceEl = document.getElementById('balance-amount');
      if (balanceEl) balanceEl.textContent = State.balance.toFixed(2);
    },

    renderMarketGrid() {
      const gridContainer = document.getElementById('mining-grid');
      if (!gridContainer) return;

      gridContainer.innerHTML = MARKET_DATA.map(coin => `
        <div class="crypto-card flex flex-col transition-all duration-300">
          
          <!-- Big Image -->
          <div class="w-full h-36 sm:h-40 mb-4 rounded-xl overflow-hidden bg-[#0B1221]">
             <img src="${coin.img}" alt="${coin.name}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1621416894569-0f39ed31d247?q=80&w=600&auto=format&fit=crop'">
          </div>

          <!-- Title -->
          <h3 class="text-white text-xl font-bold mb-4 tracking-wide">${coin.name}</h3>

          <!-- Details List -->
          <div class="flex flex-col gap-3 text-[13px] sm:text-sm mb-5">
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Mining Period</span>
              <span class="text-white font-medium">${coin.period}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Available Stock</span>
              <span class="text-white font-medium">${coin.stock} units</span>
            </div>
          </div>

          <!-- Thin Divider line -->
          <hr class="border-t border-white/10 mb-4">

          <!-- Stats Grid -->
          <div class="grid grid-cols-3 text-center mb-5">
            <div class="flex flex-col">
              <span class="text-white font-bold text-lg sm:text-xl">${coin.hourly}</span>
              <span class="text-gray-400 text-[10px] mt-1">Hourly Yield</span>
            </div>
            <div class="flex flex-col">
              <span class="text-white font-bold text-lg sm:text-xl">${coin.return}</span>
              <span class="text-gray-400 text-[10px] mt-1">Total Return</span>
            </div>
            <div class="flex flex-col">
              <span class="text-white font-bold text-lg sm:text-xl">${coin.price}</span>
              <span class="text-gray-400 text-[10px] mt-1">Price (KES)</span>
            </div>
          </div>

          <!-- Start Mining Button -->
          <button data-action="open-qty" data-symbol="${coin.symbol}" class="mt-auto w-full mining-btn text-white font-bold py-3.5 rounded-xl text-sm">
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
        Actions.finalizeMining();
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
      if (!State.token) return window.location.href = '/index.html';

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${State.token}`,
        ...(options.headers || {})
      };

      const response = await fetch(url, { ...options, headers, credentials: 'include' });
      if (response.status === 401) {
        localStorage.clear();
        window.location.href = '/index.html';
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
          showSuccessModal(
            "Contract Started!", 
            `You have successfully purchased ${qty}x ${coin.name}. Your mining is now active.`
          );
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

    // This function is called when we receive a real-time update that the deposit was successful.
    async handleDepositSuccess() {
      if (State.pollInterval) clearInterval(State.pollInterval);
      
      ModalController.showMpesaMessage('Deposit successful! Finalizing your contract...');
      
      // THE FIX: Instead of buying immediately, we first refresh our local data.
      // This ensures we have the absolute latest balance from the server before retrying the purchase.
      await this.loadPortfolio();

      // Now that State.balance is guaranteed to be up-to-date, we can safely buy.
      const totalCost = State.pendingTotalCost;

      if (State.balance >= totalCost) {
        // The balance is now sufficient, finalize the mining.
        await this.finalizeMining();
      } else {
        // This is a rare edge case, but good to handle.
        // It means the deposit was successful but still not enough for the contract.
        ModalController.closeAll();
        UIManager.notify(`Deposit successful, but your new balance of KES ${State.balance.toFixed(2)} is still not enough for this purchase of KES ${totalCost.toFixed(2)}.`, true);
      }
      
      // Reset the pending cost after the operation is complete or has failed.
      State.pendingTotalCost = 0;
    }
  };

  // Setup WebSocket connection for real-time updates
  function setupSockets() {
    if (typeof io !== 'undefined') {
      State.socket = io();
      State.socket.on('deposit_update', (data) => {
        const myUser = localStorage.getItem('username');

        // Check if this update is for the current user and if a purchase is pending
        if (data.username === myUser && State.pendingTotalCost > 0) {
          
          // ** THE FIX IS HERE **
          // 1. Update the frontend's balance state immediately.
          if (data.newBalance !== null) {
            State.updateBalance(data.newBalance);
          }
          
          // 2. Now proceed with the auto-purchase.
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
       if (target.id === 'btn-close-success') closeSuccessModal();
       if (target.id === 'btn-close-success-2') closeSuccessModal();

      if (target.id === 'deposit-btn') window.location.href = '/deposit.html';
    });
  }

  function init() {
    if (!State.token) return window.location.href = '/index.html';

    setupSockets();
    UIManager.renderMarketGrid();
    bindEvents();
    Actions.loadPortfolio();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', TradeApp.init);