import { getApiKey, setApiKey } from './storage.js';
import assert from 'assert';

console.log('Running storage tests...');

// Mock localStorage for Node environment
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = String(value); },
  clear() { this.store = {}; }
};

async function testApiKey() {
  await setApiKey('test-key-123');
  const key = await getApiKey();
  assert.strictEqual(key, 'test-key-123');
}

testApiKey()
  .then(() => {
    console.log('All storage tests passed!');
  })
  .catch(err => {
    console.error('Storage test failed:', err);
    process.exit(1);
  });
