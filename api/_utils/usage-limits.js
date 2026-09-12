export const FREE_CLOUD_AI_DAILY_LIMIT = 5;
export const PREMIUM_CLOUD_AI_DAILY_LIMIT = 50;
export const FREE_SMART_TEMPLATE_DAILY_LIMIT = 100;
export const PREMIUM_SMART_TEMPLATE_DAILY_LIMIT = 200;

export function getCloudAiDailyLimit(plan) {
  return plan === 'premium'
    ? PREMIUM_CLOUD_AI_DAILY_LIMIT
    : FREE_CLOUD_AI_DAILY_LIMIT;
}

export function getSmartTemplateDailyLimit(plan) {
  return plan === 'premium'
    ? PREMIUM_SMART_TEMPLATE_DAILY_LIMIT
    : FREE_SMART_TEMPLATE_DAILY_LIMIT;
}
