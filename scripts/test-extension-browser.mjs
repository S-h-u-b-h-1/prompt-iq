import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const dist = resolve(process.env.PROMPTIQ_TEST_DIST || 'dist');
const { version } = JSON.parse(await readFile(resolve(dist, 'manifest.json'), 'utf8'));
const profile = await mkdtemp(resolve(tmpdir(), 'promptiq-browser-'));
const backend = 'https://promptiq-theta.vercel.app';
const screenshots = process.env.PROMPTIQ_SCREENSHOTS;
const original = 'Write a launch email for a fictional calendar app. Keep it under 100 words.';
const user = { id: 7, email: 'reviewer@example.com', plan: 'free' };
const requests = [];
const rewrites = [];
let preferences = {};
let context;

const sites = [
  ['chatgpt.com', 'chatgpt', '<div id="prompt-textarea" class="ProseMirror" contenteditable="true" role="textbox"></div>'],
  ['claude.ai', 'claude', '<div data-testid="chat-input"><div class="tiptap ProseMirror" contenteditable="true" role="textbox"></div></div>'],
  ['gemini.google.com', 'gemini', '<rich-textarea><div class="ql-editor" contenteditable="true" aria-label="Enter a prompt for Gemini" role="textbox"></div></rich-textarea>'],
  ['www.perplexity.ai', 'perplexity', '<div data-lexical-editor="true" contenteditable="true" role="textbox"></div>'],
  ['grok.com', 'grok', '<div class="query-bar-editor" contenteditable="true" aria-label="Message Grok" role="textbox"></div>'],
  ['chat.deepseek.com', 'deepseek', '<textarea id="chat-input"></textarea>']
];

function fixture(composer) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Sample AI workspace</title>
  <style>
  *{box-sizing:border-box}body{margin:0;background:#101414;color:#f1f7f3;font:16px/1.5 system-ui}
  header{height:76px;border-bottom:1px solid #2b3932;padding:0 40px;display:flex;align-items:center;gap:12px}
  header strong,small{color:#9fffc8}main{height:calc(100vh - 76px);width:min(60%,740px);padding:52px 42px 64px;display:flex;flex-direction:column}
  h1{font-size:42px;line-height:1.14;margin:12px 0 20px}p{color:#a8b8af;max-width:430px;margin:0}form{margin-top:auto}
  #composer{padding:14px;background:#171e1b;border:1px solid #34453b;border-radius:8px}
  #composer :is([contenteditable],textarea){display:block;width:100%;min-height:100px;background:transparent;border:0;color:inherit;font:inherit;white-space:pre-wrap;outline:none}
  #decoy{position:fixed;bottom:0;left:20px;min-width:200px;opacity:.02}
  </style><header><strong>PromptIQ</strong> by Shubhaang</header>
  <main><small>SAMPLE AI WORKSPACE</small><h1>Turn a draft into a clearer prompt.</h1>
  <p>Review the rewrite beside your draft. PromptIQ never sends the message for you.</p>
  <form onsubmit="event.preventDefault();document.body.dataset.submitted='true'"><div id="composer">${composer}</div></form></main>
  <nav><textarea id="decoy" aria-label="Search chats">Do not touch this text.</textarea></nav></html>`;
}

async function until(predicate, message) {
  for (let i = 0; i < 75; i++) {
    if (await predicate()) return;
    await new Promise((done) => setTimeout(done, 60));
  }
  assert.fail(message);
}

async function clickPanel(page, cdp, id) {
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  function find(node) {
    const attrs = node.attributes || [];
    if (attrs.some((attr, i) => i % 2 === 0 && attr === 'id' && attrs[i + 1] === id)) return node;
    for (const child of [...(node.children || []), ...(node.shadowRoots || [])]) {
      const match = find(child);
      if (match) return match;
    }
  }
  const button = find(root);
  assert.ok(button, `Missing panel action: ${id}`);
  const { backendNodeId } = button;
  await cdp.send('DOM.scrollIntoViewIfNeeded', { backendNodeId });
  const { model } = await cdp.send('DOM.getBoxModel', { backendNodeId });
  const [x1, y1, , , x2, y2] = model.content;
  await page.mouse.click((x1 + x2) / 2, (y1 + y2) / 2);
}

try {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', executablePath, headless: true,
    viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`]
  });
  if (screenshots) await mkdir(screenshots, { recursive: true });
  for (const [host, , composer] of sites) {
    await context.route(`https://${host}/**`, (route) => route.fulfill({ contentType: 'text/html', body: fixture(composer) }));
  }
  await context.route(backend + '/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const action = url.searchParams.get('action');
    const post = request.method() === 'POST';
    const data = request.postDataJSON();
    requests.push(url.pathname);
    let json = {};
    if (url.pathname === '/api/auth') json = { user, token: 'synthetic-browser-session' };
    if (url.pathname === '/api/optimize') json = { cloudRewrite: null };
    if (url.pathname === '/api/history') {
      if (action === 'preferences') {
        if (post) preferences = data;
        json = preferences;
      } else if (post) {
        rewrites.push({ ...data, id: rewrites.length + 1 });
        json = { data: rewrites.at(-1) };
      } else {
        json = rewrites;
      }
    }
    await route.fulfill({
      json,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }
    });
  });

  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const extension = 'chrome-extension://' + new URL(worker.url()).host;
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 360, height: 570 });
  await popup.goto(extension + '/src/popup/onboarding.html');
  await popup.getByText(`Version ${version}`, { exact: true }).waitFor();
  const before = requests.length;
  await popup.getByRole('button', { name: 'Try an example' }).click();
  await popup.getByRole('button', { name: 'Rewrite on device' }).click();
  assert.match(await popup.locator('#local-output').inputValue(), /fictional calendar app/);
  await popup.getByRole('button', { name: 'Copy rewrite' }).click();
  await popup.getByText(/^(Copied\.|Copy the selected text\.)$/).waitFor();
  assert.equal(requests.length, before, 'Private paste flow must not send a request');
  assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  if (screenshots) await popup.screenshot({ path: resolve(screenshots, 'toolbar-rewrite.png') });

  await popup.getByRole('button', { name: 'Sign up', exact: true }).click();
  await popup.locator('#auth-email').fill(user.email);
  await popup.locator('#auth-password').fill('SyntheticPass123!');
  assert.equal(await popup.locator('#prompt-storage-consent').isChecked(), false);
  assert.equal(await popup.locator('#search-storage-consent').isChecked(), false);
  await popup.locator('#history-consent').check();
  await popup.getByRole('button', { name: 'Create account', exact: true }).click();
  await popup.locator('#auth-dialog').waitFor({ state: 'hidden' });
  await popup.getByText('Quick Rewrite and account history are ready.').waitFor();
  assert.equal(preferences.saveDrafts, false);

  for (const [host, platform] of sites) {
    const page = await context.newPage();
    await page.goto(`https://${host}/`);
    const composer = page.locator('#composer :is(textarea,[contenteditable="true"])');
    const value = () => composer.evaluate((el) => el.value ?? el.innerText);
    const cdp = await context.newCDPSession(page);
    await page.locator('#promptiq-container').waitFor({ state: 'visible' });
    await composer.fill(original);
    await clickPanel(page, cdp, 'score-text');
    await page.waitForTimeout(350);
    const initialLength = rewrites.length;
    await clickPanel(page, cdp, 'optimize-btn');
    await until(() => rewrites.length === initialLength + 1, `${platform}: no account rewrite saved`);
    await page.waitForTimeout(220);
    assert.equal(rewrites.at(-1).platform, platform);
    assert.equal(rewrites.at(-1).original, original);
    if (platform === 'chatgpt') {
      if (screenshots) await page.screenshot({ path: resolve(screenshots, 'store-rewrite-v18.jpg'), type: 'jpeg', quality: 94, scale: 'css' });
      await composer.fill(original + ' Mention a free trial.');
      await clickPanel(page, cdp, 'use-btn');
      assert.equal(await value(), original + ' Mention a free trial.');
      await composer.fill(original);
    }
    await clickPanel(page, cdp, 'use-btn');
    await page.waitForTimeout(120);
    const nonEmptyLines = (text) => text.split('\n').filter((line) => line.trim());
    assert.deepEqual(nonEmptyLines(await value()), nonEmptyLines(rewrites.at(-1).optimized), `${platform}: multiline rewrite did not insert`);
    assert.equal(await page.locator('#decoy').inputValue(), 'Do not touch this text.');
    assert.equal(await page.locator('body').getAttribute('data-submitted'), null);
    await clickPanel(page, cdp, 'score-text');
    await page.waitForTimeout(350);
    await clickPanel(page, cdp, 'undo-btn');
    await until(async () => (await value()) === original, `${platform}: undo did not restore the draft`);

    if (platform === 'chatgpt') {
      await clickPanel(page, cdp, 'use-btn');
      await page.evaluate(() => history.pushState({}, '', '/c/new-thread'));
      await page.waitForTimeout(100);
      await composer.fill('Different conversation');
      await clickPanel(page, cdp, 'score-text');
      await page.waitForTimeout(350);
      assert.equal(await value(), 'Different conversation');
      await composer.evaluate((el) => { el.closest('#composer').hidden = true; });
      await page.locator('#promptiq-container').waitFor({ state: 'hidden' });
      await composer.evaluate((el) => { el.closest('#composer').hidden = false; });
      await page.locator('#promptiq-container').waitFor({ state: 'visible' });
    }
    await page.close();
    console.log(`${platform}: detected composer, rewrote, inserted, and restored original.`);
  }
  assert.ok(!rewrites.some((record) => !record.original || !record.optimized));
  console.log('Chrome passed the private toolbar, signup, six inline fixtures, stale draft protection, and composer reattachment.');

  const liveFilter = process.env.PROMPTIQ_TEST_LIVE;
  if (liveFilter) {
    const liveSites = [
      ['gemini.google.com', '/app', '.ql-editor[aria-label="Enter a prompt for Gemini"]'],
      ['www.perplexity.ai', '/', '[data-lexical-editor="true"][role="textbox"]'],
      ['grok.com', '/', '.query-bar-editor[contenteditable="true"]']
    ];
    for (const [host, path, selector] of liveSites) {
      if (liveFilter !== '1' && liveFilter !== host) continue;
      await context.unroute(`https://${host}/**`);
      const page = await context.newPage();
      const response = await page.goto(`https://${host}${path}`, { waitUntil: 'domcontentloaded', timeout: 18000 });
      assert.ok(response?.ok(), `${host}: live navigation returned ${response?.status()}`);
      const composer = page.locator(selector).first();
      await composer.fill(original, { timeout: 12000 });
      if (host === 'grok.com') {
        const reject = page.getByRole('button', { name: 'Reject All', exact: true });
        if (await reject.waitFor({ state: 'visible', timeout: 6500 }).then(() => true, () => false)) {
          await reject.click();
          await reject.waitFor({ state: 'hidden' });
        }
      }
      await page.locator('#promptiq-container').waitFor({ state: 'visible', timeout: 8000 });
      const cdp = await context.newCDPSession(page);
      await clickPanel(page, cdp, 'score-text');
      await page.waitForTimeout(350);
      const previous = rewrites.length;
      await clickPanel(page, cdp, 'optimize-btn');
      await until(() => rewrites.length === previous + 1, `${host}: no rewrite produced`);
      await page.waitForTimeout(220);
      await clickPanel(page, cdp, 'use-btn');
      try {
        await until(async () => /\bRequirements\b/.test(await composer.innerText()), `${host}: insertion did not reach the composer`);
      } catch (error) {
        if (screenshots) await page.screenshot({ path: resolve(screenshots, `live-failure-${host}.png`) });
        console.error(`${host}: composer text after insert: ${JSON.stringify(await composer.innerText())}`);
        throw error;
      }
      await clickPanel(page, cdp, 'score-text');
      await page.waitForTimeout(350);
      await clickPanel(page, cdp, 'undo-btn');
      await until(async () => (await composer.innerText()).trim() === original, `${host}: undo did not restore the original`);
      await page.close();
      console.log(`${host}: live rewrite, insert, and undo passed with a synthetic draft. No message sent.`);
    }
  }
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
