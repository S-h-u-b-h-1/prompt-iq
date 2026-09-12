import assert from 'node:assert/strict';
import {
  FREE_CLOUD_AI_DAILY_LIMIT,
  PREMIUM_CLOUD_AI_DAILY_LIMIT,
  getCloudAiDailyLimit,
  getSmartTemplateDailyLimit
} from './usage-limits.js';

assert.equal(FREE_CLOUD_AI_DAILY_LIMIT, 5);
assert.equal(PREMIUM_CLOUD_AI_DAILY_LIMIT, 50);
assert.equal(getCloudAiDailyLimit('free'), 5);
assert.equal(getCloudAiDailyLimit('premium'), 50);
assert.equal(getCloudAiDailyLimit('unknown'), 5);
assert.equal(getSmartTemplateDailyLimit('free'), 100);
assert.equal(getSmartTemplateDailyLimit('premium'), 200);

console.log('All server usage limit tests passed!');
