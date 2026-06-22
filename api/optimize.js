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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
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
      })
    });

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
