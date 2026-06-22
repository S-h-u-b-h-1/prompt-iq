/**
 * Heuristic & Gemini Pro LLM Prompt Optimization
 */

export async function optimizePrompt(tier, originalPrompt, platform) {
  if (tier === 'premium') {
    return optimizeWithGemini(originalPrompt, platform);
  } else {
    return optimizeLocally(originalPrompt, platform);
  }
}

function optimizeLocally(originalPrompt, platform) {
  const task = originalPrompt.trim();
  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
  
  const optimized = `### Role / Persona
Act as an expert assistant optimized to deliver precise and high-quality results on ${platformName}.

### Task Definition
${task}

### Constraints & Guidelines
- Provide a structured, step-by-step response.
- Ensure the answer is comprehensive, accurate, and direct.
- Avoid preamble, conversational introductions, or boilerplate text.

### Output Format
Format the output cleanly using Markdown (use bolding, bullet points, or tables where appropriate).`;

  return {
    optimized,
    changes: [
      {
        type: 'role',
        description: `Added a default expert role optimized specifically for ${platformName} to align tone and quality.`
      },
      {
        type: 'constraints',
        description: 'Enforced constraints for step-by-step reasoning and prohibited conversational fluff.'
      },
      {
        type: 'format',
        description: 'Requested markdown-formatted output structure for readability.'
      }
    ]
  };
}

async function optimizeWithGemini(originalPrompt, platform) {
  const url = `https://promptiq-theta.vercel.app/api/optimize`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      originalPrompt,
      platform
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
