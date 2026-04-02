// login.js

function setError(message) {
  const errorDiv = document.getElementById('error');
  if (!errorDiv) return;
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
}

function clearError() {
  const errorDiv = document.getElementById('error');
  if (!errorDiv) return;
  errorDiv.textContent = '';
  errorDiv.classList.add('hidden');
}

function setLoginLoading(isLoading) {
  const loginBtn = document.getElementById('loginBtn');
  if (!loginBtn) return;

  loginBtn.disabled = isLoading;
  loginBtn.innerHTML = isLoading
    ? '<span>Signing In...</span>'
    : '<span>Login to Dashboard</span><span aria-hidden="true">→</span>';
}

function attachPasswordToggle() {
  const passwordInput = document.getElementById('password');
  const togglePassword = document.getElementById('togglePassword');

  if (!passwordInput || !togglePassword) return;

  togglePassword.addEventListener('click', () => {
    const nextType = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = nextType;
    togglePassword.textContent = nextType === 'password' ? 'Show' : 'Hide';
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginForm = document.getElementById('loginForm');
  const signupLink = document.getElementById('signupLink');
  const forgotPassword = document.getElementById('forgotPassword');
  const rememberMe = document.getElementById('rememberMe');
  const csrfTokenInput = document.getElementById('csrfToken');

  if (window.CryptoIconHelper && typeof window.CryptoIconHelper.mountCryptoIconGrid === 'function') {
    window.CryptoIconHelper.mountCryptoIconGrid('iconTray', ['btc', 'eth', 'xrp', 'ltc', 'doge', 'usdt']);
  }

  attachPasswordToggle();

  try {
    const response = await fetch('/api/csrf-token', { method: 'GET', credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch CSRF token');
    const { csrfToken } = await response.json();
    if (csrfTokenInput) csrfTokenInput.value = csrfToken;
  } catch (err) {
    setError('Unable to initialize secure session. Please refresh.');
    console.error('CSRF fetch error:', err);
    return;
  }

  const storedUsername = localStorage.getItem('rememberedUsername');
  const storedRemember = localStorage.getItem('rememberMe');
  if (storedUsername && usernameInput) {
    usernameInput.value = storedUsername;
  }
  if (storedRemember === 'true' && rememberMe) {
    rememberMe.checked = true;
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError();

      const username = usernameInput ? usernameInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      const csrfToken = csrfTokenInput ? csrfTokenInput.value : '';

      if (!username || !password) {
        setError('Please enter both username and password.');
        return;
      }

      if (!csrfToken) {
        setError('Secure token not found. Please reload the page.');
        return;
      }

      setLoginLoading(true);

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok && data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('username', username);

          if (rememberMe && rememberMe.checked) {
            localStorage.setItem('rememberedUsername', username);
            localStorage.setItem('rememberMe', 'true');
          } else {
            localStorage.removeItem('rememberedUsername');
            localStorage.setItem('rememberMe', 'false');
          }

          window.location.href = '/portfolio.html';
        } else {
          setError(data.error || 'Login failed. Check credentials.');
          console.warn('Login failed:', data.error);
        }
      } catch (err) {
        setError('Unable to login. Please try again shortly.');
        console.error('Login error:', err);
      } finally {
        setLoginLoading(false);
      }
    });
  }

  if (signupLink) {
    signupLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/signup.html';
    });
  }

  if (forgotPassword) {
    forgotPassword.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/support.html';
    });
  }
});
