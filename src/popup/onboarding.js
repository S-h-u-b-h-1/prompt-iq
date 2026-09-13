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
import { getCapturePreferences, setCapturePreferences } from '../lib/activity.js';

let authMode = 'login';
let currentUser = null;
let promptStorageReady = false;

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
  const finishSetupButton = document.getElementById('finish-setup-btn');
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
  const authModes = document.querySelector('.auth-modes');
  const emailField = document.getElementById('auth-email-field');
  const passwordField = document.getElementById('auth-password-field');
  const promptStorageConsent = document.getElementById('prompt-storage-consent');
  const searchStorageConsent = document.getElementById('search-storage-consent');

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
    const isConsent = mode === 'consent';
    const isLogin = mode === 'login';
    authTitle.textContent = isConsent ? 'Finish account setup' : isLogin ? 'Sign in' : 'Create account';
    submitButton.textContent = isConsent ? 'Enable and continue' : isLogin ? 'Sign in and continue' : 'Create account';
    passwordInput.autocomplete = isLogin ? 'current-password' : 'new-password';
    authModes.hidden = isConsent;
    emailField.hidden = isConsent;
    passwordField.hidden = isConsent;
    emailInput.required = !isConsent;
    passwordInput.required = !isConsent;
    loginModeButton.classList.toggle('active', isLogin);
    signupModeButton.classList.toggle('active', !isLogin);
    loginModeButton.setAttribute('aria-selected', String(isLogin));
    signupModeButton.setAttribute('aria-selected', String(!isLogin));
    clearAuthStatus();
  };

  const openAuth = (mode) => {
    setAuthMode(mode);
    promptStorageConsent.checked = false;
    searchStorageConsent.checked = false;
    if (!dialog.open) dialog.showModal();
    window.setTimeout(() => (mode === 'consent' ? promptStorageConsent : emailInput).focus(), 0);
  };

  const renderAccount = (user, storageReady = false) => {
    currentUser = user;
    promptStorageReady = Boolean(user && storageReady);
    const isPremium = user?.plan === 'premium';
    tierBadge.textContent = isPremium ? 'PREMIUM' : 'FREE';
    tierBadge.classList.toggle('premium', isPremium);
    accountTitle.textContent = user?.email || 'Account required';
    accountCopy.textContent = isPremium
      ? promptStorageReady ? 'Premium AI, prompt storage, and Smart Template are active.' : 'Finish privacy setup to use PromptIQ.'
      : user
        ? promptStorageReady ? 'Free account active with saved prompt history and 5 daily AI trials.' : 'Finish privacy setup to use PromptIQ.'
        : 'Create an account to use PromptIQ and keep your prompt history available.';
    signInButton.hidden = Boolean(user);
    signUpButton.hidden = Boolean(user);
    finishSetupButton.hidden = !user || promptStorageReady;
    logoutButton.hidden = !user;
    upgradeButton.hidden = isPremium;
    openChatButton.disabled = !promptStorageReady;
    dashboardButton.disabled = !promptStorageReady;
  };

  const renderUsage = async () => {
    const tier = currentUser?.plan === 'premium' ? 'premium' : 'free';
    const local = await getSmartTemplateQuotaStatus(tier);
    smartUsage.textContent = promptStorageReady ? `${local.used} / ${local.limit}` : 'Locked';
    smartMeter.style.width = promptStorageReady ? `${Math.min(100, (local.used / local.limit) * 100)}%` : '0%';
    usageDate.textContent = local.date;

    if (!currentUser) {
      premiumUsage.textContent = 'Account required';
      premiumMeter.style.width = '0%';
      premiumHelp.textContent = 'Create a free account to access PromptIQ.';
      return;
    }

    if (!promptStorageReady) {
      premiumUsage.textContent = 'Setup required';
      premiumMeter.style.width = '0%';
      premiumHelp.textContent = 'Review prompt storage and finish account setup.';
      return;
    }

    try {
      const usage = await getPremiumUsageStatus();
      const premium = usage?.premiumAi;
      if (!premium) throw new Error('Usage unavailable');
      premiumUsage.textContent = `${premium.used} / ${premium.limit}`;
      premiumMeter.style.width = `${Math.min(100, (premium.used / premium.limit) * 100)}%`;
      premiumHelp.textContent = tier === 'premium'
        ? `${premium.remaining} Premium AI optimizations remaining today.`
        : `${premium.remaining} free AI trial optimizations remaining today.`;
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
      renderAccount(null, false);
      await renderUsage();
      return;
    }

    try {
      const user = await fetchUserProfile();
      const preferences = await getCapturePreferences(true);
      renderAccount(user, preferences.saveDrafts === true);
      await renderUsage();
    } catch (error) {
      renderAccount(null, false);
      await renderUsage();
      showNotice('Account status could not be refreshed. Sign in again or retry shortly.', 'error');
    }
  };

  loginModeButton.addEventListener('click', () => setAuthMode('login'));
  signupModeButton.addEventListener('click', () => setAuthMode('signup'));
  signInButton.addEventListener('click', () => openAuth('login'));
  signUpButton.addEventListener('click', () => openAuth('signup'));
  finishSetupButton.addEventListener('click', () => openAuth('consent'));
  document.getElementById('auth-close-btn').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAuthStatus();
    submitButton.disabled = true;
    if (!promptStorageConsent.checked) {
      showAuthStatus('Prompt storage consent is required to use PromptIQ.');
      submitButton.disabled = false;
      return;
    }

    submitButton.textContent = authMode === 'consent' ? 'Enabling...' : authMode === 'login' ? 'Signing in...' : 'Creating account...';

    try {
      let user = currentUser;
      if (authMode !== 'consent') {
        const result = authMode === 'login'
          ? await loginUser(emailInput.value, passwordInput.value)
          : await signupUser(emailInput.value, passwordInput.value);
        user = result.user;
      }
      await setCapturePreferences({saveDrafts:true,saveSearches:searchStorageConsent.checked});
      renderAccount(user, true);
      await renderUsage();
      await trackTelemetry(authMode === 'consent' ? 'prompt_storage_enabled' : authMode === 'login' ? 'login_completed' : 'signup_completed');
      showAuthStatus(authMode === 'consent' ? 'Account setup complete.' : authMode === 'login' ? 'Signed in.' : 'Account created.', 'success');
      passwordInput.value = '';
      window.setTimeout(() => dialog.close(), 500);
    } catch (error) {
      if (authMode !== 'consent') await clearSessionToken();
      showAuthStatus(error.message || 'Authentication failed. Please try again.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = authMode === 'consent' ? 'Enable and continue' : authMode === 'login' ? 'Sign in and continue' : 'Create account';
    }
  });

  logoutButton.addEventListener('click', async () => {
    await clearSessionToken();
    await refreshAccount();
    showNotice('Signed out. Sign in again to use PromptIQ.', 'success');
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
  openChatButton.addEventListener('click', () => {
    if (!promptStorageReady) {
      openAuth(currentUser ? 'consent' : 'signup');
      return;
    }
    openUrl('https://chatgpt.com/');
  });

  trackTelemetry('popup_opened');
  refreshAccount();
});
