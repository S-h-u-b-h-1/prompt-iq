import assert from 'node:assert/strict';
import {
  FREE_CLOUD_AI_DAILY_LIMIT,
  getCloudAiDailyLimit,
  getSmartTemplateDailyLimit
} from './usage-limits.js';

assert.equal(FREE_CLOUD_AI_DAILY_LIMIT, 20);
assert.equal(getCloudAiDailyLimit(), 20);
assert.equal(getSmartTemplateDailyLimit(), 100);

console.log('All server usage limit tests passed!');
