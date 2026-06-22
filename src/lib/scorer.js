/**
 * Local 0-100 scoring across 6 dimensions
 * Weights: task (25), context (20), role (15), format (15), constraints (15), specificity (10)
 */

export function scorePrompt(prompt) {
  if (!prompt || prompt.trim() === '') {
    return {
      score: 0,
      grade: 'Empty',
      missing: ['task', 'context', 'format', 'role', 'constraints', 'specificity'],
      details: { task: 0, context: 0, role: 0, format: 0, constraints: 0, specificity: 0 }
    };
  }

  const text = prompt.toLowerCase();
  let score = 0;
  const missing = [];
  const details = {};

  // 1. Task (25 points) - Action verbs
  const taskWords = ['write', 'create', 'explain', 'code', 'summarize', 'analyze', 'generate', 'make', 'build', 'tell', 'list', 'how'];
  const hasTask = taskWords.some(w => text.includes(w));
  if (hasTask) {
    score += 25;
    details.task = 25;
  } else {
    missing.push('task');
    details.task = 0;
  }

  // 2. Context (20 points) - Background details, situation, target audience, or context keywords
  const contextWords = ['context', 'background', 'scenario', 'because', 'situation', 'industry', 'target', 'audience', 'purpose', 'goal'];
  // If text contains context keywords, or contains 'about' / 'for' in a longer sentence
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const hasContext = contextWords.some(w => text.includes(w)) || 
                     ((text.includes('about') || text.includes('for')) && words > 10);
  if (hasContext) {
    score += 20;
    details.context = 20;
  } else {
    missing.push('context');
    details.context = 0;
  }

  // 3. Role (15 points) - Persona instructions
  const roleWords = ['act as', 'you are', 'expert', 'as a', 'persona', 'role', 'developer', 'writer', 'designer', 'consultant'];
  const hasRole = roleWords.some(w => text.includes(w));
  if (hasRole) {
    score += 15;
    details.role = 15;
  } else {
    missing.push('role');
    details.role = 0;
  }

  // 4. Format (15 points) - Output structure
  const formatWords = ['format', 'table', 'markdown', 'list', 'json', 'bullets', 'html', 'code block', 'structure', 'step-by-step', 'csv', 'paragraphs', 'headings'];
  const hasFormat = formatWords.some(w => text.includes(w));
  if (hasFormat) {
    score += 15;
    details.format = 15;
  } else {
    missing.push('format');
    details.format = 0;
  }

  // 5. Constraints (15 points) - Negative/positive boundaries (e.g., max 500 words, don't write X)
  const constraintWords = ['don\'t', 'do not', 'under', 'max', 'words', 'word', 'limit', 'must', 'exactly', 'no', 'avoid', 'restrict', 'exclude'];
  // Regex check for length constraints like "500 word" or "3 paragraphs"
  const lengthConstraintRegex = /\b\d+\s*(word|words|paragraph|paragraphs|char|chars|sentence|sentences|line|lines)\b/i;
  const hasConstraints = constraintWords.some(w => {
    const regex = new RegExp(`\\b${w}\\b`, 'i');
    return regex.test(text);
  }) || lengthConstraintRegex.test(text);

  if (hasConstraints) {
    score += 15;
    details.constraints = 15;
  } else {
    missing.push('constraints');
    details.constraints = 0;
  }

  // 6. Specificity (10 points) - Detail level (proxy: length and vocabulary diversity)
  // Let's use a scale: 0-10 based on word count, but capped at 10.
  // A prompt with > 25 words gets 10 points. 15-25 words gets 6 points. 5-15 words gets 3 points.
  let specificityScore = 0;
  if (words > 25) {
    specificityScore = 10;
  } else if (words > 15) {
    specificityScore = 6;
  } else if (words > 5) {
    specificityScore = 3;
  }
  
  // Specificity penalty: if it is long but uses very vague words repetitively
  const vagueWords = ['something', 'stuff', 'thing', 'things', 'good', 'write', 'some', 'make'];
  const vagueCount = vagueWords.filter(w => text.includes(w)).length;
  if (vagueCount > 3 && words > 15) {
    specificityScore = Math.max(0, specificityScore - 5);
  }

  score += specificityScore;
  details.specificity = specificityScore;
  
  if (specificityScore < 10) {
    missing.push('specificity');
  }

  let grade = 'Empty';
  if (score > 85) grade = 'Excellent';
  else if (score > 60) grade = 'Good';
  else if (score > 30) grade = 'Fair';
  else if (score > 0) grade = 'Weak';

  return { score, grade, missing, details };
}
