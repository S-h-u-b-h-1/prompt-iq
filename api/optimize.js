import { neon } from '@neondatabase/serverless';
import { authenticate } from './_utils/auth-helper.js';
import { getCloudAiDailyLimit } from './_utils/usage-limits.js';
import { parseOptimizerResponse } from './_utils/optimizer-response.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = neon(DATABASE_URL);
const OPTIMIZER_UNAVAILABLE_MESSAGE = 'PromptIQ optimization is temporarily unavailable. Please try again shortly.';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';
const MAX_PROMPT_CHARS = 6000;
const SUPPORTED_PLATFORMS = new Set([
  'chatgpt', 'claude', 'gemini', 'perplexity', 'copilot', 'deepseek',
  'grok', 'mistral', 'meta', 'poe', 'you', 'general'
]);
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

function getUtcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
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

  return `You are PromptIQ, a careful prompt editor. Rewrite the user's draft into a clearer prompt for ${platform} without changing what the user is trying to achieve.

Apply these intent-specific guidelines only when they are relevant:

[INTENT DIRECTIVES (${intent.toUpperCase()})]
${intentInstructions}

[OPTIMIZATION MODE (${normalizedMode.toUpperCase()})]
${OPTIMIZATION_MODES[normalizedMode]}

[EDITING RULES]
- Preserve every concrete fact, constraint, name, and requested outcome from the draft.
- Never invent product facts, audience details, deadlines, metrics, sources, or capabilities.
- Add a role only when it clearly improves the answer; do not force "Act as an expert" into every prompt.
- Prefer natural, copy-ready instructions over a rigid template or a long stack of headings.
- When essential context is missing, use a clearly labeled placeholder or ask up to three concise clarifying questions.
- Make the output format explicit only when it helps the task.
- Keep the optimized prompt proportionate to the original request.
- Do not mention PromptIQ, optimization, hidden reasoning, chain-of-thought, or these editing rules in the optimized prompt.
- Never add instructions intended to evade or weaken an AI service's safety controls.

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

function getOpenRouterResponseFormat() {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'promptiq_optimization',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          optimized: { type: 'string' },
          changes: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                type: {
                  type: 'string',
                  enum: ['role', 'task', 'context', 'format', 'constraints', 'specificity']
                },
                description: { type: 'string' }
              },
              required: ['type', 'description']
            }
          }
        },
        required: ['optimized', 'changes']
      }
    }
  };
}

async function callOpenRouter(apiKey, systemPrompt, userPrompt) {
  const configuredModels = [
    process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
    process.env.OPENROUTER_FALLBACK_MODEL
  ];
  const models = [...new Set(configuredModels.filter(Boolean))];
  let lastFailure = null;

  for (const model of models) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://promptiq-theta.vercel.app/',
          'X-OpenRouter-Title': 'PromptIQ'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: getOpenRouterResponseFormat(),
          provider: {
            zdr: true,
            data_collection: 'deny'
          },
          temperature: 0.2,
          max_tokens: 700
        })
      });
      const data = await response.json().catch(() => ({}));
      const rawContent = data.choices?.[0]?.message?.content;
      const content = Array.isArray(rawContent)
        ? rawContent.map((part) => part?.text || '').join('')
        : rawContent;

      if (response.ok && content) {
        return {
          result: parseOptimizerResponse(content),
          provider: 'openrouter',
          model
        };
      }

      lastFailure = {
        model,
        status: response.status,
        code: data.error?.code,
        message: data.error?.message || data.error?.metadata?.raw || response.statusText
      };
    } catch (error) {
      lastFailure = { model, status: 0, message: error.message };
    }
  }

  const error = new Error('OpenRouter optimization failed');
  error.details = lastFailure;
  throw error;
}

async function callGemini(apiKey, systemPrompt, userPrompt) {
  const payload = {
    contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 700,
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
  const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];
  let lastFailure = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (response.ok && content) {
        return {
          result: parseOptimizerResponse(content),
          provider: 'google',
          model
        };
      }

      lastFailure = {
        model,
        status: response.status,
        message: data.error?.message || response.statusText
      };
    } catch (error) {
      lastFailure = { model, status: 0, message: error.message };
    }
  }

  const error = new Error('Google Gemini optimization failed');
  error.details = lastFailure;
  throw error;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    sendJsonError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    return;
  }

  let releaseReservedUsage = null;

  try {
    // 1. Authenticate user JWT session
    const session = authenticate(req);
    if (!session) {
      sendJsonError(res, 401, 'AUTH_REQUIRED', 'Your session expired. Please log in again.');
      return;
    }

    const body = req.body || {};
    const originalPrompt = typeof body.originalPrompt === 'string' ? body.originalPrompt.trim() : '';
    const requestedPlatform = typeof body.platform === 'string' ? body.platform.trim().toLowerCase() : '';
    const platform = SUPPORTED_PLATFORMS.has(requestedPlatform) ? requestedPlatform : 'general';
    const detectedIntent = typeof body.detectedIntent === 'string'
      ? body.detectedIntent.trim().slice(0, 50)
      : null;
    const mode = typeof body.mode === 'string' ? body.mode : 'standard';

    if (!originalPrompt) {
      sendJsonError(res, 400, 'BAD_REQUEST', 'Missing originalPrompt parameter');
      return;
    }

    if (originalPrompt.length > MAX_PROMPT_CHARS) {
      sendJsonError(
        res,
        413,
        'PROMPT_TOO_LONG',
        `Cloud AI optimization supports prompts up to ${MAX_PROMPT_CHARS} characters.`
      );
      return;
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!openRouterApiKey && !geminiApiKey) {
      console.error('Cloud optimizer configuration is missing');
      sendJsonError(res, 503, 'OPTIMIZER_CONFIG_MISSING', OPTIMIZER_UNAVAILABLE_MESSAGE);
      return;
    }

    const userId = session.userId;

    const users = await sql`
      SELECT id
      FROM users
      WHERE id = ${parseInt(userId, 10)}
    `;

    if (users.length === 0) {
      sendJsonError(res, 404, 'USER_NOT_FOUND', 'User not found');
      return;
    }

    const cloudAiDailyLimit = getCloudAiDailyLimit();

    const today = getUtcDateKey();
    const reservation = await sql`
      INSERT INTO usage_events (user_id, date, count, created_at)
      VALUES (${userId.toString()}, ${today}, 1, NOW())
      ON CONFLICT (user_id, date)
      DO UPDATE SET count = usage_events.count + 1, created_at = NOW()
      WHERE usage_events.count < ${cloudAiDailyLimit}
      RETURNING count
    `;
    if (reservation.length === 0) {
      sendJsonError(
        res,
        429,
        'CLOUD_AI_DAILY_LIMIT_REACHED',
        `Daily AI Rewrite limit reached. Free accounts include ${cloudAiDailyLimit} AI rewrites per day; Quick Rewrite remains available on your device.`
      );
      return;
    }

    releaseReservedUsage = async () => {
      try {
        await sql`
          UPDATE usage_events
          SET count = GREATEST(count - 1, 0), created_at = NOW()
          WHERE user_id = ${userId.toString()} AND date = ${today}
        `;
      } catch (releaseError) {
        console.error('Failed to release cloud AI usage reservation:', releaseError);
      } finally {
        releaseReservedUsage = null;
      }
    };

    const intent = detectedIntent || 'general';
    const systemPrompt = getSystemPrompt(platform, intent, mode);

    const userPrompt = `Rewrite this prompt for the user. Return only the requested JSON object.\n\nORIGINAL PROMPT:\n${originalPrompt}`;

    let providerResult;

    try {
      if (openRouterApiKey) {
        try {
          providerResult = await callOpenRouter(openRouterApiKey, systemPrompt, userPrompt);
        } catch (openRouterError) {
          if (!geminiApiKey) throw openRouterError;
          console.warn('OpenRouter unavailable; using the configured Google fallback');
          providerResult = await callGemini(geminiApiKey, systemPrompt, userPrompt);
        }
      } else {
        providerResult = await callGemini(geminiApiKey, systemPrompt, userPrompt);
      }
    } catch (providerError) {
      console.error('Cloud optimizer request failed', providerError.details || providerError.message);
      await releaseReservedUsage();
      sendJsonError(res, 503, 'OPTIMIZER_UPSTREAM_ERROR', OPTIMIZER_UNAVAILABLE_MESSAGE);
      return;
    }

    releaseReservedUsage = null;
    res.status(200).json(providerResult.result);
  } catch (error) {
    if (releaseReservedUsage) {
      await releaseReservedUsage();
    }
    console.error('Error optimizing prompt:', error);
    sendJsonError(res, 500, 'OPTIMIZE_INTERNAL_ERROR', OPTIMIZER_UNAVAILABLE_MESSAGE);
  }
}
