export function normalizePlan(plan) {
  return plan === 'premium' || plan === 'pro' ? 'premium' : 'free';
}

export function isPremiumPlan(plan) {
  return normalizePlan(plan) === 'premium';
}
