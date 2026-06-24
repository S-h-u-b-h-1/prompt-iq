import { getAdapter } from '../lib/adapters.js';
import { scorePrompt } from '../lib/scorer.js';
import { createPanel } from '../components/panel.js';
import { saveOptimization } from '../lib/storage.js';
import { diffPrompt } from '../lib/diff.js';
import { explainChanges } from '../lib/explain.js';

let currentInputEl = null;
let panelApi = null;
let adapter = null;
let lastOptimizedPrompt = '';

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
  if (!currentInputEl || !panelApi) return;
  const text = adapter.getText(currentInputEl);
  const scoreData = scorePrompt(text);
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
  panelApi.updateScore(scorePrompt(initialText));
}

function setupObserver() {
  const observer = new MutationObserver(() => {
    const el = adapter.getInputElement();
    if (el && el !== currentInputEl) {
      updateActiveInput(el);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function ensurePanelInjected() {
  if (document.getElementById('promptiq-container')) return;

  panelApi = createPanel(handleOptimize, handleUse);
  document.body.appendChild(panelApi.container);
}

function setupKeyboardShortcut() {
  window.addEventListener('keydown', (e) => {
    // Ctrl + Shift + P
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      if (panelApi) {
        panelApi.toggleVisibility();
      }
    }
  });
}

function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
        panelApi.updateScore(scoreData);
      }
    }
  });
}

async function handleOptimize() {
  const text = (adapter.getText(currentInputEl) || '').trim();
  if (!text) {
    panelApi.showError(new Error('Prompt is empty.'));
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'CALL_OPTIMIZER',
      originalPrompt: text,
      platform: adapter.platform
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
    
    // Save to history
    const originalScore = scorePrompt(text).score;
    const newScore = scorePrompt(result.optimized).score;
    saveOptimization(text, result.optimized, newScore - originalScore, adapter.platform);

    // Compute diff and explain changes
    const diffedTokens = diffPrompt(text, result.optimized);
    const explainedChanges = explainChanges(result.changes);

    panelApi.showResult(result.optimized, diffedTokens, explainedChanges);
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
  const textToUse = finalPrompt || lastOptimizedPrompt;
  if (textToUse) {
    adapter.setText(currentInputEl, textToUse);
    const scoreData = scorePrompt(textToUse);
    panelApi.updateScore(scoreData);
  }
}

init();
