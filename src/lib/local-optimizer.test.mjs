import assert from 'node:assert/strict';
import { analyzeAndEnhancePrompt, normalizeOptimizationMode, normalizePlatform } from './local-optimizer.js';

console.log('Running local Quick Rewrite tests...');

const result = analyzeAndEnhancePrompt('Write a launch email for my productivity app.');

assert.strictEqual(result.intent, 'marketing');
assert.match(result.enhancedPrompt, /Task\nWrite a launch email for my productivity app\./);
assert.match(result.enhancedPrompt, /Requirements/);
assert.match(result.enhancedPrompt, /specific subject line/i);
assert.match(result.enhancedPrompt, /do not add facts/i);
assert.match(result.enhancedPrompt, /Output/);
assert.doesNotMatch(result.enhancedPrompt, /\[ROLE\]|\[PLATFORM CALIBRATION\]/);

const empty = analyzeAndEnhancePrompt('');
assert.strictEqual(empty.enhancedPrompt, '');

const platformResult = analyzeAndEnhancePrompt('Debug this React component.', {
  mode: 'technical',
  platform: 'claude'
});
assert.strictEqual(platformResult.mode, 'technical');
assert.strictEqual(platformResult.platform, 'claude');
assert.match(platformResult.enhancedPrompt, /edge cases/i);
assert.match(platformResult.enhancedPrompt, /natural language/i);
const fixedFormat = analyzeAndEnhancePrompt('Return only JSON for this email campaign.', { platform: 'chatgpt' });
assert.match(fixedFormat.enhancedPrompt, /Return only JSON/);
assert.doesNotMatch(fixedFormat.enhancedPrompt, /subject line|Markdown headings|\nOutput\n/);
const concise = analyzeAndEnhancePrompt('Summarize the notes.', { mode: 'concise' });
assert.match(concise.enhancedPrompt, /Keep the response compact/);
assert.doesNotMatch(concise.enhancedPrompt, /Work as|\nOutput\n/);
assert.strictEqual(normalizeOptimizationMode('unknown'), 'standard');
assert.strictEqual(normalizePlatform('unknown'), 'general');
assert.strictEqual(normalizePlatform('grok'), 'grok');
assert.strictEqual(normalizePlatform('constructor'), 'general');

console.log('All local Quick Rewrite tests passed!');
