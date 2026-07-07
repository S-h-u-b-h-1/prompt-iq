import {
  checkoutSubscription,
  clearSessionToken,
  fetchUserProfile,
  getSessionToken,
  loginUser,
  signupUser
} from '../lib/storage.js';

let authMode = 'login';

function openExtensionPage(path) {
  const url = chrome.runtime.getURL(path);
  if (chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url });
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  let currentUser = null;
  const dialog = document.getElementById('auth-dialog');
  const form = document.getElementById('auth-form');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const submitButton = document.getElementById('auth-submit-btn');
  const status = document.getElementById('auth-status');
  const title = document.getElementById('auth-dialog-title');
  const loginModeButton = document.getElementById('login-mode-btn');
  const signupModeButton = document.getElementById('signup-mode-btn');
  const authOpenButton = document.getElementById('auth-open-btn');
  const heroAuthButton = document.getElementById('hero-auth-btn');
  const upgradeButton = document.getElementById('upgrade-btn');
  const dashboardButton = document.getElementById('dashboard-btn');
  const logoutButton = document.getElementById('logout-btn');
  const tierBadge = document.getElementById('tier-badge');
  const accountCopy = document.getElementById('account-copy');

  const showStatus = (message, type = 'error') => {
    status.textContent = message;
    status.className = `auth-status visible ${type}`;
  };

  const clearStatus = () => {
    status.textContent = '';
    status.className = 'auth-status';
  };

  const setAuthMode = (mode) => {
    authMode = mode;
    const isLogin = mode === 'login';
    title.textContent = isLogin ? 'Sign in' : 'Create account';
    submitButton.textContent = isLogin ? 'Sign In' : 'Create Account';
    passwordInput.autocomplete = isLogin ? 'current-password' : 'new-password';
    loginModeButton.classList.toggle('active', isLogin);
    signupModeButton.classList.toggle('active', !isLogin);
    loginModeButton.setAttribute('aria-selected', String(isLogin));
    signupModeButton.setAttribute('aria-selected', String(!isLogin));
    clearStatus();
  };

  const openAuth = (mode = 'login', message = '') => {
    setAuthMode(mode);
    if (!dialog.open) dialog.showModal();
    if (message) showStatus(message, 'success');
    setTimeout(() => emailInput.focus(), 0);
  };

  const renderAccount = (user) => {
    currentUser = user;
    const isPremium = user?.plan === 'premium';
    tierBadge.textContent = isPremium ? 'PREMIUM' : 'FREE';
    tierBadge.classList.toggle('premium', isPremium);
    accountCopy.textContent = user
      ? `${user.email} - ${isPremium ? 'Premium AI is active.' : 'Free Smart Template is active.'}`
      : 'Smart Template runs locally. No account required.';
    authOpenButton.hidden = Boolean(user);
    dashboardButton.hidden = !user;
    logoutButton.hidden = !user;
    upgradeButton.hidden = isPremium;
    heroAuthButton.textContent = isPremium ? 'Premium Active' : (user ? 'Upgrade to Premium' : 'Sign In for Premium');
  };

  const refreshAccount = async () => {
    const token = await getSessionToken();
    if (!token) {
      renderAccount(null);
      return;
    }

    try {
      renderAccount(await fetchUserProfile());
    } catch (error) {
      accountCopy.textContent = 'Account check unavailable. Free Smart Template remains ready.';
    }
  };

  loginModeButton.addEventListener('click', () => setAuthMode('login'));
  signupModeButton.addEventListener('click', () => setAuthMode('signup'));
  authOpenButton.addEventListener('click', () => openAuth('login'));
  heroAuthButton.addEventListener('click', async () => {
    if (currentUser?.plan === 'premium') return;
    const token = await getSessionToken();
    if (token) {
      upgradeButton.click();
    } else {
      openAuth('login');
    }
  });
  document.getElementById('auth-close-btn').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearStatus();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    submitButton.disabled = true;
    submitButton.textContent = authMode === 'login' ? 'Signing In...' : 'Creating Account...';

    try {
      const result = authMode === 'login'
        ? await loginUser(email, password)
        : await signupUser(email, password);
      renderAccount({ ...result.user, plan: result.user.plan === 'pro' ? 'premium' : result.user.plan });
      showStatus(
        authMode === 'login'
          ? 'Signed in successfully.'
          : 'Account created. Free Smart Template is ready.',
        'success'
      );
      passwordInput.value = '';
      setTimeout(() => dialog.close(), 650);
    } catch (error) {
      showStatus(error.message || 'Authentication failed. Please try again.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = authMode === 'login' ? 'Sign In' : 'Create Account';
    }
  });

  upgradeButton.addEventListener('click', async () => {
    const token = await getSessionToken();
    if (!token) {
      openAuth('login', 'Sign in or create an account before upgrading.');
      return;
    }

    upgradeButton.disabled = true;
    upgradeButton.textContent = 'Activating...';
    try {
      const checkoutUrl = await checkoutSubscription();
      if (checkoutUrl && checkoutUrl.includes('simulated=true')) {
        // Success! Refresh status immediately
        await refreshAccount();
      } else {
        await chrome.tabs.create({ url: checkoutUrl });
      }
    } catch (error) {
      openAuth('login');
      showStatus(error.message || 'Unable to activate upgrade.');
    } finally {
      upgradeButton.disabled = false;
      upgradeButton.textContent = 'Activate Premium Trial';
    }
  });

  dashboardButton.addEventListener('click', () => {
    openExtensionPage('src/popup/popup.html');
  });

  logoutButton.addEventListener('click', async () => {
    await clearSessionToken();
    renderAccount(null);
  });

  refreshAccount();
});
