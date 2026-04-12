/**
 * CryptoMiningPro - Deposit Page Logic
 * Refactored for clean architecture, DRY principles, and reliability.
 */

"use strict";

const DepositApp = (() => {
  // ==========================================
  // 1. Configuration & Constants
  // ==========================================
  const CONFIG = {
    MIN_DEPOSIT: 1000,
    MAX_POLLS: 24,
    POLL_INTERVAL_MS: 5000,
    API: {
      PORTFOLIO: '/api/portfolio',
      DEPOSIT: '/api/deposit',
      CHECK_TX: '/api/check-transaction',
      CSRF: '/api/csrf-token'
    }
  };

  let pollInterval = null;
  let socket = null;

  // ==========================================
  // 2. UI Manager (Handles DOM Manipulation)
  // ==========================================
  const UI = {
    elements: {
      amountInput: document.getElementById('amount'),
      phoneInput: document.getElementById('phone'),
      continueBtn: document.getElementById('continue-btn'),
      btnText: document.getElementById('btn-text'),
      btnSpinner: document.getElementById('btn-spinner'),
      amountError: document.getElementById('amount-error'),
      phoneError: document.getElementById('phone-error'),
      statusMsg: document.getElementById('status-message'),
      errorMsg: document.getElementById('error-message'),
    },

    setLoading(isLoading) {
      const { continueBtn, btnText, btnSpinner } = this.elements;
      if (!continueBtn) return;
      
      continueBtn.disabled = isLoading;
      if (isLoading) {
        continueBtn.classList.add('btn-loading');
        btnText.textContent = 'Processing...';
        btnSpinner?.classList.remove('hidden');
      } else {
        continueBtn.classList.remove('btn-loading');
        btnText.textContent = 'Pay with M-Pesa (PayHero)';
        btnSpinner?.classList.add('hidden');
      }
    },

    showMessage(msg, isError = false) {
      const { statusMsg, errorMsg } = this.elements;
      if (statusMsg) {
        statusMsg.textContent = isError ? '' : msg;
        statusMsg.className = isError ? 'hidden' : 'block text-teal-400 text-sm mt-4 text-center';
      }
      if (errorMsg) {
        errorMsg.textContent = isError ? msg : '';
        errorMsg.className = isError ? 'block text-red-500 text-sm mt-4 text-center' : 'hidden';
      }
    },

    clearMessages() {
      this.showMessage('');
    }
  };

  // ==========================================
  // 3. API Service (Handles Fetching & Auth)
  // ==========================================
  const ApiService = {
    getToken() {
      return localStorage.getItem('token');
    },

    handleUnauthorized() {
      alert('Session expired. Please log in again.');
      localStorage.clear();
      window.location.href = '/index.html';
    },

    async fetch(url, options = {}) {
      const token = this.getToken();
      if (!token) return this.handleUnauthorized();

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {})
      };

      try {
        const response = await fetch(url, { ...options, headers, credentials: 'include' });
        
        if (response.status === 401) {
          return this.handleUnauthorized();
        }

        const data = await response.json().catch(() => ({}));
        
        if (!response.ok) {
          throw new Error(data.error || data.message || `HTTP ${response.status}`);
        }
        
        return data;
      } catch (error) {
        console.error(`API Error [${url}]:`, error.message);
        throw error;
      }
    },

    async getCsrf() {
      try {
        const res = await fetch(CONFIG.API.CSRF, { credentials: 'include' });
        if (!res.ok) return null;
        const data = await res.json();
        return data.csrfToken;
      } catch {
        return null;
      }
    }
  };

  // ==========================================
  // 4. Validators
  // ==========================================
  const Validator = {
    formatPhone(phoneRaw) {
      if (!phoneRaw) return null;
      let p = phoneRaw.replace(/\s+/g, '');
      // Transforms 07xx/01xx into +2547xx/+2541xx
      if (/^(07|01)\d{8}$/.test(p)) return '+254' + p.slice(1);
      // Ensures 254 starts with +
      if (/^254(7|1)\d{8}$/.test(p)) return '+' + p;
      // Validates already formatted +254
      if (/^\+254(7|1)\d{8}$/.test(p)) return p;
      return null;
    },

    checkForm() {
      const amount = parseFloat(UI.elements.amountInput?.value);
      const phone = Validator.formatPhone(UI.elements.phoneInput?.value);
      
      let isValid = true;

      // Amount validation
      if (isNaN(amount) || amount < CONFIG.MIN_DEPOSIT) {
        UI.elements.amountError?.classList.remove('hidden');
        isValid = false;
      } else {
        UI.elements.amountError?.classList.add('hidden');
      }

      // Phone validation
      if (!phone) {
        UI.elements.phoneError?.classList.remove('hidden');
        isValid = false;
      } else {
        UI.elements.phoneError?.classList.add('hidden');
      }

      if (UI.elements.continueBtn) UI.elements.continueBtn.disabled = !isValid;
      return { isValid, amount, phone };
    }
  };

  // ==========================================
  // 5. Core Business Logic
  // ==========================================
  const AppLogic = {
    async init() {
      this.setupSocket();
      this.bindEvents();
      await this.loadUserProfile();
    },

    setupSocket() {
      if (typeof io !== 'undefined') {
        socket = io();
        socket.on('connect', () => console.log('Socket connected'));
        
        socket.on('deposit_update', (data) => {
          const myUser = localStorage.getItem('username');
          if (data.username === myUser) {
            this.handlePaymentSuccess(data.amount);
          }
        });
      }
    },

    bindEvents() {
      const { amountInput, phoneInput, continueBtn } = UI.elements;
      
      if (amountInput) amountInput.addEventListener('input', Validator.checkForm);
      if (phoneInput) phoneInput.addEventListener('input', Validator.checkForm);
      
      if (continueBtn) {
        continueBtn.addEventListener('click', () => {
          if (!continueBtn.classList.contains('btn-loading')) this.processDeposit();
        });
      }
    },

    async loadUserProfile() {
      try {
        const userData = await ApiService.fetch(CONFIG.API.PORTFOLIO);
        if (!userData) return;

        // Prefill mobile number
        const mobile = userData.mobile || localStorage.getItem('mobile') || '';
        if (UI.elements.phoneInput && mobile) {
          UI.elements.phoneInput.value = mobile;
          Validator.checkForm();
        }
      } catch (error) {
        console.warn("Could not load user profile:", error);
      }
    },

    async processDeposit() {
      const { isValid, amount, phone } = Validator.checkForm();
      if (!isValid) return;

      UI.clearMessages();
      UI.setLoading(true);

      try {
        const csrfToken = await ApiService.getCsrf();
        const headers = csrfToken ? { 'X-CSRF-Token': csrfToken } : {};

        const data = await ApiService.fetch(CONFIG.API.DEPOSIT, {
          method: 'POST',
          headers,
          body: JSON.stringify({ amount, phoneNumber: phone })
        });

        const reference = data.reference || data.checkoutRequestId;
        UI.showMessage(`Payment initiated. Awaiting M-Pesa pin...`);
        
        if (reference) this.startPolling(reference);

      } catch (error) {
        UI.showMessage(error.message || 'Failed to initiate payment.', true);
        UI.setLoading(false);
      }
    },

    startPolling(reference) {
      if (pollInterval) clearInterval(pollInterval);
      let attempts = 0;

      pollInterval = setInterval(async () => {
        attempts++;
        try {
          const csrfToken = await ApiService.getCsrf();
          const headers = csrfToken ? { 'X-CSRF-Token': csrfToken } : {};

          const result = await ApiService.fetch(CONFIG.API.CHECK_TX, {
            method: 'POST',
            headers,
            body: JSON.stringify({ reference })
          });

          if (result.updated) {
            if (['SUCCESS', 'COMPLETED'].includes(result.status.toUpperCase())) {
              this.handlePaymentSuccess();
            } else if (['FAILED', 'REJECTED'].includes(result.status.toUpperCase())) {
              clearInterval(pollInterval);
              UI.showMessage('Deposit failed or cancelled by user.', true);
              UI.setLoading(false);
            }
          }

        } catch (error) {
          console.error("Polling error", error);
        }

        if (attempts >= CONFIG.MAX_POLLS) {
          clearInterval(pollInterval);
          UI.showMessage('Timeout waiting for confirmation. If money was deducted, your balance will update shortly.', true);
          UI.setLoading(false);
        }
      }, CONFIG.POLL_INTERVAL_MS);
    },

    handlePaymentSuccess(amount) {
      if (pollInterval) clearInterval(pollInterval);
      
      const msg = amount 
        ? `Deposit of KES ${Number(amount).toFixed(2)} successful!` 
        : 'Deposit successful!';
      
      alert(msg);
      window.location.href = '/trade.html';
    }
  };

  // Expose init globally
  return { init: () => AppLogic.init() };
})();

// Bootstrap
document.addEventListener('DOMContentLoaded', DepositApp.init);