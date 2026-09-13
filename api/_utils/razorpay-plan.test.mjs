import assert from 'node:assert/strict';
import { isExpectedRazorpayPlan, isReusableRazorpaySubscription, PREMIUM_PRICE_MINOR, PREMIUM_CURRENCY } from './razorpay-plan.js';

assert.equal(PREMIUM_PRICE_MINOR, 100);
assert.equal(PREMIUM_CURRENCY, 'USD');
assert.equal(isExpectedRazorpayPlan({
  item: { amount: 100, currency: 'USD', tax_inclusive: false },
  period: 'monthly',
  interval: 1
}), true);
assert.equal(isExpectedRazorpayPlan({
  item: { amount: 5000, currency: 'INR' },
  period: 'monthly',
  interval: 1
}), false);
assert.equal(isExpectedRazorpayPlan({
  item: { amount: 100, currency: 'USD' },
  period: 'yearly',
  interval: 1
}), false);

const plan = { item: { amount: 100, currency: 'USD' }, period: 'monthly', interval: 1 };
assert.equal(isExpectedRazorpayPlan(plan), true);
for (const item of [
  { amount: 100, currency: 'INR' },
  { amount: 1000, currency: 'USD' },
  { amount: 0, currency: 'USD' },
  { amount: 100, currency: 'USD', tax_inclusive: true }
]) assert.equal(isExpectedRazorpayPlan({ ...plan, item }), false);
assert.equal(isExpectedRazorpayPlan({ ...plan, interval: 2 }), false);
assert.equal(isExpectedRazorpayPlan(null), false);
assert.equal(isExpectedRazorpayPlan({}), false);

const pending = { plan_id: 'plan_usd', quantity: 1, status: 'created', short_url: 'https://rzp.io/test' };
assert.equal(isReusableRazorpaySubscription(pending, 'plan_usd'), true);
assert.equal(isReusableRazorpaySubscription(pending, 'plan_old_inr'), false);
assert.equal(isReusableRazorpaySubscription({ ...pending, quantity: 2 }, 'plan_usd'), false);
assert.equal(isReusableRazorpaySubscription({ ...pending, status: 'cancelled' }, 'plan_usd'), false);
assert.equal(isReusableRazorpaySubscription({ ...pending, short_url: '' }, 'plan_usd'), false);
assert.equal(isReusableRazorpaySubscription(null, 'plan_usd'), false);

console.log('All USD price, tax exclusion, and checkout reuse tests passed!');
