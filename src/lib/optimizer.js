/**
 * LLM Prompt Optimization client communication helper
 */

const URL = 'https://promptiq-theta.vercel.app/api/optimize';

export async function getCloudRewriteDisclosure() {
  try {
    const response = await fetch(URL, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const { cloudRewrite } = await response.json();
    if (typeof cloudRewrite?.id === 'string' && typeof cloudRewrite?.provider === 'string') return cloudRewrite;
  } catch {
    // Quick Rewrite remains available.
  }
  return null;
}

function createOptimizerError(status, payload = {}, statusText = '') {
  const rawMessage = payload.error || statusText || 'Optimization request failed';
  const code = payload.code || '';
  let userMessage = rawMessage;

  const isRawProviderError = /(gemini|openrouter) api error/i.test(rawMessage);
  const isPromptIqAuthError =
    status === 401 &&
    !isRawProviderError &&
    (code.startsWith('AUTH') || /unauthorized|invalid or missing token|session/i.test(rawMessage));

  if (isPromptIqAuthError) {
    userMessage = 'Your session expired. Please log in again.';
  } else if (status === 403 || /locked/i.test(rawMessage)) {
    userMessage = 'Finish account setup before using AI Rewrite.';
  } else if (code === 'CLOUD_AI_DAILY_LIMIT_REACHED' || code === 'PREMIUM_DAILY_LIMIT_REACHED') {
    userMessage = rawMessage;
  } else if (status === 429 || /daily limit|rate limit|quota/i.test(rawMessage)) {
    userMessage = 'You have reached your daily optimization limit.';
  } else if (isRawProviderError || status >= 500 || code.startsWith('GEMINI_') || code.startsWith('OPTIMIZER_')) {
    userMessage = 'PromptIQ optimization is temporarily unavailable. Please try again shortly.';
  }

  const err = new Error(userMessage);
  err.status = status;
  err.code = code;
  return err;
}

export async function optimizePrompt(originalPrompt, platform, disclosureId, detectedIntent, token, mode = 'standard') {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      originalPrompt,
      platform,
      disclosureId,
      detectedIntent,
      mode
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw createOptimizerError(response.status, errorData, response.statusText);
  }

  const data = await response.json();
  return data;
}
