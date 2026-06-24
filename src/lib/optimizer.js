/**
 * LLM Prompt Optimization client communication helper
 */

export async function optimizePrompt(originalPrompt, platform, locallyEnhancedPrompt = null, detectedIntent = null, mode = null, token = null) {
  return optimizeWithGemini(originalPrompt, platform, locallyEnhancedPrompt, detectedIntent, mode, token);
}

async function optimizeWithGemini(originalPrompt, platform, locallyEnhancedPrompt, detectedIntent, mode, token) {
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
      detectedIntent,
      mode
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || response.statusText;
    const err = new Error(message.includes('API error') || message.includes('locked') || message.includes('limit') ? message : `Gemini API error: ${response.status} ${message}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  return data;
}
