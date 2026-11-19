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
let lastOptimizedPrompt = '';
let previousPromptBeforeUse = '';
let observer = null;
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
    if (observer) {
      observer.disconnect();
    }
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
          lastOptimizedPrompt = '';
          previousPromptBeforeUse = '';
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

async function init() {
  adapter = getAdapter();
  if (!adapter) return;

  ensurePanelInjected();
  if (panelApi) {
    panelApi.setPlatform(adapter.platform);
  }

  // Sync initial account state.
  const token = await getSessionToken();
  await syncAccountAccess(token);

  const el = adapter.getInputElement();
  if (el) {
    updateActiveInput(el);
  }

  setupObserver();
  setupKeyboardShortcut();
  setupMessageListeners();
  setupStorageListener();
}

function handleInput(event) {
  if (!isContextValid()) return;
  if (!currentInputEl || !panelApi) return;
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

function updateActiveInput(el) {
  if (!el || !panelApi) return;
  
  if (currentInputEl && currentInputEl !== el) {
    draftRecorder.reset();
    currentInputEl.removeEventListener('input', handleInput);
  }
  
  currentInputEl = el;
  currentInputEl.addEventListener('input', handleInput);
  
  if (accountReady) handleInput();
}

function setupObserver() {
  observer = new MutationObserver(() => {
    if (!isContextValid()) return;
    const el = adapter.getInputElement();
    if (el && el !== currentInputEl) {
      updateActiveInput(el);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

async function handleLogout() {
  await clearSessionToken();
  lastOptimizedPrompt = '';
  previousPromptBeforeUse = '';
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
    e.preventDefault();
    if (panelApi) {
      panelApi.toggleVisibility();
    }
  }
}

function setupKeyboardShortcut() {
  window.addEventListener('keydown', handleKeydown);
}

function setupMessageListeners() {
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!isContextValid()) return;
      if (message.action === 'OPTIMIZE_SELECTION') {
        panelApi?.open();
        if (currentInputEl && typeof message.text === 'string') {
          void handleOptimize(message.text);
        }
      } else if (message.action === 'INSERT_PROMPT') {
        if (currentInputEl) {
          adapter.setText(currentInputEl, message.text);
          const scoreData = scorePrompt(message.text);
          const structure = checkStructure(message.text);
          scoreData.missing = structure.missing;
          panelApi.updateScore(scoreData);
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
  const text = (selection ?? adapter.getText(currentInputEl) ?? '').trim();
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
    lastOptimizedPrompt = result.optimized;
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
  const descriptions = {
    role: 'Added an expert role to guide tone and decision quality.',
    task: 'Clarified the objective and preserved the original request.',
    context: 'Added context guidance so the response is complete and useful.',
    format: 'Specified a structured output format for easier use.',
    constraints: 'Added practical boundaries to reduce vague or generic output.',
    specificity: 'Expanded the request with audience and delivery details.'
  };
  const changeTypes = ['role', 'task', 'context', 'format', 'constraints', 'specificity'];

  return {
    optimized: localResult.enhancedPrompt,
    changes: changeTypes.map((type) => ({
      type,
      description: descriptions[type]
    }))
  };
}

function handleUse(finalPrompt) {
  if (!isContextValid() || !accountReady || !currentInputEl?.isConnected) return;
  const textToUse = finalPrompt || lastOptimizedPrompt;
  if (textToUse) {
    previousPromptBeforeUse = adapter.getText(currentInputEl) || '';
    adapter.setText(currentInputEl, textToUse);
    const scoreData = scorePrompt(textToUse);
    const structure = checkStructure(textToUse);
    scoreData.missing = structure.missing;
    panelApi.updateScore(scoreData);
    void trackTelemetry('prompt_inserted');
  }
}

function handleUndo() {
  if (!isContextValid() || !accountReady || !previousPromptBeforeUse || !currentInputEl?.isConnected) return false;
  adapter.setText(currentInputEl, previousPromptBeforeUse);
  const scoreData = scorePrompt(previousPromptBeforeUse);
  const structure = checkStructure(previousPromptBeforeUse);
  scoreData.missing = structure.missing;
  panelApi.updateScore(scoreData);
  previousPromptBeforeUse = '';
  return true;
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
