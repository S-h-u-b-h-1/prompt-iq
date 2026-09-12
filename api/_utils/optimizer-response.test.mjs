import assert from 'node:assert/strict';
import { parseOptimizerResponse } from './optimizer-response.js';

const parsed = parseOptimizerResponse('```json\n{"optimized":"Improved prompt","changes":[{"type":"role","description":"Added a role"}]}\n```');
assert.equal(parsed.optimized, 'Improved prompt');
assert.deepEqual(parsed.changes, [{ type: 'role', description: 'Added a role' }]);

const normalized = parseOptimizerResponse('{"optimized":"Test","changes":[{"type":"unknown","description":"Clarified it"}]}');
assert.equal(normalized.changes[0].type, 'specificity');
assert.throws(() => parseOptimizerResponse(''), /empty content/);
assert.throws(() => parseOptimizerResponse('{"changes":[]}'), /missing optimized text/);

console.log('All optimizer response tests passed!');
