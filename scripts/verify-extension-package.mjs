import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
const prohibitedFiles = new Set(['index.html', 'privacy.html']);
const codeExtensions = new Set(['.cjs', '.htm', '.html', '.js', '.jsx', '.mjs', '.ts', '.tsx']);
const prohibitedPatterns = [
  {
    label: 'remote script',
    pattern: /<script\b[^>]*\bsrc\s*=\s*["'](?:https?:)?\/\//i,
  },
  {
    label: 'remote static import',
    pattern: /\b(?:import|export)\s+(?:[^"']*\s+from\s*)?["']https?:\/\//i,
  },
  {
    label: 'remote dynamic import',
    pattern: /\bimport\s*\(\s*["']https?:\/\//i,
  },
  {
    label: 'remote importScripts call',
    pattern: /\bimportScripts\s*\(\s*["']https?:\/\//i,
  },
  {
    label: 'remote worker',
    pattern: /\bnew\s+(?:Shared)?Worker\s*\(\s*["']https?:\/\//i,
  },
  {
    label: 'string evaluation',
    pattern: /\beval\s*\(|\bnew\s+Function\s*\(/i,
  },
  {
    label: 'embedded Google API key',
    pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/,
  },
  {
    label: 'embedded Stripe secret key',
    pattern: /\bsk_(?:live|test)_[0-9A-Za-z]{16,}\b/,
  },
];

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : entryPath;
  }));

  return files.flat();
}

const manifestPath = path.join(distDir, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

if (manifest.manifest_version !== 3) {
  throw new Error('Extension package must use Manifest V3.');
}

const files = await listFiles(distDir);
const relativeFiles = files.map((file) => path.relative(distDir, file));
const violations = relativeFiles
  .filter((file) => prohibitedFiles.has(file))
  .map((file) => `${file}: website-only file must not be included`);

if (manifest.action?.default_popup !== 'src/popup/popup.html') {
  violations.push('manifest.json: toolbar popup must point to src/popup/popup.html');
}

if (manifest.host_permissions?.some((permission) => permission.includes('*.vercel.app'))) {
  violations.push('manifest.json: backend permission must use the exact PromptIQ production host');
}

for (const file of files) {
  if (!codeExtensions.has(path.extname(file))) continue;

  const source = await readFile(file, 'utf8');
  for (const { label, pattern } of prohibitedPatterns) {
    if (pattern.test(source)) {
      violations.push(`${path.relative(distDir, file)}: ${label}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Extension package verification failed:');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exitCode = 1;
} else {
  console.log(`Extension package verified: ${relativeFiles.length} local files, no remotely hosted code.`);
}
