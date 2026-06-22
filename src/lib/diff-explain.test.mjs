import { diffPrompt } from './diff.js';
import { explainChanges } from './explain.js';
import assert from 'assert';

console.log('Running diff and explain tests...');

// 1. Test Diffing
const original = 'write a blog post about productivity';
const optimized = 'Write a detailed blog post about productivity for remote workers.';
const diffResult = diffPrompt(original, optimized);

// Check that "Write a detailed" and "for remote workers." are marked as added
// The exact tokens might vary but there should be "added: true" segments.
const addedSegments = diffResult.filter(s => s.added);
assert.ok(addedSegments.length > 0);
assert.ok(addedSegments.some(s => s.text.includes('detailed')));
assert.ok(addedSegments.some(s => s.text.includes('remote')));

// 2. Test Explaining
const mockChanges = [
  { type: 'role', description: 'Defined the persona of an expert sales consultant.' },
  { type: 'addition', description: 'Added target audience constraint.' },
  { type: 'unknown_type', description: 'Did some magic.' }
];

const explained = explainChanges(mockChanges);
assert.strictEqual(explained.length, 3);
assert.strictEqual(explained[0].icon, '👤');
assert.strictEqual(explained[0].label, 'Role / Persona');
assert.strictEqual(explained[1].icon, '➕');
assert.strictEqual(explained[2].icon, '⚡');

console.log('All diff and explain tests passed!');
