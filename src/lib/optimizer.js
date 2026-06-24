/**
 * Heuristic & Gemini Pro LLM Prompt Optimization
 */

export async function optimizePrompt(originalPrompt, platform, locallyEnhancedPrompt = null, detectedIntent = null, mode = null) {
  return optimizeWithGemini(originalPrompt, platform, locallyEnhancedPrompt, detectedIntent, mode);
}

async function optimizeWithGemini(originalPrompt, platform, locallyEnhancedPrompt, detectedIntent, mode) {
  const url = `https://promptiq-theta.vercel.app/api/optimize`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
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
    const err = new Error(message.includes('API error') ? message : `Gemini API error: ${response.status} ${message}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  return data;
}
