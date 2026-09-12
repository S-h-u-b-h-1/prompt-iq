import {
  checkoutSubscription,
  clearSessionToken,
  fetchUserProfile,
  getPremiumUsageStatus,
  getSessionToken,
  getSmartTemplateQuotaStatus,
  loginUser,
  signupUser,
  trackTelemetry
} from '../lib/storage.js';

let authMode = 'login';
let currentUser = null;

function canUseChromeTabs() {
  return typeof chrome !== 'undefined' &&
    chrome.runtime?.id &&
    chrome.tabs?.create;
}

async function openUrl(url) {
  if (canUseChromeTabs()) {
    await chrome.tabs.create({ url });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function extensionUrl(path) {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(path);
  }
  return new URL(`/${String(path).replace(/^\/+/, '')}`, window.location.origin).href;
}

document.addEventListener('DOMContentLoaded', () => {
  const notice = document.getElementById('notice');
  const dialog = document.getElementById('auth-dialog');
  const form = document.getElementById('auth-form');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const submitButton = document.getElementById('auth-submit-btn');
  const authStatus = document.getElementById('auth-status');
  const authTitle = document.getElementById('auth-title');
  const loginModeButton = document.getElementById('login-mode-btn');
  const signupModeButton = document.getElementById('signup-mode-btn');
  const signInButton = document.getElementById('signin-btn');
  const signUpButton = document.getElementById('signup-btn');
  const logoutButton = document.getElementById('logout-btn');
  const upgradeButton = document.getElementById('upgrade-btn');
  const dashboardButton = document.getElementById('dashboard-btn');
  const openChatButton = document.getElementById('open-chat-btn');
  const tierBadge = document.getElementById('tier-badge');
  const accountTitle = document.getElementById('account-title');
  const accountCopy = document.getElementById('account-copy');
  const smartUsage = document.getElementById('smart-usage');
  const smartMeter = document.getElementById('smart-meter');
  const premiumUsage = document.getElementById('premium-usage');
  const premiumMeter = document.getElementById('premium-meter');
  const premiumHelp = document.getElementById('premium-help');
  const usageDate = document.getElementById('usage-date');
  const versionLabel = document.getElementById('version-label');

  if (versionLabel && globalThis.chrome?.runtime?.getManifest) {
    versionLabel.textContent = `Version ${chrome.runtime.getManifest().version}`;
  }

  const showNotice = (message, type = '') => {
    notice.textContent = message;
    notice.className = `notice visible ${type}`.trim();
  };

  const clearNotice = () => {
    notice.textContent = '';
    notice.className = 'notice';
  };

  const showAuthStatus = (message, type = 'error') => {
    authStatus.textContent = message;
    authStatus.className = `notice visible ${type}`;
  };

  const clearAuthStatus = () => {
    authStatus.textContent = '';
    authStatus.className = 'notice';
  };

  const setAuthMode = (mode) => {
    authMode = mode;
    const isLogin = mode === 'login';
    authTitle.textContent = isLogin ? 'Sign in' : 'Create account';
    submitButton.textContent = isLogin ? 'Sign in' : 'Create account';
    passwordInput.autocomplete = isLogin ? 'current-password' : 'new-password';
    loginModeButton.classList.toggle('active', isLogin);
    signupModeButton.classList.toggle('active', !isLogin);
    loginModeButton.setAttribute('aria-selected', String(isLogin));
    signupModeButton.setAttribute('aria-selected', String(!isLogin));
    clearAuthStatus();
  };

  const openAuth = (mode) => {
    setAuthMode(mode);
    if (!dialog.open) dialog.showModal();
    window.setTimeout(() => emailInput.focus(), 0);
  };

  const renderAccount = (user) => {
    currentUser = user;
    const isPremium = user?.plan === 'premium';
    tierBadge.textContent = isPremium ? 'PREMIUM' : 'FREE';
    tierBadge.classList.toggle('premium', isPremium);
    accountTitle.textContent = user?.email || 'Free local mode';
    accountCopy.textContent = isPremium
      ? 'Premium AI and Smart Template are active.'
      : user
        ? 'Signed in. Smart Template is active.'
        : 'No account required for Smart Template.';
    signInButton.hidden = Boolean(user);
    signUpButton.hidden = Boolean(user);
    logoutButton.hidden = !user;
    upgradeButton.hidden = isPremium;
  };

  const renderUsage = async () => {
    const tier = currentUser?.plan === 'premium' ? 'premium' : 'free';
    const local = await getSmartTemplateQuotaStatus(tier);
    smartUsage.textContent = `${local.used} / ${local.limit}`;
    smartMeter.style.width = `${Math.min(100, (local.used / local.limit) * 100)}%`;
    usageDate.textContent = local.date;

    if (tier !== 'premium') {
      premiumUsage.textContent = 'Premium only';
      premiumMeter.style.width = '0%';
      premiumHelp.textContent = 'Server-side Gemini optimization with protected API keys.';
      return;
    }

    try {
      const usage = await getPremiumUsageStatus();
      const premium = usage?.premiumAi;
      if (!premium) throw new Error('Usage unavailable');
      premiumUsage.textContent = `${premium.used} / ${premium.limit}`;
      premiumMeter.style.width = `${Math.min(100, (premium.used / premium.limit) * 100)}%`;
      premiumHelp.textContent = `${premium.remaining} Premium AI optimizations remaining today.`;
    } catch (error) {
      premiumUsage.textContent = 'Unavailable';
      premiumMeter.style.width = '0%';
      premiumHelp.textContent = 'Usage will refresh when the service is reachable.';
    }
  };

  const refreshAccount = async () => {
    clearNotice();
    const token = await getSessionToken();
    if (!token) {
      renderAccount(null);
      await renderUsage();
      return;
    }

    try {
      const user = await fetchUserProfile();
      renderAccount(user);
      await renderUsage();
    } catch (error) {
      renderAccount(null);
      await renderUsage();
      showNotice('Account status could not be refreshed. Free Smart Template remains available.', 'error');
    }
  };

  loginModeButton.addEventListener('click', () => setAuthMode('login'));
  signupModeButton.addEventListener('click', () => setAuthMode('signup'));
  signInButton.addEventListener('click', () => openAuth('login'));
  signUpButton.addEventListener('click', () => openAuth('signup'));
  document.getElementById('auth-close-btn').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAuthStatus();
    submitButton.disabled = true;
    submitButton.textContent = authMode === 'login' ? 'Signing in...' : 'Creating account...';

    try {
      const result = authMode === 'login'
        ? await loginUser(emailInput.value, passwordInput.value)
        : await signupUser(emailInput.value, passwordInput.value);
      renderAccount(result.user);
      await renderUsage();
      await trackTelemetry(authMode === 'login' ? 'login_completed' : 'signup_completed');
      showAuthStatus(authMode === 'login' ? 'Signed in.' : 'Account created.', 'success');
      passwordInput.value = '';
      window.setTimeout(() => dialog.close(), 500);
    } catch (error) {
      showAuthStatus(error.message || 'Authentication failed. Please try again.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = authMode === 'login' ? 'Sign in' : 'Create account';
    }
  });

  logoutButton.addEventListener('click', async () => {
    await clearSessionToken();
    await refreshAccount();
    showNotice('Signed out. Local Free mode remains available.', 'success');
  });

  upgradeButton.addEventListener('click', async () => {
    const token = await getSessionToken();
    if (!token) {
      openAuth('login');
      showAuthStatus('Sign in or create an account before upgrading.');
      return;
    }

    upgradeButton.disabled = true;
    upgradeButton.textContent = 'Opening...';
    clearNotice();
    try {
      const checkoutUrl = await checkoutSubscription();
      await trackTelemetry('checkout_started');
      await openUrl(checkoutUrl);
      showNotice('Razorpay checkout opened in a new tab. Refresh this popup after payment.', 'success');
    } catch (error) {
      showNotice(error.message || 'Premium checkout is unavailable.', 'error');
    } finally {
      upgradeButton.disabled = false;
      upgradeButton.textContent = 'Get Premium';
    }
  });

  dashboardButton.addEventListener('click', () => {
    openUrl(extensionUrl('src/popup/popup.html'));
  });
  openChatButton.addEventListener('click', () => openUrl('https://chatgpt.com/'));

  trackTelemetry('popup_opened');
  refreshAccount();
});
