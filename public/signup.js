console.log('Signup page loaded');

function showFormMessage(message, type = 'error') {
  const messageBox = document.getElementById('formMessage');
  if (!messageBox) {
    if (type === 'error') alert(message);
    return;
  }

  messageBox.textContent = message;
  messageBox.className = `form-message show ${type}`;
}

function clearFormMessage() {
  const messageBox = document.getElementById('formMessage');
  if (!messageBox) return;
  messageBox.textContent = '';
  messageBox.className = 'form-message';
}

function setButtonLoading(isLoading) {
  const signupBtn = document.getElementById('signup-btn');
  if (!signupBtn) return;

  signupBtn.disabled = isLoading;
  signupBtn.innerHTML = isLoading
    ? '<span>Creating Account...</span>'
    : '<span>Create Your Account</span><span aria-hidden="true">→</span>';
}

function renderCryptoTray() {
  const iconTray = document.getElementById('iconTray');
  if (!iconTray || !window.CryptoIconHelper) return;

  const symbols = ['btc', 'eth', 'xrp', 'ltc', 'doge', 'usdt'];
  iconTray.innerHTML = '';

  symbols.forEach(symbol => {
    const badge = document.createElement('div');
    badge.className = 'coin-badge';
    badge.appendChild(window.CryptoIconHelper.createCryptoIcon(symbol, 22, `${symbol.toUpperCase()} icon`));
    iconTray.appendChild(badge);
  });
}

function attachEventListeners() {
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await processSignup();
    });
  }

  document.querySelectorAll('[data-toggle-password]').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      const passwordInput = targetId ? document.getElementById(targetId) : null;
      if (!passwordInput) return;

      const nextType = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = nextType;
      button.textContent = nextType === 'password' ? 'Show' : 'Hide';
    });
  });
}

async function processSignup() {
  clearFormMessage();

  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const mobileInput = document.getElementById('mobile');
  const emailInput = document.getElementById('displayEmail');

  if (!usernameInput || !passwordInput || !mobileInput) {
    console.error('Signup inputs are missing from the page.');
    showFormMessage('The signup form is incomplete. Please refresh and try again.');
    return;
  }

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value.trim() : '';
  const mobile = mobileInput.value.trim();
  const email = emailInput ? emailInput.value.trim() : '';

  if (!username || !password || !mobile) {
    showFormMessage('Please enter your username, password, and mobile number.');
    return;
  }

  if (emailInput && email && !emailInput.checkValidity()) {
    showFormMessage('Please enter a valid email address.');
    return;
  }

  if (confirmPasswordInput && password !== confirmPassword) {
    showFormMessage('Your passwords do not match.');
    return;
  }

  if (!mobile.match(/^2547\d{8}$/)) {
    showFormMessage('Please enter a valid Kenyan mobile number starting with 2547.');
    return;
  }

  setButtonLoading(true);

  try {
    const csrfToken = await fetchCsrfToken();
    if (!csrfToken) {
      showFormMessage('Failed to start signup. Please refresh and try again.');
      return;
    }

    const response = await fetch('/api/signup', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ username, password, mobile })
    });

    if (!response.ok) {
      let errorText = 'Unable to create your account right now.';
      try {
        const errorData = await response.json();
        errorText = errorData.error || errorData.message || errorText;
      } catch (parseError) {
        console.warn('Could not parse signup error response:', parseError);
      }

      console.error(`Signup failed with status ${response.status}:`, errorText);
      showFormMessage(errorText);
      return;
    }

    const data = await response.json();
    showFormMessage(data.message || 'Signup successful! Redirecting to login...', 'success');

    const signupForm = document.getElementById('signup-form');
    if (signupForm) signupForm.reset();

    setTimeout(() => {
      window.location.href = '/index.html';
    }, 1200);
  } catch (error) {
    console.error('Signup error:', error?.message || error, error?.stack);
    showFormMessage('An unexpected error occurred during signup. Please try again.');
  } finally {
    setButtonLoading(false);
  }
}

async function fetchCsrfToken() {
  try {
    const response = await fetch('/api/csrf-token', { credentials: 'include' });
    if (!response.ok) {
      console.error(`CSRF token fetch failed with status: ${response.status} ${response.statusText}`);
      return null;
    }

    const { csrfToken } = await response.json();
    if (!csrfToken) {
      console.error('CSRF token missing from response body.');
      return null;
    }

    const csrfTokenInput = document.getElementById('csrfToken');
    if (csrfTokenInput) csrfTokenInput.value = csrfToken;
    return csrfToken;
  } catch (error) {
    console.error('CSRF token fetch error:', error?.message || error, error?.stack);
    return null;
  }
}

async function initializePage() {
  renderCryptoTray();
  attachEventListeners();
  await fetchCsrfToken();
}

document.addEventListener('DOMContentLoaded', initializePage);