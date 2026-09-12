import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const outputDirectory = path.resolve('site-dist');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await Promise.all([
  copyFile(path.resolve('index.html'), path.join(outputDirectory, 'index.html')),
  copyFile(path.resolve('privacy.html'), path.join(outputDirectory, 'privacy.html')),
  copyFile(path.resolve('terms.html'), path.join(outputDirectory, 'terms.html')),
  copyFile(path.resolve('support.html'), path.join(outputDirectory, 'support.html')),
  copyFile(path.resolve('public/favicon.svg'), path.join(outputDirectory, 'favicon.svg')),
  copyFile(path.resolve('public/store_icon.png'), path.join(outputDirectory, 'store_icon.png')),
  copyFile(path.resolve('public/screenshot2.png'), path.join(outputDirectory, 'screenshot2.png')),
]);

console.log('Website built with homepage, policy pages, support, and assets.');
