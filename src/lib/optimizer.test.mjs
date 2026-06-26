import assert from 'assert';
import { optimizePrompt } from './optimizer.js';

console.log('Running optimizer error handling tests...');

const originalFetch = global.fetch;

async function expectOptimizerError(mockResponse, expected) {
  global.fetch = async () => mockResponse;

  try {
    await optimizePrompt('write a linkedin post', 'chatgpt', null, null, 'turbo', 'mock-token');
    assert.fail('Expected optimizePrompt to throw');
  } catch (err) {
    assert.strictEqual(err.status, expected.status);
    assert.strictEqual(err.message, expected.message);
    if (expected.code !== undefined) {
      assert.strictEqual(err.code, expected.code);
    }
  }
}

await expectOptimizerError(
  {
    ok: false,
    status: 401,
    statusText: 'Unauthorized',
    json: async () => ({ error: 'Unauthorized: Invalid or missing token', code: 'AUTH_REQUIRED' })
  },
  {
    status: 401,
    code: 'AUTH_REQUIRED',
    message: 'Your session expired. Please log in again.'
  }
);

await expectOptimizerError(
  {
    ok: false,
    status: 503,
    statusText: 'Service Unavailable',
    json: async () => ({ error: 'PromptIQ optimization is temporarily unavailable. Please try again shortly.', code: 'GEMINI_UPSTREAM_ERROR' })
  },
  {
    status: 503,
    code: 'GEMINI_UPSTREAM_ERROR',
    message: 'PromptIQ optimization is temporarily unavailable. Please try again shortly.'
  }
);

global.fetch = originalFetch;

console.log('All optimizer error handling tests passed!');
