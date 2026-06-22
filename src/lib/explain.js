/**
 * Normalizes changes from the optimizer into display-ready items with icons.
 */

const TYPE_MAP = {
  // Dimension-based types
  role: { label: 'Role / Persona', icon: '👤' },
  task: { label: 'Task Definition', icon: '🎯' },
  context: { label: 'Context / Background', icon: '📖' },
  format: { label: 'Output Format', icon: '📊' },
  constraints: { label: 'Constraints', icon: '⛔' },
  specificity: { label: 'Specificity', icon: '🔍' },
  
  // Action-based types (fallbacks or alternative model styles)
  addition: { label: 'Added Detail', icon: '➕' },
  modification: { label: 'Refined Phrasing', icon: '✏️' },
  removal: { label: 'Removed Clutter', icon: '➖' }
};

export function explainChanges(changes) {
  if (!Array.isArray(changes)) return [];

  return changes.map(change => {
    const rawType = (change.type || '').toLowerCase();
    const mapping = TYPE_MAP[rawType] || { label: 'General Optimization', icon: '⚡' };
    
    return {
      type: rawType,
      label: mapping.label,
      icon: mapping.icon,
      description: change.description || ''
    };
  });
}
