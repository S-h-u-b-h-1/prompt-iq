export const PREMIUM_PRICE_PAISE = 5000;

export function isExpectedRazorpayPlan(plan) {
  return Boolean(
    plan &&
    Number(plan.item?.amount) === PREMIUM_PRICE_PAISE &&
    plan.item?.currency === 'INR' &&
    plan.period === 'monthly' &&
    Number(plan.interval) === 1
  );
}
