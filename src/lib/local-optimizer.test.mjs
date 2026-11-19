import assert from 'node:assert/strict';
import { analyzeAndEnhancePrompt, normalizeOptimizationMode, normalizePlatform } from './local-optimizer.js';

console.log('Running local Quick Rewrite tests...');

const result = analyzeAndEnhancePrompt('Write a launch email for my productivity app.');

assert.strictEqual(result.intent, 'marketing');
assert.match(result.enhancedPrompt, /Task\nWrite a launch email for my productivity app\./);
assert.match(result.enhancedPrompt, /Requirements/);
assert.match(result.enhancedPrompt, /subject line options/i);
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
assert.match(platformResult.enhancedPrompt, /natural language instructions/i);
assert.strictEqual(normalizeOptimizationMode('unknown'), 'standard');
assert.strictEqual(normalizePlatform('unknown'), 'general');
assert.strictEqual(normalizePlatform('grok'), 'grok');

console.log('All local Quick Rewrite tests passed!');
