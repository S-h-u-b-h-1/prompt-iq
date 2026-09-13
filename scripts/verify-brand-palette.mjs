import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = [
  'website.css', 'src/popup/onboarding.css', 'src/popup/popup.html',
  'src/popup/popup.js', 'src/components/panel.js',
  'privacy.html', 'terms.html', 'support.html',
  'public/brand-mark.svg', 'public/favicon.svg'
];
const allowedHex = new Set(['#2454eb', '#fff', '#ffffff']);
for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const [color] of source.matchAll(/(?<!&)#[a-f\d]{6}(?:[a-f\d]{2})?\b|(?<!&)#[a-f\d]{3}\b/gi)) {
    assert.ok(allowedHex.has(color.toLowerCase()), `${file}: unexpected color ${color}`);
  }
  for (const [, r, g, b] of source.matchAll(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/g)) {
    assert.ok(['36,84,235', '255,255,255'].includes(`${r},${g},${b}`), `${file}: unexpected RGB color`);
  }
}
for (const file of ['website.css', 'src/popup/onboarding.css', 'src/popup/popup.html', 'src/components/panel.js']) {
  assert.match(await readFile(file, 'utf8'), /prefers-reduced-motion:\s*reduce/, `${file}: motion preference missing`);
}
console.log('Blue/white palette and reduced-motion checks passed.');
