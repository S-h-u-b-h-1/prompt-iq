import { getSessionToken, setSessionToken, clearSessionToken } from './storage.js';
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

testSessionToken()
  .then(() => {
    console.log('All storage session tests passed!');
  })
  .catch(err => {
    console.error('Storage session test failed:', err);
    process.exit(1);
  });
