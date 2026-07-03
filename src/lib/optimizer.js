/**
 * LLM Prompt Optimization client communication helper
 */

export async function optimizePrompt(originalPrompt, platform, locallyEnhancedPrompt = null, detectedIntent = null, token = null) {
  return optimizeWithGemini(originalPrompt, platform, locallyEnhancedPrompt, detectedIntent, token);
}

function createOptimizerError(status, payload = {}, statusText = '') {
  const rawMessage = payload.error || statusText || 'Optimization request failed';
  const code = payload.code || '';
  let userMessage = rawMessage;

  const isRawGeminiError = /gemini api error/i.test(rawMessage);
  const isPromptIqAuthError =
    status === 401 &&
    !isRawGeminiError &&
    (code.startsWith('AUTH') || /unauthorized|invalid or missing token|session/i.test(rawMessage));

  if (isPromptIqAuthError) {
    userMessage = 'Your session expired. Please log in again.';
  } else if (status === 403 || /pro mode|locked|premium/i.test(rawMessage)) {
    userMessage = 'Cloud AI optimization requires PromptIQ Premium.';
  } else if (status === 429 || /daily limit|rate limit|quota/i.test(rawMessage)) {
    userMessage = 'You have reached your daily optimization limit.';
  } else if (isRawGeminiError || status >= 500 || code.startsWith('GEMINI_')) {
    userMessage = 'PromptIQ optimization is temporarily unavailable. Please try again shortly.';
  }

  const err = new Error(userMessage);
  err.status = status;
  err.code = code;
  return err;
}

async function optimizeWithGemini(originalPrompt, platform, locallyEnhancedPrompt, detectedIntent, token) {
  const url = `https://promptiq-theta.vercel.app/api/optimize`;

  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      originalPrompt,
      platform,
      locallyEnhancedPrompt,
      detectedIntent
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw createOptimizerError(response.status, errorData, response.statusText);
  }

  const data = await response.json();
  return data;
}
