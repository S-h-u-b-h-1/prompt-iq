import { getAdapter } from '../lib/adapters.js';
import { scorePrompt } from '../lib/scorer.js';
import { createPanel } from '../components/panel.js';
import { saveOptimization, getUserTier, getSessionToken, clearSessionToken, toggleFavoritePrompt } from '../lib/storage.js';
import { diffPrompt } from '../lib/diff.js';
import { explainChanges } from '../lib/explain.js';
import { analyzeAndEnhancePrompt, checkStructure } from '../lib/local-optimizer.js';

let currentInputEl = null;
let panelApi = null;
let adapter = null;
let lastOptimizedPrompt = '';
let previousPromptBeforeUse = '';
let observer = null;

function isContextValid() {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
    cleanup();
    return false;
  }
  return true;
}

function cleanup() {
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
          const newToken = changes.sessionToken.newValue;
          if (panelApi) {
            panelApi.setLoggedState(!!newToken);
          }
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

  // Sync initial logged state and user tier
  const token = await getSessionToken();
  if (panelApi) {
    panelApi.setLoggedState(!!token);
    try {
      const tier = await getUserTier();
      panelApi.setTier(tier);
    } catch (e) {}
  }

  const el = adapter.getInputElement();
  if (el) {
    updateActiveInput(el);
  }

  setupObserver();
  setupKeyboardShortcut();
  setupMessageListeners();
  setupStorageListener();
}

function handleInput() {
  if (!isContextValid()) return;
  if (!currentInputEl || !panelApi) return;
  const text = adapter.getText(currentInputEl);
  const scoreData = scorePrompt(text);
  
  // Local structure check to identify missing prompt elements
  const structure = checkStructure(text);
  scoreData.missing = structure.missing;
  
  panelApi.updateScore(scoreData);
}

function updateActiveInput(el) {
  if (!el || !panelApi) return;
  
  if (currentInputEl && currentInputEl !== el) {
    currentInputEl.removeEventListener('input', handleInput);
  }
  
  currentInputEl = el;
  currentInputEl.addEventListener('input', handleInput);
  
  const initialText = adapter.getText(currentInputEl);
  const scoreData = scorePrompt(initialText);
  const structure = checkStructure(initialText);
  scoreData.missing = structure.missing;
  
  panelApi.updateScore(scoreData);
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
  if (panelApi) {
    panelApi.setLoggedState(false);
    panelApi.setTier('free');
    panelApi.showError(new Error('Signed out. Free Smart Template optimization remains available.'));
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
        if (panelApi) {
          panelApi.toggleVisibility();
          if (currentInputEl) {
            adapter.setText(currentInputEl, message.text);
            handleOptimize();
          }
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

async function handleOptimize() {
  if (!isContextValid()) return;
  const text = (adapter.getText(currentInputEl) || '').trim();
  if (!text) {
    panelApi.showError(new Error('Prompt is empty.'));
    return;
  }

  const token = await getSessionToken();
  let tier = await getUserTier();
  const settings = panelApi.getSettings ? panelApi.getSettings() : { mode: 'standard', platform: adapter.platform };
  const mode = settings.mode || 'standard';
  if (!token && tier === 'premium') tier = 'free';
  if (panelApi) {
    panelApi.setLoggedState(!!token);
    panelApi.setTier(tier);
  }
  const localResult = analyzeAndEnhancePrompt(text, {
    mode,
    platform: adapter.platform
  });
  let result;
  let optimizationTier = tier;

  try {
    if (tier === 'premium' && token) {
      const response = await chrome.runtime.sendMessage({
        action: 'CALL_OPTIMIZER',
        originalPrompt: text,
        platform: adapter.platform,
        locallyEnhancedPrompt: localResult.enhancedPrompt,
        detectedIntent: localResult.intent,
        mode,
        token
      });

      if (!response || !response.success) {
        const error = new Error(response?.error || 'Failed to optimize prompt.');
        error.status = response?.status;
        throw error;
      }
      result = response.result;
    } else {
      result = createLocalOptimization(localResult);
    }

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
      newScore
    );

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
      tier: optimizationTier
    });
  } catch (err) {
    if (err.code === 'PREMIUM_LIMIT_REACHED') {
      if (panelApi) {
        panelApi.showError(err);
      }
    } else if (err.status === 401 || err.status === 403) {
      await clearSessionToken();
      if (panelApi) {
        panelApi.setLoggedState(false);
        panelApi.setTier('free');
      }
      panelApi.showError(new Error('Premium access could not be verified. Sign in again, or continue with Free Smart Template.'));
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
  if (!isContextValid()) return;
  const textToUse = finalPrompt || lastOptimizedPrompt;
  if (textToUse) {
    previousPromptBeforeUse = adapter.getText(currentInputEl) || '';
    adapter.setText(currentInputEl, textToUse);
    const scoreData = scorePrompt(textToUse);
    const structure = checkStructure(textToUse);
    scoreData.missing = structure.missing;
    panelApi.updateScore(scoreData);
  }
}

function handleUndo() {
  if (!isContextValid() || !previousPromptBeforeUse || !currentInputEl) return false;
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
    console.error('Failed to submit feedback:', err);
  }
}

init();
