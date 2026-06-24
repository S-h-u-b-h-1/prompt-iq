import { getAdapter } from '../lib/adapters.js';
import { scorePrompt } from '../lib/scorer.js';
import { createPanel } from '../components/panel.js';
import { saveOptimization, getUserTier, checkDailyLimit, incrementDailyOptimization } from '../lib/storage.js';
import { diffPrompt } from '../lib/diff.js';
import { explainChanges } from '../lib/explain.js';
import { analyzeAndEnhancePrompt, checkStructure } from '../lib/local-optimizer.js';

let currentInputEl = null;
let panelApi = null;
let adapter = null;
let lastOptimizedPrompt = '';
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

async function init() {
  adapter = getAdapter();
  if (!adapter) return;

  ensurePanelInjected();

  const el = adapter.getInputElement();
  if (el) {
    updateActiveInput(el);
  }

  setupObserver();
  setupKeyboardShortcut();
  setupMessageListeners();
}

function handleInput() {
  if (!isContextValid()) return;
  if (!currentInputEl || !panelApi) return;
  const text = adapter.getText(currentInputEl);
  const scoreData = scorePrompt(text);
  
  // Local structure check to identify missing prompt elements (Phase 4)
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

function ensurePanelInjected() {
  if (document.getElementById('promptiq-container')) return;

  panelApi = createPanel(handleOptimize, handleUse, handleFeedback);
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

  const mode = panelApi.getMode() || 'turbo';
  const tier = await getUserTier();
  const limitCheck = await checkDailyLimit();

  // Enforce monetization paywall checks (Phase 8)
  if (tier === 'free') {
    if (!limitCheck.allowed) {
      panelApi.showPaywall('limit');
      return;
    }
    if (mode !== 'turbo') {
      panelApi.showPaywall('mode');
      return;
    }
  }

  // Phase 4: Local analysis & enhancement draft generation
  const localResult = analyzeAndEnhancePrompt(text);

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'CALL_OPTIMIZER',
      originalPrompt: text,
      platform: adapter.platform,
      locallyEnhancedPrompt: localResult.enhancedPrompt,
      detectedIntent: localResult.intent,
      mode: mode
    });

    if (!response || !response.success) {
      const err = new Error(response?.error || 'Failed to optimize prompt.');
      if (response?.status) {
        err.status = response.status;
      }
      throw err;
    }

    const result = response.result;
    lastOptimizedPrompt = result.optimized;
    
    // Save optimization telemetry & score delta
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

    // If on Free plan, increment their usage count
    if (tier === 'free') {
      await incrementDailyOptimization();
    }

    // Compute diff and explain changes
    const diffedTokens = diffPrompt(text, result.optimized);
    const explainedChanges = explainChanges(result.changes);

    panelApi.showResult(result.optimized, diffedTokens, explainedChanges, runId);
  } catch (err) {
    if (err.message && err.message.includes('Extension context invalidated')) {
      const reloadErr = new Error('PromptIQ has been updated. Please refresh the page to continue.');
      panelApi.showError(reloadErr);
    } else {
      panelApi.showError(err);
    }
  }
}

function handleUse(finalPrompt) {
  if (!isContextValid()) return;
  const textToUse = finalPrompt || lastOptimizedPrompt;
  if (textToUse) {
    adapter.setText(currentInputEl, textToUse);
    const scoreData = scorePrompt(textToUse);
    const structure = checkStructure(textToUse);
    scoreData.missing = structure.missing;
    panelApi.updateScore(scoreData);
  }
}

async function handleFeedback(runId, feedbackVal) {
  if (!isContextValid() || !runId) return;
  try {
    await fetch('https://promptiq-theta.vercel.app/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: runId, feedback: feedbackVal })
    });
  } catch (err) {
    console.error('Failed to submit feedback:', err);
  }
}

init();
