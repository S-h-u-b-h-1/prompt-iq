import { neon } from '@neondatabase/serverless';
import { authenticate } from './utils/auth-helper.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = neon(DATABASE_URL);

function getSystemPrompt(platform, intent, mode) {
  let intentInstructions = '';
  switch (intent) {
    case 'coding':
      intentInstructions = `
- Technical Rigor: Prioritize language-specific best practices, clean modular architecture, edge case handling, and security constraints.
- Structure: Output well-commented code, explicit input/output descriptions, complexity limits (time/space), and detailed error-handling rules.
- Tone: Technical, precise, logical, and direct.`;
      break;
    case 'marketing':
      intentInstructions = `
- Copywriting: Focus on conversion copywriting frameworks (AIDA, PAS), emotional resonance, hooks, and strong Calls-to-Action (CTAs).
- Target Audience: Explicitly define and write for the core customer avatar or demographic.
- Presentation: Use engaging formatting, bold accents, and high-impact key phrases.`;
      break;
    case 'research':
      intentInstructions = `
- Rigor: Require logical reasoning chains, multi-perspective analysis, citation frameworks, and source verification instructions.
- Depth: Ask for comprehensive reviews, background context synthesis, and potential counterarguments or limitations.
- Tone: Academic, analytical, unbiased, and objective.`;
      break;
    case 'business':
      intentInstructions = `
- Strategy: Emphasize business frameworks (SWOT, OKRs, KPI metrics, ROI), cost/benefit parameters, and decision-tree logic.
- Stakeholders: Tailor the analysis to specific corporate roles (e.g., Executive, Product Manager, Financial Analyst).
- Format: Organize with executive summaries, clear bullet lists, and structured tables.`;
      break;
    case 'creative':
      intentInstructions = `
- Style: Encourage rich descriptions, sensory vocabulary, narrative voices, analogies, and unique perspectives.
- Open-endedness: Outline loose boundaries to allow creative exploration, brainstorming variations, and ideation.
- Tone: Inspiring, imaginative, expressive, and stylistic.`;
      break;
    case 'writing':
      intentInstructions = `
- Prose: Emphasize readability, logical flow, word choice, syntactic variety, and tone consistency (formal/informal).
- Editing: Set guidelines for length, style guidelines, passive voice reduction, and narrative flow.`;
      break;
    default:
      intentInstructions = `
- Clarity: Focus on a strong Role assignment, clear Objective, explicit Constraints, and detailed Context.
- Formatting: Ensure output structures (headings, tables, lists) are well-defined.`;
  }

  let modeInstructions = '';
  switch (mode) {
    case 'turbo':
      modeInstructions = `
- Objective: Fast, direct, and concise improvement. 
- Refinement: Retain the original draft length as much as possible, focusing only on correcting major instruction ambiguities.`;
      break;
    case 'professional':
      modeInstructions = `
- Objective: The gold standard for general prompt engineering.
- Refinement: Integrate a clear role, explicit context, structured instruction hierarchy, and comprehensive output styling rules.`;
      break;
    case 'research':
      modeInstructions = `
- Objective: Maximum depth, reasoning, and structure.
- Refinement: Inject explicit Chain-of-Thought (CoT) instructions (e.g., 'Analyze step-by-step...'), demand detailed justifications, and structure extensive context layers.`;
      break;
    case 'creative':
      modeInstructions = `
- Objective: Maximum creativity and ideation.
- Refinement: Allow open brainstorming constraints, prompt for multiple alternative suggestions, and set stylistic descriptors.`;
      break;
    case 'coding':
      modeInstructions = `
- Objective: Extreme technical and debugging precision.
- Refinement: Build rigorous algorithmic specifications, input/output boundary rules, syntax validation checks, and security requirements.`;
      break;
    case 'business':
      modeInstructions = `
- Objective: Strategic planning and ROI decision-making.
- Refinement: Structure prompts around market analysis, financial implications, KPI targets, stakeholder alignment, and risk assessments.`;
      break;
    default:
      modeInstructions = `
- Objective: Balanced general prompt optimization.`;
  }

  return `You are PromptIQ, the world's best AI Prompt Optimizer. Your sole mission is to refine, polish, and validate text prompts to produce superior AI responses on ${platform}.

Your task is to optimize the provided pre-structured draft using the following intent-specific and mode-specific directives:

[INTENT DIRECTIVES (${intent.toUpperCase()})]
${intentInstructions}

[MODE DIRECTIVES (${mode.toUpperCase()})]
${modeInstructions}

[INSTRUCTION HIERARCHY RULES]
- **Role Assignment:** Define a clear persona/role at the very beginning (e.g., "Act as an expert copywriter...").
- **Task/Objective:** Frame the core task with precise action verbs.
- **Context & Elaboration:** Synthesize background detail and target audience parameters.
- **Explicit Constraints:** Add boundaries (e.g., "Do not include fluff", "Format strictly as...").
- **Format Directive:** Specify markdown structure (tables, headers, etc.).

Your response MUST be strict JSON matching this schema:
{
  "optimized": "The fully refined and optimized prompt text",
  "changes": [
    {
      "type": "role|task|context|format|constraints|specificity",
      "description": "Short explanation of what was changed and how it improves the prompt quality"
    }
  ]
}

Ensure the output is valid JSON. Do not wrap the JSON in markdown code blocks like \`\`\`json.`;
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
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
    // 1. Authenticate user JWT session
    const session = authenticate(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
      return;
    }

    const { originalPrompt, platform, locallyEnhancedPrompt, detectedIntent, mode } = req.body;

    if (!originalPrompt || !platform) {
      res.status(400).json({ error: 'Missing originalPrompt or platform parameter' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Gemini API Key is not configured on the server' });
      return;
    }

    const userId = session.userId;

    // 2. Resolve plan dynamically in real-time from Neon DB
    const users = await sql`
      SELECT u.id, u.plan as base_plan, s.plan as sub_plan, s.status as sub_status
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = CAST(u.id AS VARCHAR) AND s.status = 'active'
      WHERE u.id = ${parseInt(userId, 10)}
    `;

    if (users.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = users[0];
    const resolvedPlan = user.sub_status === 'active' && user.sub_plan ? user.sub_plan : user.base_plan;
    const optMode = mode || 'turbo';

    // 3. Enforce Pro mode locks on server
    if (resolvedPlan === 'free' && optMode !== 'turbo') {
      res.status(403).json({ error: 'Pro mode locked: Free users can only use Turbo mode' });
      return;
    }

    // 4. Enforce daily usage count limits on server
    const today = new Date().toISOString().split('T')[0];
    const usage = await sql`
      SELECT count FROM usage_events
      WHERE user_id = ${userId.toString()} AND date = ${today}
    `;

    const dailyCount = usage.length > 0 ? usage[0].count : 0;
    if (resolvedPlan === 'free' && dailyCount >= 5) {
      res.status(429).json({ error: 'Daily limit reached: Free plan is limited to 5 optimizations per day' });
      return;
    }

    const intent = detectedIntent || 'general';
    const systemPrompt = getSystemPrompt(platform, intent, optMode);

    const payload = {
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\nUSER ORIGINAL PROMPT:\n${originalPrompt}\n\nLOCALLY ENHANCED BASE DRAFT:\n${locallyEnhancedPrompt || originalPrompt}`
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

    // 5. Success! Increment daily usage limits on the server
    await sql`
      INSERT INTO usage_events (user_id, date, count, created_at)
      VALUES (${userId.toString()}, ${today}, 1, NOW())
      ON CONFLICT (user_id, date)
      DO UPDATE SET count = usage_events.count + 1, created_at = NOW();
    `;

    res.status(200).json(parsed);
  } catch (error) {
    console.error('Error optimizing prompt:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
