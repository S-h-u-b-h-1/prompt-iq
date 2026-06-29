import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const outputDirectory = path.resolve('site-dist');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await Promise.all([
  copyFile(path.resolve('index.html'), path.join(outputDirectory, 'index.html')),
  copyFile(path.resolve('privacy.html'), path.join(outputDirectory, 'privacy.html')),
]);

console.log('Website built with homepage and privacy policy.');
