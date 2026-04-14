/**
 * CryptoMiningPro - Withdrawal Proofs Page Logic
 */

"use strict";

const ProofsApp = (() => {
  const CONFIG = {
    API: {
      PROOFS: '/api/proofs',
      UPLOAD: '/api/proofs/upload',
      CSRF: '/api/csrf-token'
    }
  };

  const State = {
    token: localStorage.getItem('token') || null,
  };

  const UI = {
    elements: {
      grid: document.getElementById('proofs-grid'),
      loader: document.getElementById('grid-loader'),
      // Modal Elements
      backdrop: document.getElementById('upload-modal-backdrop'),
      modal: document.getElementById('upload-modal'),
      openBtn: document.getElementById('open-upload-modal-btn'),
      closeBtn: document.getElementById('close-upload-modal-btn'),
      form: document.getElementById('upload-form'),
      imageInput: document.getElementById('image-input'),
      imagePreviewBox: document.getElementById('image-preview-box'),
      imagePreview: document.getElementById('image-preview'),
      captionInput: document.getElementById('caption-input'),
      submitBtn: document.getElementById('submit-proof-btn'),
      submitBtnText: document.getElementById('submit-proof-text'),
      submitBtnSpinner: document.getElementById('submit-proof-spinner')
    },

    maskPhone(phone) {
      if (!phone || phone.length < 10) return 'Anonymous';
      // e.g., 0712345678 -> 071****678
      return `${phone.substring(0, 3)}****${phone.substring(phone.length - 3)}`;
    },

    renderProofsGrid(proofs) {
      if (!this.elements.grid) return;
      this.elements.loader.style.display = 'none';

      if (!proofs || proofs.length === 0) {
        this.elements.grid.innerHTML = `<p class="text-gray-500 col-span-full text-center">No withdrawal proofs have been submitted yet.</p>`;
        return;
      }

      this.elements.grid.innerHTML = proofs.map(proof => `
        <div class="bg-app-cardBg border border-white/5 rounded-xl p-4 flex flex-col space-y-4">
          <!-- Screenshot -->
          <div class="w-full h-64 bg-app-bgDark rounded-lg relative overflow-hidden">
            <img src="${proof.imageUrl}" alt="Withdrawal Proof" class="w-full h-full object-cover" onerror="this.style.display='none'">
            <div class="absolute top-3 right-3 bg-app-emerald text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293..."></path></svg>
              Verified
            </div>
          </div>
          <!-- Details -->
          <div>
            <div class="flex items-center gap-2 mb-3">
              <span class="w-1 h-5 bg-app-btnBlue rounded-full"></span>
              <p class="text-white font-semibold text-sm">${proof.caption || 'Successful Withdrawal'}</p>
            </div>
            <div class="flex justify-between items-center text-xs text-gray-400">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg>
                <span>${this.maskPhone(proof.phone)}</span>
              </div>
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span>${new Date(proof.date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    },
    
    toggleModal(show) {
      if (show) {
        this.elements.backdrop.classList.remove('hidden');
        this.elements.modal.classList.remove('hidden');
        setTimeout(() => {
          this.elements.backdrop.classList.remove('opacity-0');
          this.elements.modal.classList.remove('opacity-0', 'scale-95');
        }, 10);
      } else {
        this.elements.backdrop.classList.add('opacity-0');
        this.elements.modal.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
          this.elements.backdrop.classList.add('hidden');
          this.elements.modal.classList.add('hidden');
        }, 300);
      }
    },

    previewImage(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.elements.imagePreview.src = e.target.result;
        this.elements.imagePreview.classList.remove('hidden');
        this.elements.imagePreviewBox.classList.add('hidden', 'has-image');
      };
      reader.readAsDataURL(file);
    },

    setLoading(isLoading) {
      this.elements.submitBtn.disabled = isLoading;
      this.elements.submitBtnText.classList.toggle('hidden', isLoading);
      this.elements.submitBtnSpinner.classList.toggle('hidden', !isLoading);
    }
  };

  const ApiService = {
    async fetchWithAuth(url, options = {}) {
      if (!State.token && options.requiresAuth) {
        alert('You must be logged in to perform this action.');
        window.location.href = '/login.html';
        throw new Error('Not authenticated');
      }
      
      const headers = {
        ...(State.token && { 'Authorization': `Bearer ${State.token}` }),
        ...(options.headers || {})
      };
      
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      return data;
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

  const Actions = {
    async fetchAndRenderProofs() {
      try {
        const proofs = await ApiService.fetchWithAuth(CONFIG.API.PROOFS);
        UI.renderProofsGrid(proofs);
      } catch (error) {
        console.error('Failed to fetch proofs:', error);
        UI.elements.loader.textContent = 'Could not load proofs.';
      }
    },
    
    async handleUploadSubmit(event) {
      event.preventDefault();
      const imageFile = UI.elements.imageInput.files[0];
      const caption = UI.elements.captionInput.value;

      if (!imageFile) {
        alert('Please select a screenshot to upload.');
        return;
      }

      UI.setLoading(true);

      const formData = new FormData();
      formData.append('screenshot', imageFile);
      formData.append('caption', caption);

      try {
        const csrfToken = await ApiService.getCsrf();
        
        // Note: For FormData, we do not set 'Content-Type'. The browser does it.
        const result = await ApiService.fetchWithAuth(CONFIG.API.UPLOAD, {
          method: 'POST',
          body: formData,
          requiresAuth: true,
          headers: { ...(csrfToken && { 'X-CSRF-Token': csrfToken }) }
        });
        
        alert('Proof submitted successfully! It will appear after verification.');
        UI.toggleModal(false);
        UI.elements.form.reset();
        UI.elements.imagePreview.classList.add('hidden');
        UI.elements.imagePreviewBox.classList.remove('hidden', 'has-image');

      } catch (error) {
        alert(`Upload failed: ${error.message}`);
      } finally {
        UI.setLoading(false);
      }
    }
  };

  function bindEvents() {
    UI.elements.openBtn.addEventListener('click', () => UI.toggleModal(true));
    UI.elements.closeBtn.addEventListener('click', () => UI.toggleModal(false));
    UI.elements.backdrop.addEventListener('click', () => UI.toggleModal(false));
    
    UI.elements.imagePreviewBox.addEventListener('click', () => UI.elements.imageInput.click());
    UI.elements.imageInput.addEventListener('change', (e) => {
      if(e.target.files[0]) UI.previewImage(e.target.files[0]);
    });
    
    UI.elements.form.addEventListener('submit', Actions.handleUploadSubmit);
  }

  function init() {
    bindEvents();
    Actions.fetchAndRenderProofs();
  }
  
  return { init };
})();

document.addEventListener('DOMContentLoaded', ProofsApp.init);