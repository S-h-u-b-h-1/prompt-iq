import assert from 'node:assert/strict';
import { isExpectedRazorpayPlan, PREMIUM_PRICE_PAISE } from './razorpay-plan.js';

assert.equal(PREMIUM_PRICE_PAISE, 5000);
assert.equal(isExpectedRazorpayPlan({
  item: { amount: 5000, currency: 'INR' },
  period: 'monthly',
  interval: 1
}), true);
assert.equal(isExpectedRazorpayPlan({
  item: { amount: 19900, currency: 'INR' },
  period: 'monthly',
  interval: 1
}), false);
assert.equal(isExpectedRazorpayPlan({
  item: { amount: 5000, currency: 'INR' },
  period: 'yearly',
  interval: 1
}), false);

console.log('All Razorpay plan tests passed!');
