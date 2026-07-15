import assert from 'node:assert/strict';
import { analyzeAndEnhancePrompt, normalizeOptimizationMode, normalizePlatform } from './local-optimizer.js';

console.log('Running local Smart Template tests...');

const result = analyzeAndEnhancePrompt('Write a launch plan for my productivity app.');

assert.strictEqual(result.intent, 'productivity');
assert.match(result.enhancedPrompt, /\[ROLE\]/);
assert.match(result.enhancedPrompt, /\[TASK\]/);
assert.match(result.enhancedPrompt, /Write a launch plan for my productivity app\./);
assert.match(result.enhancedPrompt, /\[AUDIENCE AND CONTEXT\]/);
assert.match(result.enhancedPrompt, /\[MODE\]/);
assert.match(result.enhancedPrompt, /\[PLATFORM CALIBRATION\]/);
assert.match(result.enhancedPrompt, /\[OUTPUT FORMAT\]/);
assert.match(result.enhancedPrompt, /\[CONSTRAINTS\]/);
assert.match(result.enhancedPrompt, /\[QUALITY CHECK\]/);
assert.doesNotMatch(result.enhancedPrompt, /Optimize and fulfill/i);

const empty = analyzeAndEnhancePrompt('');
assert.strictEqual(empty.enhancedPrompt, '');

const platformResult = analyzeAndEnhancePrompt('Debug this React component.', {
  mode: 'technical',
  platform: 'claude'
});
assert.strictEqual(platformResult.mode, 'technical');
assert.strictEqual(platformResult.platform, 'claude');
assert.match(platformResult.enhancedPrompt, /Technical:/);
assert.match(platformResult.enhancedPrompt, /Claude/);
assert.strictEqual(normalizeOptimizationMode('unknown'), 'standard');
assert.strictEqual(normalizePlatform('unknown'), 'general');

console.log('All local Smart Template tests passed!');
