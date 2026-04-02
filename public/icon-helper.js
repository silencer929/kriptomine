// icon-helper.js
// Crypto icon loader helper utility.

(function (global) {
  const localIconMap = {
    btc: '/images/bitcoin-btc-logo.png',
    eth: '/images/ethereum-eth-logo.png',
    xrp: '/images/xrp-xrp-logo.png',
    ltc: '/images/litecoin-ltc-logo.png',
    doge: '/images/dogecoin-doge-logo.png',
    sol: '/images/solana-sol-logo.png',
    usdt: '/images/tether-usdt-logo.png',
  };

  function cleanSymbol(symbol) {
    if (!symbol || typeof symbol !== 'string') return 'crypto';
    return symbol.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  }

  function getCryptoIconSrc(symbol) {
    const key = cleanSymbol(symbol);

    if (localIconMap[key]) {
      return localIconMap[key];
    }

    return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${key}.png`;
  }

  function createCryptoIcon(symbol, size = 28, alt = null) {
    const icon = document.createElement('img');
    icon.src = getCryptoIconSrc(symbol);
    icon.alt = alt || `${symbol.toUpperCase()} icon`;
    icon.width = size;
    icon.height = size;
    icon.className = 'crypto-logo inline-block rounded-full border border-white/25 bg-white/5 shadow-sm';
    icon.loading = 'lazy';

    icon.onerror = () => {
      // Fallback to a local placeholder if network icon fails.
      icon.src = '/images/bitcoin-btc-logo.png';
      icon.alt = 'crypto placeholder icon';
    };

    return icon;
  }

  function mountCryptoIconGrid(containerId, symbols = ['btc', 'eth', 'xrp', 'ltc']) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    symbols.forEach(symbol => {
      const wrapper = document.createElement('div');
      wrapper.className = 'crypto-icon-item p-1 flex flex-col items-center justify-center';
      const icon = createCryptoIcon(symbol, 28);
      const label = document.createElement('span');
      label.textContent = symbol.toUpperCase();
      label.className = 'text-xs text-gray-300 block mt-1 text-center tracking-wide';
      wrapper.appendChild(icon);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    });
  }

  global.CryptoIconHelper = {
    cleanSymbol,
    getCryptoIconSrc,
    createCryptoIcon,
    mountCryptoIconGrid,
  };
})(window);
