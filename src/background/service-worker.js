import { optimizePrompt } from '../lib/optimizer.js';
import { trackTelemetry } from '../lib/storage.js';

chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.removeAll(() => {
    void chrome.runtime.lastError;
    chrome.contextMenus.create({
      id: 'promptiq-optimize',
      title: 'Optimize as Prompt with PromptIQ',
      contexts: ['selection']
    });
  });

  trackTelemetry(details.reason === 'install' ? 'extension_installed' : 'extension_updated');

  // Open onboarding on install
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/onboarding.html') });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'promptiq-optimize') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'OPTIMIZE_SELECTION',
      text: info.selectionText
    }).catch(err => console.log('Content script not active on this page.'));
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'OPEN_ONBOARDING' || message.action === 'OPEN_POPUP') {
    const page = message.action === 'OPEN_POPUP'
      ? 'src/popup/popup.html'
      : 'src/popup/onboarding.html';
    chrome.tabs.create({ url: chrome.runtime.getURL(page) })
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === 'CALL_OPTIMIZER') {
    optimizePrompt(
      message.originalPrompt, 
      message.platform, 
      message.locallyEnhancedPrompt, 
      message.detectedIntent, 
      message.token, // Relay the JWT session token
      message.mode
    )
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message, status: error.status, code: error.code }));
    return true; // Keep message channel open for async response
  }
});
