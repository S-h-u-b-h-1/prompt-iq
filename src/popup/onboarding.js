import { setApiKey, getApiKey } from '../lib/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const keyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const statusMsg = document.getElementById('statusMsg');

  // Load key if already set
  const savedKey = await getApiKey();
  if (savedKey) {
    keyInput.value = savedKey;
  }

  saveBtn.addEventListener('click', async () => {
    const key = keyInput.value.trim();
    if (!key) {
      statusMsg.textContent = 'Please enter an API Key.';
      statusMsg.className = 'status status-error';
      return;
    }

    await setApiKey(key);
    statusMsg.textContent = 'API Key saved successfully! You can close this tab and start using PromptIQ on ChatGPT, Claude, etc.';
    statusMsg.className = 'status status-success';
  });
});
