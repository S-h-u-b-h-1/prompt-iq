import {
  clearSessionToken,
  fetchUserProfile,
  getUsageStatus,
  getSessionToken,
  getSmartTemplateQuotaStatus,
  loginUser,
  signupUser,
  trackTelemetry
} from '../lib/storage.js';
import { DISCLOSURE_VERSION, getCapturePreferences, setCapturePreferences } from '../lib/activity.js';
import { getCloudRewriteDisclosure } from '../lib/optimizer.js';

let authMode = 'login';
let currentUser = null;
let setupComplete = false;

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
  const supportButton = document.getElementById('support-btn');
  const copyUpiButton = document.getElementById('copy-upi-btn');
  const dashboardButton = document.getElementById('dashboard-btn');
  const openChatButton = document.getElementById('open-chat-btn');
  const tierBadge = document.getElementById('tier-badge');
  const accountTitle = document.getElementById('account-title');
  const accountCopy = document.getElementById('account-copy');
  const smartUsage = document.getElementById('smart-usage');
  const smartMeter = document.getElementById('smart-meter');
  const aiUsage = document.getElementById('ai-usage');
  const aiMeter = document.getElementById('ai-meter');
  const aiHelp = document.getElementById('ai-help');
  const usageDate = document.getElementById('usage-date');
  const versionLabel = document.getElementById('version-label');
  const authModes = document.querySelector('.auth-modes');
  const emailField = document.getElementById('auth-email-field');
  const passwordField = document.getElementById('auth-password-field');
  const privacyChoices = document.getElementById('privacy-choices');
  const historyConsent = document.getElementById('history-consent');
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
    submitButton.textContent = isConsent ? 'Save and continue' : isLogin ? 'Sign in' : 'Create account';
    passwordInput.autocomplete = isLogin ? 'current-password' : 'new-password';
    authModes.hidden = isConsent;
    emailField.hidden = isConsent;
    passwordField.hidden = isConsent;
    emailInput.required = !isConsent;
    passwordInput.required = !isConsent;
    privacyChoices.hidden = isLogin;
    historyConsent.required = !isLogin;
    loginModeButton.classList.toggle('active', isLogin);
    signupModeButton.classList.toggle('active', !isLogin);
    loginModeButton.setAttribute('aria-selected', String(isLogin));
    signupModeButton.setAttribute('aria-selected', String(!isLogin));
    clearAuthStatus();
  };

  const openAuth = (mode) => {
    setAuthMode(mode);
    historyConsent.checked = false;
    promptStorageConsent.checked = false;
    searchStorageConsent.checked = false;
    if (!dialog.open) dialog.showModal();
    window.setTimeout(() => (mode === 'consent' ? historyConsent : emailInput).focus(), 0);
  };

  const renderAccount = (user, ready = false) => {
    currentUser = user;
    setupComplete = Boolean(user && ready);
    tierBadge.textContent = 'FREE';
    accountTitle.textContent = user?.email || 'Account required';
    accountCopy.textContent = user
      ? setupComplete ? 'Quick Rewrite and account history are ready.' : 'Finish privacy setup to use PromptIQ.'
      : 'Create an account to use PromptIQ and keep your prompt history available.';
    signInButton.hidden = Boolean(user);
    signUpButton.hidden = Boolean(user);
    finishSetupButton.hidden = !user || setupComplete;
    logoutButton.hidden = !user;
    openChatButton.disabled = !setupComplete;
    dashboardButton.disabled = !user;
  };

  const renderUsage = async () => {
    const local = await getSmartTemplateQuotaStatus('free');
    smartUsage.textContent = setupComplete ? `${local.used} / ${local.limit}` : 'Locked';
    smartMeter.style.width = setupComplete ? `${Math.min(100, (local.used / local.limit) * 100)}%` : '0%';
    usageDate.textContent = local.date;

    if (!currentUser) {
      aiUsage.textContent = 'Account required';
      aiMeter.style.width = '0%';
      aiHelp.textContent = 'Create a free account to access PromptIQ.';
      return;
    }

    if (!setupComplete) {
      aiUsage.textContent = 'Setup required';
      aiMeter.style.width = '0%';
      aiHelp.textContent = 'Review privacy settings to finish account setup.';
      return;
    }

    try {
      if (!await getCloudRewriteDisclosure()) {
        aiUsage.textContent = 'Unavailable';
        aiMeter.style.width = '0%';
        aiHelp.textContent = 'Quick Rewrite is ready on your device.';
        return;
      }
      const usage = await getUsageStatus();
      const aiRewrite = usage?.aiRewrite;
      if (!aiRewrite) throw new Error('Usage unavailable');
      aiUsage.textContent = `${aiRewrite.used} / ${aiRewrite.limit}`;
      aiMeter.style.width = `${Math.min(100, (aiRewrite.used / aiRewrite.limit) * 100)}%`;
      aiHelp.textContent = `${aiRewrite.remaining} free AI rewrites remaining today.`;
    } catch (error) {
      aiUsage.textContent = 'Unavailable';
      aiMeter.style.width = '0%';
      aiHelp.textContent = 'Usage will refresh when the service is reachable.';
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
      renderAccount(user, preferences.disclosureVersion === DISCLOSURE_VERSION);
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
    submitButton.textContent = authMode === 'consent' ? 'Saving...' : authMode === 'login' ? 'Signing in...' : 'Creating account...';

    try {
      let user = currentUser;
      if (authMode !== 'consent') {
        const result = authMode === 'login'
          ? await loginUser(emailInput.value, passwordInput.value)
          : await signupUser(emailInput.value, passwordInput.value);
        user = result.user;
      }
      if (authMode === 'login') {
        const preferences = await getCapturePreferences(true);
        if (preferences.disclosureVersion !== DISCLOSURE_VERSION) {
          passwordInput.value = '';
          renderAccount(user);
          openAuth('consent');
          await renderUsage();
          return;
        }
      } else {
        await setCapturePreferences({saveDrafts:promptStorageConsent.checked,saveSearches:searchStorageConsent.checked});
      }
      renderAccount(user, true);
      await renderUsage();
      if (authMode !== 'consent') void trackTelemetry(authMode === 'login' ? 'login_completed' : 'signup_completed');
      else if (promptStorageConsent.checked) void trackTelemetry('prompt_storage_enabled');
      showAuthStatus(authMode === 'consent' ? 'Account setup complete.' : authMode === 'login' ? 'Signed in.' : 'Account created.', 'success');
      passwordInput.value = '';
      window.setTimeout(() => dialog.close(), 500);
    } catch (error) {
      if (authMode !== 'consent') await clearSessionToken();
      showAuthStatus(error.message || 'Authentication failed. Please try again.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = authMode === 'consent' ? 'Save and continue' : authMode === 'login' ? 'Sign in' : 'Create account';
    }
  });

  logoutButton.addEventListener('click', async () => {
    await clearSessionToken();
    await refreshAccount();
    showNotice('Signed out. Sign in again to use PromptIQ.', 'success');
  });

  copyUpiButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('shubhaang2201@axl');
      copyUpiButton.textContent = 'Copied';
      void trackTelemetry('contribution_upi_copied');
      window.setTimeout(() => { copyUpiButton.textContent = 'Copy UPI'; }, 1600);
    } catch {
      showNotice('UPI ID: shubhaang2201@axl', 'success');
    }
  });

  supportButton.addEventListener('click', async () => {
    void trackTelemetry('contribution_started');
    try {
      await openUrl('upi://pay?pa=shubhaang2201%40axl&pn=Shubhaang%20Kataruka&am=150&cu=INR&tn=Support%20PromptIQ');
    } catch {
      showNotice('Open a UPI app and pay shubhaang2201@axl.', 'success');
    }
  });

  dashboardButton.addEventListener('click', () => {
    openUrl(extensionUrl('src/popup/popup.html'));
  });
  openChatButton.addEventListener('click', () => {
    if (!setupComplete) {
      openAuth(currentUser ? 'consent' : 'signup');
      return;
    }
    openUrl('https://chatgpt.com/');
  });

  refreshAccount();
});
