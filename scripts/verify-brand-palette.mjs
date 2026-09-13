import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = [
  'website.css', 'src/popup/onboarding.css', 'src/popup/popup.html',
  'src/popup/popup.js', 'src/components/panel.js',
  'privacy.html', 'terms.html', 'support.html',
  'public/brand-mark.svg', 'public/favicon.svg'
];
const allowedHex = new Set(['#101414', '#171e1b', '#9fffc8', '#f1f7f3', '#a8b8af']);
for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const [color] of source.matchAll(/(?<!&)#[a-f\d]{6}(?:[a-f\d]{2})?\b|(?<!&)#[a-f\d]{3}\b/gi)) {
    assert.ok(allowedHex.has(color.toLowerCase()), `${file}: unexpected color ${color}`);
  }
  for (const [, r, g, b] of source.matchAll(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/g)) {
    assert.ok(['159,255,200', '255,255,255'].includes(`${r},${g},${b}`), `${file}: unexpected RGB color`);
  }
}
for (const file of ['website.css', 'src/popup/onboarding.css', 'src/popup/popup.html', 'src/components/panel.js']) {
  assert.match(await readFile(file, 'utf8'), /prefers-reduced-motion:\s*reduce/, `${file}: motion preference missing`);
}
for (const file of ['website.css', 'src/popup/popup.html', 'src/components/panel.js']) {
  assert.match(await readFile(file, 'utf8'), /white-space:\s*pre-wrap/, `${file}: prompt formatting missing`);
}
const luminance = hex => {
  const linear = [1, 3, 5].map(offset => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
};
for (const [text, surface] of [['#f1f7f3', '#101414'], ['#a8b8af', '#171e1b'], ['#101414', '#9fffc8']]) {
  const values = [luminance(text), luminance(surface)].sort((a, b) => b - a);
  assert.ok((values[0] + .05) / (values[1] + .05) >= 4.5, `Insufficient text contrast: ${text} on ${surface}`);
}
console.log('Graphite/mint palette, text contrast, formatting, and reduced-motion checks passed.');
