/**
 * PromptIQ Local Prompt Analysis & Enhancement Engine
 */

const INTENT_KEYWORDS = {
  coding: /\b(code|function|class|bug|api|debug|regex|database|query|compile|github|git|javascript|js|python|html|css|java|c\+\+|rust|typescript|sql|programming|developer)\b/i,
  marketing: /\b(marketing|seo|copywriting|ad|email campaign|launch email|newsletter|product launch|sales|social media|instagram|facebook|audience|target market|ctr|conversion|funnel|landing page|brand|copywriter)\b/i,
  research: /\b(research|literature review|sources?|citations?|evidence|study|paper|methodology|hypothesis)\b/i,
  creative: /\b(story|novel|poem|fiction|creative writing|character|plot|scifi|dialogue|metaphor|brainstorm|ideas|concept art|fable|script|narrative)\b/i,
  business: /\b(business|strategy|startup|investor|deck|marketing plan|swot|okr|kpi|pitch|revenue|profit|executive|report|slide|meeting|project management|consultant)\b/i,
  finance: /\b(finance|stock|investment|budget|valuation|crypto|bitcoin|portfolio|market trend|sheet|accounting|tax|audit|cfo|compound interest)\b/i,
  education: /\b(teach|learn|course|student|explain to|tutorial|curriculum|grade|lesson|exam|test prep|syllabus|homework|math|science|tutor|educator)\b/i,
  productivity: /\b(productivity|schedule|habit|workflow|automate|calendar|checklist|to-do|time management|efficiency|organize)\b/i,
  analysis: /\b(analyze|data|trend|graph|chart|statistics|correlation|outlier|hypothesis|excel|dataset|insight|compare|analyst)\b/i,
  writing: /\b(write|essay|article|blog post|summarize|paraphrase|grammar|tone|prose|revise|edit|proofread|letter|email|author)\b/i
};

export const OPTIMIZATION_MODES = {
  standard: {
    label: 'Standard',
    instruction: 'Balance clarity, completeness, and practical structure without making the prompt unnecessarily long.'
  },
  concise: {
    label: 'Concise',
    instruction: 'Make the prompt compact and direct while preserving the full task, constraints, and success criteria.'
  },
  detailed: {
    label: 'Detailed',
    instruction: 'Expand context, acceptance criteria, examples, and evaluation rules so the AI has enough detail to produce a high-quality answer.'
  },
  creative: {
    label: 'Creative',
    instruction: 'Encourage distinctive angles, variations, tone options, and ideation while keeping the request usable and bounded.'
  },
  technical: {
    label: 'Technical',
    instruction: 'Emphasize precision, edge cases, implementation constraints, validation steps, and measurable acceptance criteria.'
  }
};

const PLATFORM_PROFILES = {
  chatgpt: {
    label: 'ChatGPT',
    instruction: 'Use clear role, task, context, output format, and constraints sections. Prefer markdown headings and explicit success criteria.'
  },
  claude: {
    label: 'Claude',
    instruction: 'Use natural language instructions with context first, then desired output, constraints, and examples when useful.'
  },
  gemini: {
    label: 'Gemini',
    instruction: 'Use explicit task steps, source/context boundaries, and a clear final-answer format.'
  },
  perplexity: {
    label: 'Perplexity',
    instruction: 'Ask for source-aware analysis, concise synthesis, and separation between facts, assumptions, and recommendations.'
  },
  copilot: {
    label: 'Copilot',
    instruction: 'Specify the environment, expected implementation, error cases, and verification steps.'
  },
  deepseek: {
    label: 'DeepSeek',
    instruction: 'Use precise technical context, constraints, and a validation checklist for the final answer.'
  },
  grok: {
    label: 'Grok',
    instruction: 'Keep the request direct, current-context aware, and explicit about the desired evidence and output.'
  },
  mistral: {
    label: 'Le Chat',
    instruction: 'Use compact instructions, clear context boundaries, and an explicit deliverable.'
  },
  meta: {
    label: 'Meta AI',
    instruction: 'Use straightforward natural language, concrete constraints, and a clear final format.'
  },
  poe: {
    label: 'Poe',
    instruction: 'Keep the prompt model-neutral and state the task, context, constraints, and output clearly.'
  },
  you: {
    label: 'You.com',
    instruction: 'Ask for concise synthesis, source-aware claims when relevant, and a practical final answer.'
  },
  general: {
    label: 'AI assistant',
    instruction: 'Use a broadly compatible prompt structure with clear task, context, output format, and constraints.'
  }
};

export function normalizeOptimizationMode(mode) {
  return OPTIMIZATION_MODES[mode] ? mode : 'standard';
}

export function normalizePlatform(platform) {
  return PLATFORM_PROFILES[platform] ? platform : 'general';
}

export function getPlatformLabel(platform) {
  return PLATFORM_PROFILES[normalizePlatform(platform)].label;
}

export function detectIntent(promptText) {
  const text = promptText.toLowerCase();
  for (const [intent, regex] of Object.entries(INTENT_KEYWORDS)) {
    if (regex.test(text)) {
      return intent;
    }
  }
  return 'general';
}

export function checkStructure(promptText) {
  const text = promptText.toLowerCase();
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  const hasRole = /\b(act as|you are|persona|role|specialist|expert|copywriter|developer|designer|analyst|tutor|writer)\b/i.test(text);
  const hasAudience = /\b(audience|reader|user|student|customer|client|executive|demographic|viewer)\b/i.test(text);
  const hasFormat = /\b(table|markdown|json|bullets|format|structure|list|html|paragraphs|headings|outline|schema)\b/i.test(text);
  const hasConstraints = /\b(don't|do not|max|limit|avoid|must|restrict|exclude|words|characters|no)\b/i.test(text);
  const hasObjectives = /\b(write|create|summarize|explain|code|analyze|generate|make|build|list|tweak|improve)\b/i.test(text);
  const hasContext = words > 15;

  return {
    role: hasRole,
    audience: hasAudience,
    format: hasFormat,
    constraints: hasConstraints,
    objectives: hasObjectives,
    context: hasContext,
    missing: [
      !hasRole && 'role',
      !hasAudience && 'audience',
      !hasFormat && 'format',
      !hasConstraints && 'constraints',
      !hasObjectives && 'objectives',
      !hasContext && 'context'
    ].filter(Boolean)
  };
}

function getIntentRequirements(intent, originalPrompt) {
  const isEmail = /\b(email|newsletter)\b/i.test(originalPrompt);
  const requirements = {
    coding: [
      'State assumptions about the language, framework, and runtime when they are not provided.',
      'Handle relevant edge cases and include a short verification or test plan.'
    ],
    marketing: [
      'Keep claims specific and credible; use labeled placeholders for missing product facts instead of inventing them.',
      isEmail
        ? 'Provide three subject line options, preview text, and a polished email body with one clear call to action.'
        : 'Match the message to the intended audience, channel, and desired action.'
    ],
    research: [
      'Separate established facts, reasonable inferences, and unresolved questions.',
      'Request reliable sources and note important limitations or conflicting evidence.'
    ],
    business: [
      'Prioritize decisions, trade-offs, measurable outcomes, and practical next steps.',
      'Use relevant metrics or frameworks only when they genuinely clarify the recommendation.'
    ],
    creative: [
      'Preserve the requested premise and voice while offering distinctive, non-generic choices.',
      'Avoid cliches and keep characters, tone, and continuity consistent.'
    ],
    finance: [
      'State assumptions and distinguish calculations from judgment or general information.',
      'Call out material risks, uncertainty, and data that should be verified.'
    ],
    education: [
      'Explain concepts in a logical sequence and adapt the depth to the learner.',
      'Use a short example and a quick check for understanding when useful.'
    ],
    productivity: [
      'Turn the request into practical steps with clear priorities and realistic effort.',
      'Prefer a simple workflow over unnecessary tools or complexity.'
    ],
    analysis: [
      'Use only the supplied data or clearly labeled assumptions.',
      'Show the key findings, relevant comparisons, and limitations before recommendations.'
    ],
    writing: [
      'Preserve the intended meaning while improving clarity, flow, and tone.',
      'Avoid filler, repetition, unsupported claims, and unnecessary formality.'
    ],
    general: [
      'Address the request directly and make the result specific enough to use immediately.',
      'Do not invent missing facts; ask concise clarifying questions when a missing detail would materially change the answer.'
    ]
  };

  return requirements[intent] || requirements.general;
}

function getOutputGuidance(intent, originalPrompt) {
  if (intent === 'coding') return 'Return the implementation first, followed by concise setup, verification, and edge-case notes.';
  if (intent === 'marketing' && /\b(email|newsletter)\b/i.test(originalPrompt)) {
    return 'Return subject lines, preview text, and the final email in clean copy-ready sections.';
  }
  if (intent === 'research') return 'Use clear headings, cite sources where possible, and end with limitations and open questions.';
  if (intent === 'analysis' || intent === 'business' || intent === 'finance') {
    return 'Lead with the conclusion, then show supporting analysis and a short action list.';
  }
  if (intent === 'education') return 'Use a step-by-step explanation with one concrete example and a short recap.';
  if (intent === 'productivity') return 'Return a prioritized checklist with owners, timing, or dependencies where relevant.';
  if (intent === 'creative') return 'Return the requested creative work without prefacing it with process commentary.';
  return 'Use the clearest format for the task, with short headings or bullets only when they improve readability.';
}

export function analyzeAndEnhancePrompt(originalPrompt, options = {}) {
  if (!originalPrompt || originalPrompt.trim() === '') {
    return {
      enhancedPrompt: '',
      intent: 'general',
      missing: [],
      mode: 'standard',
      platform: 'general'
    };
  }

  const intent = detectIntent(originalPrompt);
  const structure = checkStructure(originalPrompt);
  const mode = normalizeOptimizationMode(options.mode);
  const platform = normalizePlatform(options.platform);
  const modeProfile = OPTIMIZATION_MODES[mode];
  const platformProfile = PLATFORM_PROFILES[platform];
  
  const roles = {
    coding: 'expert software engineer',
    marketing: 'senior marketing copywriter and conversion strategist',
    research: 'rigorous academic researcher and analyst',
    business: 'expert business consultant and corporate strategist',
    creative: 'creative writer and narrative designer',
    finance: 'senior financial analyst',
    education: 'expert educator and academic tutor',
    productivity: 'workflow automation and productivity specialist',
    analysis: 'senior data analyst',
    writing: 'professional editor and copyeditor',
    general: 'highly capable expert assistant'
  };

  const task = originalPrompt.trim();
  const requirements = getIntentRequirements(intent, task);
  const lines = [];

  if (!structure.role && mode !== 'concise') {
    const role = roles[intent] || roles.general;
    const article = /^[aeiou]/i.test(role) ? 'an' : 'a';
    lines.push(`Work as ${article} ${role}.`);
  }

  lines.push('', 'Task', task, '', 'Requirements');
  for (const requirement of requirements) lines.push(`- ${requirement}`);
  lines.push(`- ${modeProfile.instruction}`);
  lines.push(`- ${platformProfile.instruction}`);
  if (!structure.audience) {
    lines.push('- If the intended audience materially affects the answer, ask for it or use a clearly labeled assumption.');
  }
  lines.push('- Preserve the original intent and do not add facts, promises, or requirements that were not supplied.');
  lines.push('', 'Output', getOutputGuidance(intent, task));

  const draft = lines.join('\n').replace(/^\n+/, '').trim();

  return {
    enhancedPrompt: draft.trim(),
    intent,
    missing: structure.missing,
    mode,
    platform
  };
}
