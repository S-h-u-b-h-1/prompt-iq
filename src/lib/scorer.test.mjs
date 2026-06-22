import { scorePrompt } from './scorer.js';
import assert from 'assert';

console.log('Running final scorer tests...');

// 1. Empty prompt
const emptyResult = scorePrompt('');
assert.strictEqual(emptyResult.score, 0);
assert.strictEqual(emptyResult.grade, 'Empty');
assert.deepStrictEqual(emptyResult.missing, ['task', 'context', 'format', 'role', 'constraints', 'specificity']);

// 2. Weak prompt
const weakPrompt = 'write me a blog post about productivity';
const weakResult = scorePrompt(weakPrompt);
// Task: "write" (25) + Format: none (0) + Constraints: none (0) + Specificity: 7 words (3) = 28
assert.strictEqual(weakResult.score, 28);
assert.strictEqual(weakResult.grade, 'Weak');
assert.deepStrictEqual(weakResult.missing, ['context', 'role', 'format', 'constraints', 'specificity']);

// 3. Good prompt
const goodPrompt = 'Write a 500 word blog post about productivity for remote workers';
const goodResult = scorePrompt(goodPrompt);
// Task: "Write" (25) + Context: contains 'about', length 11 > 10 (20) + Constraints: "500 word" (15) + Specificity: 11 words (3) = 63
assert.strictEqual(goodResult.score, 63);
assert.strictEqual(goodResult.grade, 'Good');
assert.deepStrictEqual(goodResult.missing, ['role', 'format', 'specificity']);

// 4. Excellent prompt
const excellentPrompt = 'Act as a professional blogger. Write a 500 word blog post about productivity for remote workers. Format as markdown. Do not include introductory remarks.';
const excellentResult = scorePrompt(excellentPrompt);
// Task: 25 + Context: 20 + Role: 15 + Format: 15 + Constraints: 15 + Specificity: 24 words (6) = 96
assert.strictEqual(excellentResult.score, 96);
assert.strictEqual(excellentResult.grade, 'Excellent');

// 5. Vague prompt specificity penalty
const vaguePrompt = 'write me some good things to make some stuff write something write some good things to make';
const vagueResult = scorePrompt(vaguePrompt);
// words = 17 (> 15, so 6 points initially). Vague words: something, stuff, things, good, write, some, make.
// vagueCount = 7 > 3, so penalty is -5. Specificity score becomes 1.
// Task: "write" (25) + Specificity: 1 = 26
assert.strictEqual(vagueResult.score, 26);

console.log('All scorer tests passed successfully!');
