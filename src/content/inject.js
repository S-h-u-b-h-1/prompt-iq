import { getAdapter } from '../lib/adapters.js';
import { scorePrompt } from '../lib/scorer.js';
import { createPanel } from '../components/panel.js';
import { DISCLOSURE_VERSION, getCapturePreferences, saveActivity } from '../lib/activity.js';
import { getCloudRewriteDisclosure } from '../lib/optimizer.js';
import { createDraftRecorder } from '../lib/draft-recorder.js';
import {
  saveOptimization,
  getSessionToken,
  clearSessionToken,
  toggleFavoritePrompt,
  consumeSmartTemplateQuota,
  trackTelemetry
} from '../lib/storage.js';
import { diffPrompt } from '../lib/diff.js';
import { explainChanges } from '../lib/explain.js';
import { analyzeAndEnhancePrompt, checkStructure } from '../lib/local-optimizer.js';

let currentInputEl = null;
let panelApi = null;
let adapter = null;
let currentRoute = '';
let resultTarget = null;
let undoTarget = null;
let observer = null;
let composerFrame = 0;
let writingComposer = false;
let accountReady = false;
let draftToken = null;
let accountSync = 0;
const draftRecorder = createDraftRecorder((entry) => draftToken && saveActivity(entry, draftToken));

async function syncAccountAccess(tokenOverride) {
  const request = ++accountSync;
  accountReady = false;
  draftToken = null;
  draftRecorder.reset();
  const token = tokenOverride === undefined ? await getSessionToken() : tokenOverride;
  let preferences;

  if (token) {
    try {
      preferences = await getCapturePreferences(true);
    } catch {
      // Account access stays disabled until the disclosure can be checked.
    }
  }

  const activeToken = await getSessionToken();
  if (request !== accountSync || token !== activeToken) return;
  accountReady = Boolean(token && preferences?.disclosureVersion === DISCLOSURE_VERSION);
  draftToken = accountReady && preferences.saveDrafts ? token : null;
  panelApi?.setLoggedState(Boolean(token));
  panelApi?.setStorageReady(accountReady);
  panelApi?.setCloudRewrite(null);

  if (accountReady && currentInputEl) {
    handleInput();
  }
  if (accountReady) {
    const cloudRewrite = await getCloudRewriteDisclosure();
    if (request === accountSync) panelApi?.setCloudRewrite(cloudRewrite);
  }
}

function isContextValid() {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
    cleanup();
    return false;
  }
  return true;
}

function cleanup() {
  draftRecorder.reset();
  try {
    if (currentInputEl) {
      currentInputEl.removeEventListener('input', handleInput);
    }
    observer?.disconnect();
    cancelAnimationFrame(composerFrame);
    document.removeEventListener('focusin', scheduleComposerRefresh);
    window.navigation?.removeEventListener('currententrychange', scheduleComposerRefresh);
    window.removeEventListener('keydown', handleKeydown);
    
    const container = document.getElementById('promptiq-container');
    if (container) {
      container.remove();
    }
  } catch (err) {
    // Silently fail during cleanup
  }
}

function setupStorageListener() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local' || !panelApi) return;

        if (changes.sessionToken) {
          resultTarget = null;
          undoTarget = null;
          panelApi.clearResult();
          draftRecorder.reset();
          const newToken = changes.sessionToken.newValue;
          void syncAccountAccess(newToken);
        }
        if (changes.promptIqCapturePreferencesVersion) {
          void syncAccountAccess();
        }
        if (changes.userTier) {
          panelApi.setTier(changes.userTier.newValue || 'free');
        }
      });
    }
  } catch (err) {
    // Context invalidated
  }
}

function init() {
  adapter = getAdapter();
  if (!adapter || document.getElementById('promptiq-container')) return;

  ensurePanelInjected();
  panelApi.setPlatform(adapter.platform);
  refreshComposer();
  void syncAccountAccess();
  setupObserver();
  setupKeyboardShortcut();
  setupMessageListeners();
  setupStorageListener();
}

function handleInput(event) {
  if (!isContextValid()) return;
  if (!currentInputEl?.isConnected || !panelApi || writingComposer) return;
  if (!accountReady) return;
  const text = adapter.getText(currentInputEl);
  if (draftToken && event?.isTrusted && typeof text === 'string') {
    draftRecorder.schedule(text, adapter.platform, panelApi.getSettings().mode);
  }
  const scoreData = scorePrompt(text);
  
  // Local structure check to identify missing prompt elements
  const structure = checkStructure(text);
  scoreData.missing = structure.missing;
  
  panelApi.updateScore(scoreData);
}

function refreshComposer() {
  const route = location.pathname + location.search;
  const el = adapter.getInputElement(route === currentRoute ? currentInputEl : null);
  if (el === currentInputEl && route === currentRoute) return;
  const routeChanged = route !== currentRoute;
  draftRecorder.reset();
  currentInputEl?.removeEventListener('input', handleInput);
  currentInputEl = el;
  currentRoute = route;
  panelApi.setComposerAvailable(Boolean(el));
  if (routeChanged) {
    resultTarget = null;
    undoTarget = null;
    panelApi.clearResult();
  }
  currentInputEl?.addEventListener('input', handleInput);
  if (el && accountReady) handleInput();
}

function scheduleComposerRefresh() {
  if (composerFrame) return;
  composerFrame = requestAnimationFrame(() => {
    composerFrame = 0;
    if (isContextValid()) refreshComposer();
  });
}

function setupObserver() {
  observer = new MutationObserver(scheduleComposerRefresh);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['contenteditable', 'hidden', 'inert', 'aria-hidden', 'disabled', 'readonly', 'aria-disabled', 'aria-readonly']
  });
  document.addEventListener('focusin', scheduleComposerRefresh);
  window.navigation?.addEventListener('currententrychange', scheduleComposerRefresh);
}

async function handleLogout() {
  await clearSessionToken();
  resultTarget = null;
  undoTarget = null;
  ++accountSync;
  accountReady = false;
  draftToken = null;
  draftRecorder.reset();
  if (panelApi) {
    panelApi.clearResult();
    panelApi.setLoggedState(false);
    panelApi.setStorageReady(false);
    panelApi.setTier('free');
    panelApi.showError(new Error('Signed out. Create an account or sign in to use PromptIQ.'));
  }
}

function ensurePanelInjected() {
  if (document.getElementById('promptiq-container')) return;

  panelApi = createPanel(handleOptimize, handleUse, handleFeedback, handleLogout, handleUndo, handleFavorite);
  document.body.appendChild(panelApi.container);
}

function handleKeydown(e) {
  if (!isContextValid()) return;
  // Ctrl + Shift + P
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
    refreshComposer();
    if (!currentInputEl) return;
    e.preventDefault();
    panelApi.toggleVisibility();
  }
}

function setupKeyboardShortcut() {
  window.addEventListener('keydown', handleKeydown);
}

function setupMessageListeners() {
  try {
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (!isContextValid()) return;
      if (sender.id === chrome.runtime.id && message.action === 'OPTIMIZE_SELECTION') {
        refreshComposer();
        if (currentInputEl && typeof message.text === 'string') {
          panelApi.open();
          void handleOptimize(message.text);
        }
      }
    });
  } catch (err) {
    // Context might already be invalid
  }
}

async function handleOptimize(selection = null) {
  if (!isContextValid()) return;
  const token = await getSessionToken();
  if (!token || !accountReady) {
    panelApi.showAccountRequired(token ? 'consent' : 'signin');
    return;
  }
  refreshComposer();
  if (!currentInputEl) {
    panelApi.showError(new Error('No chat composer is open. Paste your draft into the PromptIQ toolbar to rewrite it.'));
    return;
  }
  const target = { el: currentInputEl, route: currentRoute, text: adapter.getText(currentInputEl) };
  const text = (selection ?? target.text).trim();
  if (!text) {
    panelApi.showError(new Error('Prompt is empty.'));
    return;
  }
  if (text.length > 6000) {
    panelApi.showError(new Error('Rewrite supports up to 6,000 characters.'));
    return;
  }

  const settings = panelApi.getSettings ? panelApi.getSettings() : { mode: 'standard', platform: adapter.platform };
  const mode = settings.mode || 'standard';
  const engine = selection === null ? settings.engine : 'quick_rewrite';
  if (panelApi) {
    panelApi.setLoggedState(true);
    panelApi.setStorageReady(true);
    panelApi.setTier('free');
  }
  const localResult = analyzeAndEnhancePrompt(text, {
    mode,
    platform: adapter.platform
  });
  let result;
  let usedAiRewrite = engine === 'ai_rewrite';

  try {
    void trackTelemetry('optimization_requested');

    if (usedAiRewrite) {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'CALL_OPTIMIZER',
          originalPrompt: text,
          platform: adapter.platform,
          disclosureId: settings.disclosureId,
          detectedIntent: localResult.intent,
          mode,
          token
        });

        if (!response || !response.success) {
          const error = new Error(response?.error || 'Failed to optimize prompt.');
          error.status = response?.status;
          error.code = response?.code;
          throw error;
        }
        result = response.result;
      } catch (cloudError) {
        if (cloudError.status === 401 || cloudError.status === 403) throw cloudError;
        await consumeSmartTemplateQuota('free');
        result = createLocalOptimization(localResult);
        result.changes.unshift({
          type: 'specificity',
          description: cloudError.code === 'CLOUD_AI_DAILY_LIMIT_REACHED'
            ? 'The daily AI Rewrite allowance was used, so PromptIQ completed this rewrite on your device.'
            : 'AI Rewrite was unavailable, so PromptIQ completed this rewrite on your device.'
        });
        usedAiRewrite = false;
        void trackTelemetry('optimization_fallback_used');
      }
    } else {
      await consumeSmartTemplateQuota('free');
      result = createLocalOptimization(localResult);
    }

    if (token !== await getSessionToken()) return;
    const originalScore = scorePrompt(text).score;
    const newScore = scorePrompt(result.optimized).score;
    const runId = await saveOptimization(
      text, 
      result.optimized, 
      newScore - originalScore, 
      adapter.platform,
      localResult.intent,
      mode,
      originalScore,
      newScore,
      usedAiRewrite ? 'ai_rewrite' : 'quick_rewrite',
      token
    );
    if (token !== await getSessionToken()) return;
    refreshComposer();
    if (target.route !== currentRoute || target.el !== currentInputEl) return;
    resultTarget = target;

    const diffedTokens = diffPrompt(text, result.optimized);
    const explainedChanges = explainChanges(result.changes);

    panelApi.showResult(result.optimized, diffedTokens, explainedChanges, runId, {
      originalScore,
      newScore
    }, {
      originalPrompt: text,
      platform: adapter.platform,
      intent: localResult.intent,
      mode,
      engine: usedAiRewrite ? 'ai_rewrite' : 'quick_rewrite',
      tier: 'free'
    });
    void trackTelemetry('optimization_completed');
  } catch (err) {
    void trackTelemetry('optimization_failed');
    if (err.code === 'CLOUD_AI_DAILY_LIMIT_REACHED' || err.code === 'LOCAL_DAILY_LIMIT_REACHED') {
      if (panelApi) {
        panelApi.showError(err);
      }
    } else if (err.status === 401 || err.status === 403) {
      await clearSessionToken();
      accountReady = false;
      draftRecorder.reset();
      if (panelApi) {
        panelApi.setLoggedState(false);
        panelApi.setStorageReady(false);
        panelApi.setTier('free');
      }
      panelApi.showError(new Error('Your account session expired. Sign in again to continue.'));
    } else if (err.message && err.message.includes('Extension context invalidated')) {
      const reloadErr = new Error('PromptIQ has been updated. Please refresh the page to continue.');
      panelApi.showError(reloadErr);
    } else {
      if (panelApi) {
        panelApi.showError(err);
      }
    }
  }
}

function createLocalOptimization(localResult) {
  return {
    optimized: localResult.enhancedPrompt,
    changes: [
      { type: 'task', description: 'Preserved your request in a separate Task section.' },
      { type: 'specificity', description: 'Added brief guidance for the detected task and your selected mode where applicable.' }
    ]
  };
}

async function handleUse(finalPrompt) {
  if (!isContextValid() || !accountReady || !finalPrompt?.trim()) return false;
  refreshComposer();
  if (!matchesTarget(resultTarget)) return false;

  const target = resultTarget;
  const original = target.text;
  if (!await writeComposer(finalPrompt, target) || resultTarget !== target) return false;
  const inserted = adapter.getText(currentInputEl);
  resultTarget = { el: currentInputEl, route: currentRoute, text: inserted };
  if (inserted !== original) {
    undoTarget = { ...resultTarget, original };
    void trackTelemetry('prompt_inserted');
  }
  return true;
}

async function handleUndo() {
  if (!isContextValid() || !accountReady) return false;
  refreshComposer();
  const target = undoTarget;
  if (!matchesTarget(target) || !await writeComposer(target.original, target) || undoTarget !== target) return false;
  resultTarget = { el: currentInputEl, route: currentRoute, text: adapter.getText(currentInputEl) };
  undoTarget = null;
  return true;
}

function matchesTarget(target) {
  return Boolean(target && currentInputEl &&
    target.el === currentInputEl && target.route === currentRoute &&
    target.text === adapter.getText(currentInputEl));
}

async function writeComposer(text, target) {
  if (writingComposer) return false;
  writingComposer = true;
  draftRecorder.reset();
  try {
    const inserted = await adapter.setText(target.el, text, () => (
      accountReady && location.pathname + location.search === target.route && matchesTarget(target)
    ));
    refreshComposer();
    return inserted && currentInputEl === target.el && currentRoute === target.route;
  } finally {
    writingComposer = false;
    handleInput();
  }
}

async function handleFavorite(record) {
  if (!isContextValid()) return false;
  const result = await toggleFavoritePrompt(record);
  void trackTelemetry('favorite_toggled');
  return result.favorite;
}

async function handleFeedback(runId, feedbackVal) {
  if (!isContextValid() || !runId) return;
  const token = await getSessionToken();
  if (!token) return;
  
  try {
    await fetch('https://promptiq-theta.vercel.app/api/feedback', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: runId, feedback: feedbackVal })
    });
  } catch (err) {
    console.warn('PromptIQ feedback could not be saved');
  }
}

init();
