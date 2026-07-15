import { neon } from '@neondatabase/serverless';
import { authenticate } from './_utils/auth-helper.js';
import { isPremiumPlan, normalizePlan } from './_utils/plans.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = neon(DATABASE_URL);
const OPTIMIZER_UNAVAILABLE_MESSAGE = 'PromptIQ optimization is temporarily unavailable. Please try again shortly.';
const OPTIMIZATION_MODES = {
  standard: 'Balance clarity, completeness, and practical structure without making the prompt unnecessarily long.',
  concise: 'Make the optimized prompt compact and direct while preserving the task, context, constraints, and output format.',
  detailed: 'Expand the optimized prompt with richer context, acceptance criteria, examples, and evaluation rules.',
  creative: 'Add creative angles, alternative framing, tone guidance, and ideation instructions while preserving the user intent.',
  technical: 'Prioritize precision, edge cases, implementation constraints, validation steps, and measurable acceptance criteria.'
};

function sendJsonError(res, status, code, message) {
  res.status(status).json({ error: message, code });
}

function normalizeMode(mode) {
  return OPTIMIZATION_MODES[mode] ? mode : 'standard';
}

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

  const normalizedMode = normalizeMode(mode);

  return `You are PromptIQ, the world's best AI Prompt Optimizer. Your sole mission is to refine, polish, and validate text prompts to produce superior AI responses on ${platform}.

Your task is to provide a premium-quality optimization of the pre-structured draft using the following intent-specific directives:

[INTENT DIRECTIVES (${intent.toUpperCase()})]
${intentInstructions}

[OPTIMIZATION MODE (${normalizedMode.toUpperCase()})]
${OPTIMIZATION_MODES[normalizedMode]}

[INSTRUCTION HIERARCHY RULES]
- **Role Assignment:** Define a clear persona/role at the very beginning (e.g., "Act as an expert copywriter...").
- **Task/Objective:** Frame the core task with precise action verbs.
- **Context & Elaboration:** Synthesize background detail and target audience parameters.
- **Explicit Constraints:** Add boundaries (e.g., "Do not include fluff", "Format strictly as...").
- **Format Directive:** Specify markdown structure (tables, headers, etc.).
- **Private Reasoning:** Evaluate intent, missing context, and platform fit internally. Do not include hidden chain-of-thought in the optimized prompt.
- **Safety Integrity:** Never add instructions intended to evade or weaken an AI service's safety controls.

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
    sendJsonError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    return;
  }

  try {
    // 1. Authenticate user JWT session
    const session = authenticate(req);
    if (!session) {
      sendJsonError(res, 401, 'AUTH_REQUIRED', 'Your session expired. Please log in again.');
      return;
    }

    const { originalPrompt, platform, locallyEnhancedPrompt, detectedIntent, mode } = req.body;

    if (!originalPrompt || !platform) {
      sendJsonError(res, 400, 'BAD_REQUEST', 'Missing originalPrompt or platform parameter');
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Gemini configuration missing', {
        hasGeminiKey: false
      });
      sendJsonError(res, 503, 'GEMINI_CONFIG_MISSING', OPTIMIZER_UNAVAILABLE_MESSAGE);
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
      sendJsonError(res, 404, 'USER_NOT_FOUND', 'User not found');
      return;
    }

    const user = users[0];
    const resolvedPlan = normalizePlan(
      user.sub_status === 'active' && user.sub_plan ? user.sub_plan : user.base_plan
    );

    if (!isPremiumPlan(resolvedPlan)) {
      sendJsonError(res, 403, 'PREMIUM_REQUIRED', 'Cloud AI optimization requires PromptIQ Premium.');
      return;
    }

    const intent = detectedIntent || 'general';
    const systemPrompt = getSystemPrompt(platform, intent, mode);

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
    let activeModel = 'gemini-2.5-flash-lite';

    const callApi = async (model) => {
      activeModel = model;
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
      console.error('Gemini API network failure', {
        model: activeModel,
        error: lastError ? lastError.message : 'Unknown error'
      });
      sendJsonError(res, 503, 'GEMINI_NETWORK_ERROR', OPTIMIZER_UNAVAILABLE_MESSAGE);
      return;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error?.message || response.statusText;
      console.error('Gemini API request failed', {
        model: activeModel,
        status: response.status,
        message
      });
      sendJsonError(res, 503, 'GEMINI_UPSTREAM_ERROR', OPTIMIZER_UNAVAILABLE_MESSAGE);
      return;
    }

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
      console.error('Gemini API returned an empty response', {
        model: activeModel
      });
      sendJsonError(res, 503, 'GEMINI_EMPTY_RESPONSE', OPTIMIZER_UNAVAILABLE_MESSAGE);
      return;
    }

    const content = data.candidates[0].content.parts[0].text;
    let parsed;
    try {
      parsed = JSON.parse(content.trim());
    } catch (err) {
      console.error('Failed to parse Gemini response', {
        model: activeModel,
        error: err.message
      });
      sendJsonError(res, 503, 'GEMINI_INVALID_FORMAT', OPTIMIZER_UNAVAILABLE_MESSAGE);
      return;
    }

    res.status(200).json(parsed);
  } catch (error) {
    console.error('Error optimizing prompt:', error);
    sendJsonError(res, 500, 'OPTIMIZE_INTERNAL_ERROR', OPTIMIZER_UNAVAILABLE_MESSAGE);
  }
}
