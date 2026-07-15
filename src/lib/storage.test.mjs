import {
  getSessionToken,
  setSessionToken,
  clearSessionToken,
  normalizeTier,
  getFavoritePrompts,
  toggleFavoritePrompt,
  isFavoritePrompt,
  getSmartTemplateDailyLimit,
  getSmartTemplateQuotaStatus,
  consumeSmartTemplateQuota
} from './storage.js';
import assert from 'assert';

console.log('Running updated storage session tests...');

// Mock localStorage for Node environment
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = String(value); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};

async function testSessionToken() {
  assert.strictEqual(normalizeTier('free'), 'free');
  assert.strictEqual(normalizeTier('premium'), 'premium');
  assert.strictEqual(normalizeTier('pro'), 'premium');
  assert.strictEqual(normalizeTier('unknown'), 'free');

  // Set token
  await setSessionToken('mock-jwt-token-12345');
  
  // Get token
  const token = await getSessionToken();
  assert.strictEqual(token, 'mock-jwt-token-12345');
  
  // Clear token
  await clearSessionToken();
  const clearedToken = await getSessionToken();
  assert.strictEqual(clearedToken, null);
}

async function testFavorites() {
  localStorage.clear();

  const record = {
    original: 'Write a launch email',
    optimized: 'Act as a lifecycle marketer and write a launch email.',
    platform: 'chatgpt',
    mode: 'concise',
    intent: 'marketing',
    scoreOriginal: 42,
    scoreOptimized: 81
  };

  assert.strictEqual(await isFavoritePrompt(record), false);

  const saved = await toggleFavoritePrompt(record);
  assert.strictEqual(saved.favorite, true);
  assert.strictEqual(await isFavoritePrompt(record), true);

  const favorites = await getFavoritePrompts();
  assert.strictEqual(favorites.length, 1);
  assert.strictEqual(favorites[0].mode, 'concise');

  const removed = await toggleFavoritePrompt(record);
  assert.strictEqual(removed.favorite, false);
  assert.strictEqual((await getFavoritePrompts()).length, 0);
}

async function testSmartTemplateQuotas() {
  localStorage.clear();

  assert.strictEqual(getSmartTemplateDailyLimit('free'), 100);
  assert.strictEqual(getSmartTemplateDailyLimit('premium'), 200);

  let freeStatus = await getSmartTemplateQuotaStatus('free');
  assert.strictEqual(freeStatus.used, 0);
  assert.strictEqual(freeStatus.remaining, 100);

  for (let i = 0; i < 100; i += 1) {
    freeStatus = await consumeSmartTemplateQuota('free');
  }
  assert.strictEqual(freeStatus.used, 100);
  assert.strictEqual(freeStatus.remaining, 0);

  await assert.rejects(
    () => consumeSmartTemplateQuota('free'),
    (error) => error.code === 'LOCAL_DAILY_LIMIT_REACHED' && error.status === 429
  );

  const premiumStatus = await getSmartTemplateQuotaStatus('premium');
  assert.strictEqual(premiumStatus.used, 100);
  assert.strictEqual(premiumStatus.remaining, 100);
}

Promise.resolve()
  .then(testSessionToken)
  .then(testFavorites)
  .then(testSmartTemplateQuotas)
  .then(() => {
    console.log('All storage session tests passed!');
  })
  .catch(err => {
    console.error('Storage session test failed:', err);
    process.exit(1);
  });
