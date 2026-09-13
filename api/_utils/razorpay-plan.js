export const PREMIUM_PRICE_MINOR = 100;
export const PREMIUM_CURRENCY = 'USD';

export function isExpectedRazorpayPlan(plan) {
  return Boolean(
    plan &&
    Number(plan.item?.amount) === PREMIUM_PRICE_MINOR &&
    plan.item?.currency === PREMIUM_CURRENCY &&
    plan.item?.tax_inclusive !== true &&
    plan.period === 'monthly' &&
    Number(plan.interval) === 1
  );
}

export function isReusableRazorpaySubscription(subscription, planId) {
  return Boolean(
    subscription?.short_url &&
    subscription.plan_id === planId &&
    Number(subscription.quantity) === 1 &&
    ['created', 'authenticated', 'pending'].includes(subscription.status)
  );
}
