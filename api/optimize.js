export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { originalPrompt, platform } = req.body;

    if (!originalPrompt || !platform) {
      res.status(400).json({ error: 'Missing originalPrompt or platform parameter' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Gemini API Key is not configured on the server' });
      return;
    }

    const systemPrompt = `You are an expert prompt engineer. Your job is to optimize the user's prompt for ${platform}.
Your response MUST be strict JSON matching this schema:
{
  "optimized": "The fully rewritten and optimized prompt text here",
  "changes": [
    {
      "type": "role|task|context|format|constraints|specificity",
      "description": "Short explanation of what was changed and why it improves the prompt"
    }
  ]
}
Do not include any markdown formatting (like \`\`\`json) around the JSON, just the raw JSON object. Ensure the optimized prompt includes context, a clear task, constraints, format, and role if applicable.`;

    const payload = {
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\nUSER PROMPT TO OPTIMIZE:\n${originalPrompt}`
        }]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            optimized: { type: 'STRING' },
            changes: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  type: { type: 'STRING' },
                  description: { type: 'STRING' }
                },
                required: ['type', 'description']
              }
            }
          },
          required: ['optimized', 'changes']
        }
      }
    };

    let response;
    let lastError = null;

    const callApi = async (model) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    };

    // Attempt 1: Try primary model (gemini-2.5-flash-lite)
    try {
      response = await callApi('gemini-2.5-flash-lite');
    } catch (err) {
      lastError = err;
    }

    // Attempt 2: If primary model returned 503/429 or threw a network error, retry with delay
    if (!response || response.status === 503 || response.status === 429) {
      console.warn(`Primary model gemini-2.5-flash-lite failed (status: ${response ? response.status : 'network error'}). Retrying in 1s...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        response = await callApi('gemini-2.5-flash-lite');
      } catch (err) {
        lastError = err;
      }
    }

    // Attempt 3: If retry still fails with 503/429, fall back to gemini-2.5-flash
    if (!response || response.status === 503 || response.status === 429) {
      console.warn(`Primary model retry failed. Falling back to gemini-2.5-flash...`);
      try {
        response = await callApi('gemini-2.5-flash');
      } catch (err) {
        lastError = err;
      }
    }

    // Attempt 4: If gemini-2.5-flash also fails, fall back to stable gemini-1.5-flash
    if (!response || response.status === 503 || response.status === 429) {
      console.warn(`Secondary fallback failed. Falling back to stable gemini-1.5-flash...`);
      try {
        response = await callApi('gemini-1.5-flash');
      } catch (err) {
        lastError = err;
      }
    }

    if (!response) {
      res.status(500).json({ error: `Failed to contact Gemini API: ${lastError ? lastError.message : 'Unknown error'}` });
      return;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error?.message || response.statusText;
      res.status(response.status).json({ error: `Gemini API error: ${response.status} ${message}` });
      return;
    }

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
      res.status(500).json({ error: 'Gemini API returned an empty response.' });
      return;
    }

    const content = data.candidates[0].content.parts[0].text;
    let parsed;
    try {
      parsed = JSON.parse(content.trim());
    } catch (err) {
      console.error('Failed to parse Gemini response:', content, err);
      res.status(500).json({ error: 'Gemini returned invalid format.' });
      return;
    }

    res.status(200).json(parsed);
  } catch (error) {
    console.error('Error optimizing prompt:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
