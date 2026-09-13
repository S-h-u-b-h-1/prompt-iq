import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const outputDirectory = path.resolve('site-dist');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await mkdir(path.join(outputDirectory, 'src/lib'), { recursive: true });
await mkdir(path.join(outputDirectory, 'website-assets'), { recursive: true });

await Promise.all([
  copyFile(path.resolve('index.html'), path.join(outputDirectory, 'index.html')),
  copyFile(path.resolve('website.css'), path.join(outputDirectory, 'website.css')),
  copyFile(path.resolve('website.js'), path.join(outputDirectory, 'website.js')),
  copyFile(path.resolve('src/lib/local-optimizer.js'), path.join(outputDirectory, 'src/lib/local-optimizer.js')),
  copyFile(path.resolve('src/lib/scorer.js'), path.join(outputDirectory, 'src/lib/scorer.js')),
  copyFile(path.resolve('privacy.html'), path.join(outputDirectory, 'privacy.html')),
  copyFile(path.resolve('terms.html'), path.join(outputDirectory, 'terms.html')),
  copyFile(path.resolve('support.html'), path.join(outputDirectory, 'support.html')),
  copyFile(path.resolve('public/favicon.svg'), path.join(outputDirectory, 'favicon.svg')),
  copyFile(path.resolve('public/brand-mark.svg'), path.join(outputDirectory, 'brand-mark.svg')),
  copyFile(path.resolve('website-assets/optical-rails-v13.png'), path.join(outputDirectory, 'website-assets/optical-rails-v13.png')),
  copyFile(path.resolve('website-assets/product-workspace-v13.png'), path.join(outputDirectory, 'website-assets/product-workspace-v13.png')),
  copyFile(path.resolve('public/store_icon.png'), path.join(outputDirectory, 'store_icon.png')),
]);

console.log('Website built with homepage, policy pages, support, and assets.');
