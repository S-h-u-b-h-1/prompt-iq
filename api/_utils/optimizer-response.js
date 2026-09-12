const ALLOWED_CHANGE_TYPES = new Set([
  'role',
  'task',
  'context',
  'format',
  'constraints',
  'specificity'
]);

export function parseOptimizerResponse(content) {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Optimizer returned empty content');
  }

  const normalized = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const parsed = JSON.parse(normalized);

  if (typeof parsed.optimized !== 'string' || !parsed.optimized.trim()) {
    throw new Error('Optimizer response is missing optimized text');
  }

  const changes = Array.isArray(parsed.changes)
    ? parsed.changes
        .filter((change) => change && typeof change.description === 'string')
        .slice(0, 12)
        .map((change) => ({
          type: ALLOWED_CHANGE_TYPES.has(change.type) ? change.type : 'specificity',
          description: change.description.trim().slice(0, 500)
        }))
    : [];

  return {
    optimized: parsed.optimized.trim().slice(0, 30000),
    changes
  };
}
