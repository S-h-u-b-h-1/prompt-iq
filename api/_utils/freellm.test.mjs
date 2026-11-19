import assert from 'node:assert/strict';
import { getFreeLlmConfig, rewriteWithFreeLlm } from './freellm.js';

const env = {
  FREELLM_BASE_URL: 'https://gateway.example/v1/',
  FREELLM_API_KEY: 'test-key',
  FREELLM_MODEL: 'test-model',
  FREELLM_PROVIDER: 'Test Provider'
};
const config = getFreeLlmConfig(env);
assert.equal(config.endpoint, 'https://gateway.example/v1/chat/completions');
assert.equal(getFreeLlmConfig({ ...env, FREELLM_BASE_URL: 'http://gateway.example' }), null);
assert.equal(getFreeLlmConfig({ ...env, FREELLM_BASE_URL: 'http://localhost:3001', NODE_ENV: 'production' }), null);
assert.equal(getFreeLlmConfig({ ...env, FREELLM_BASE_URL: 'https://127.0.0.1/v1', VERCEL: '1' }), null);
assert.equal(getFreeLlmConfig({ ...env, FREELLM_BASE_URL: 'https://admin:password@gateway.example/v1' }), null);
assert.equal(getFreeLlmConfig({ ...env, FREELLM_MODEL: 'auto:default' }), null);
assert.equal(getFreeLlmConfig({ ...env, FREELLM_MODEL: 'fusion' }), null);
assert.equal(getFreeLlmConfig({ ...env, FREELLM_API_KEY: '' }), null);
assert.ok(getFreeLlmConfig({ ...env, FREELLM_BASE_URL: 'http://127.0.0.1:3001/v1' }));
assert.notEqual(getFreeLlmConfig({ ...env, FREELLM_MODEL: 'another-model' }).disclosure.id, config.disclosure.id);
assert.deepEqual(Object.keys(config.disclosure), ['id', 'provider']);

globalThis.fetch = async (url, options) => {
  assert.equal(url, config.endpoint);
  assert.equal(options.headers.Authorization, 'Bearer test-key');
  assert.equal(options.redirect, 'error');
  const body = JSON.parse(options.body);
  assert.equal(body.model, 'test-model');
  assert.equal(body.messages[1].content, 'Synthetic draft');
  assert.equal(body.response_format.type, 'json_object');
  return Response.json({
    choices: [{ message: { content: JSON.stringify({ optimized: 'A clearer draft', changes: [] }) } }]
  });
};
assert.deepEqual(await rewriteWithFreeLlm(config, 'Rewrite the draft', 'Synthetic draft'), {
  optimized: 'A clearer draft',
  changes: []
});
globalThis.fetch = async () => new Response('upstream text', { status: 429 });
await assert.rejects(rewriteWithFreeLlm(config, 'Rewrite the draft', 'Synthetic draft'), /FreeLLMAPI HTTP 429/);
console.log('FreeLLMAPI configuration, disclosure, and request checks passed.');
