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
    instruction: ''
  },
  concise: {
    label: 'Concise',
    instruction: 'Keep the response compact and direct.'
  },
  detailed: {
    label: 'Detailed',
    instruction: 'Explain the important details and include examples where they help.'
  },
  creative: {
    label: 'Creative',
    instruction: 'Favor distinctive ideas and concrete details over generic suggestions.'
  },
  technical: {
    label: 'Technical',
    instruction: 'State technical assumptions and include relevant edge cases and verification steps.'
  }
};

const PLATFORM_PROFILES = {
  chatgpt: {
    label: 'ChatGPT',
    instruction: 'Use short Markdown headings when they improve readability.'
  },
  claude: {
    label: 'Claude',
    instruction: 'Use natural language and put necessary context before recommendations.'
  },
  gemini: {
    label: 'Gemini',
    instruction: 'Make the answer easy to scan and label any assumptions.'
  },
  perplexity: {
    label: 'Perplexity',
    instruction: 'Cite sources for claims that depend on external facts.'
  },
  copilot: {
    label: 'Copilot',
    instruction: 'Name the environment and how to check your answer when relevant.'
  },
  deepseek: {
    label: 'DeepSeek',
    instruction: 'Be precise about assumptions and how to verify key claims.'
  },
  grok: {
    label: 'Grok',
    instruction: 'Be direct and distinguish current facts from assumptions.'
  },
  mistral: {
    label: 'Le Chat',
    instruction: 'Lead with the requested deliverable.'
  },
  meta: {
    label: 'Meta AI',
    instruction: 'Use plain language and concrete details.'
  },
  poe: {
    label: 'Poe',
    instruction: ''
  },
  you: {
    label: 'You.com',
    instruction: 'Cite sources when the answer relies on external facts.'
  },
  general: {
    label: 'AI assistant',
    instruction: ''
  }
};

export function normalizeOptimizationMode(mode) {
  return Object.hasOwn(OPTIMIZATION_MODES, mode) ? mode : 'standard';
}

export function normalizePlatform(platform) {
  return Object.hasOwn(PLATFORM_PROFILES, platform) ? platform : 'general';
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
        ? 'Use a specific subject line and a clear call to action when appropriate.'
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
    return 'Return the email in a copy-ready format.';
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
  const explicitOutput = structure.format || /\b(only|exactly|nothing else|no preamble|no explanation)\b/i.test(task);
  const intentRequirements = getIntentRequirements(intent, task);
  const requirements = [intentRequirements[0]];
  if (!explicitOutput && mode !== 'concise') {
    requirements.push(intentRequirements[1], platformProfile.instruction);
  }
  if (!explicitOutput) requirements.push(modeProfile.instruction);
  if (!structure.audience && (mode === 'detailed' || mode === 'creative')) {
    requirements.push('Ask for the intended audience if it materially changes the answer.');
  }
  requirements.push('Follow the task as written. Do not add facts or requirements that were not supplied.');
  const lines = [];

  if (!structure.role && !explicitOutput && intent !== 'general' && mode !== 'concise') {
    const role = roles[intent] || roles.general;
    const article = /^[aeiou]/i.test(role) ? 'an' : 'a';
    lines.push(`Work as ${article} ${role}.`);
  }

  lines.push('', 'Task', task, '', 'Requirements');
  for (const requirement of requirements.filter(Boolean)) lines.push(`- ${requirement}`);
  if (!explicitOutput && mode !== 'concise') {
    lines.push('', 'Output', getOutputGuidance(intent, task));
  }

  const draft = lines.join('\n').replace(/^\n+/, '').trim();

  return {
    enhancedPrompt: draft.trim(),
    intent,
    missing: structure.missing,
    mode,
    platform
  };
}
