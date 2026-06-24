import { optimizePrompt } from '../lib/optimizer.js';

chrome.runtime.onInstalled.addListener((details) => {
  // Create context menu
  chrome.contextMenus.create({
    id: 'promptiq-optimize',
    title: 'Optimize as Prompt with PromptIQ',
    contexts: ['selection']
  });

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
  if (message.action === 'CALL_OPTIMIZER') {
    optimizePrompt(
      message.originalPrompt, 
      message.platform, 
      message.locallyEnhancedPrompt, 
      message.detectedIntent, 
      message.mode,
      message.token // Relay the JWT session token
    )
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message, status: error.status }));
    return true; // Keep message channel open for async response
  }
});
