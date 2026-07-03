/**
 * PromptIQ Local Prompt Analysis & Enhancement Engine
 */

const INTENT_KEYWORDS = {
  coding: /\b(code|function|class|bug|api|debug|regex|database|query|compile|github|git|javascript|js|python|html|css|java|c\+\+|rust|typescript|sql|programming|developer)\b/i,
  marketing: /\b(marketing|seo|copywriting|ad|email campaign|sales|social media|instagram|facebook|audience|target market|ctr|conversion|funnel|landing page|brand|copywriter)\b/i,
  creative: /\b(story|novel|poem|fiction|creative writing|character|plot|scifi|dialogue|metaphor|brainstorm|ideas|concept art|fable|script|narrative)\b/i,
  business: /\b(business|strategy|startup|investor|deck|marketing plan|swot|okr|kpi|pitch|revenue|profit|executive|report|slide|meeting|project management|consultant)\b/i,
  finance: /\b(finance|stock|investment|budget|valuation|crypto|bitcoin|portfolio|market trend|sheet|accounting|tax|audit|cfo|compound interest)\b/i,
  education: /\b(teach|learn|course|student|explain to|tutorial|curriculum|grade|lesson|exam|test prep|syllabus|homework|math|science|tutor|educator)\b/i,
  productivity: /\b(productivity|schedule|habit|workflow|automate|calendar|checklist|to-do|time management|efficiency|organize)\b/i,
  analysis: /\b(analyze|data|trend|graph|chart|statistics|correlation|outlier|hypothesis|excel|dataset|insight|compare|analyst)\b/i,
  writing: /\b(write|essay|article|blog post|summarize|paraphrase|grammar|tone|prose|revise|edit|proofread|letter|email|author)\b/i
};

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

export function analyzeAndEnhancePrompt(originalPrompt) {
  if (!originalPrompt || originalPrompt.trim() === '') {
    return {
      enhancedPrompt: '',
      intent: 'general',
      missing: []
    };
  }

  const intent = detectIntent(originalPrompt);
  const structure = checkStructure(originalPrompt);
  
  // Define default values based on intent
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

  const formats = {
    coding: 'Clean markdown code blocks with line comments, input/output examples, and error handling notes.',
    marketing: 'High-impact copy structured with bold accents, short paragraphs, and direct bullet-point lists.',
    research: 'Detailed analysis organized with markdown headers, methodology descriptions, and references.',
    business: 'Executive summary format with key takeaways, bulleted metrics, and SWOT or ROI tables where applicable.',
    creative: 'Engaging narrative style with expressive descriptions and paragraph structures.',
    education: 'Step-by-step breakdown using clear explanations, definitions, and concept analogies.',
    productivity: 'Clean action checklist or process map with priority indicators.',
    analysis: 'Structured data summary with findings, key insights, and clear comparison tables.',
    writing: 'Polished prose matching the requested tone, formatted with appropriate line breaks.',
    general: 'Clear paragraphs, structured markdown lists, and headers.'
  };

  const constraints = {
    coding: 'Ensure code runs efficiently, handles basic errors gracefully, and avoids using placeholder functions.',
    marketing: 'Avoid jargon. Stay highly persuasive, clear, and action-oriented.',
    research: 'Avoid bias. Base all assertions on logical reasoning and specify limits of analysis.',
    business: 'Stay objective, focus on KPI metrics, and highlight actionable next steps.',
    creative: 'Show, don\'t tell. Maximize sensory detail and ensure natural character voices.',
    education: 'Avoid overly complex language. Ensure definitions are clear and accessible.',
    productivity: 'Focus on simplicity and ease of execution. Keep it practical.',
    analysis: 'Exclude speculative insights not grounded in data. Be precise with comparisons.',
    writing: 'Avoid passive voice, reduce filler text, and check for tone consistency.',
    general: 'Avoid boilerplate introductory remarks. Be direct and clear.'
  };

  let draft = '';
  const roleText = roles[intent] || roles.general;
  draft += `[ROLE]\nWork as the following specialist: ${roleText}.\n\n`;

  draft += `[TASK]\nComplete the following request:\n${originalPrompt.trim()}\n\n`;

  draft += `[AUDIENCE AND CONTEXT]\nUse the audience and context stated in the request. When either is missing, make the smallest reasonable assumption and label it clearly.\n\n`;

  const formatText = formats[intent] || formats.general;
  draft += `[OUTPUT FORMAT]\n${formatText}\n\n`;

  const constraintText = constraints[intent] || constraints.general;
  draft += `[CONSTRAINTS]\n${constraintText}\n\n`;
  draft += `[QUALITY CHECK]\nAddress the request directly, preserve the user's intent, make the result actionable, and do not return placeholders or instructions that bypass an AI service's safety controls.`;

  return {
    enhancedPrompt: draft.trim(),
    intent,
    missing: structure.missing
  };
}
