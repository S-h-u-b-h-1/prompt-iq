export const DISCLOSURE_VERSION = '2026-09-13-v2';
const PLATFORMS = new Set(['chatgpt','claude','gemini','perplexity','copilot','deepseek','general']);
const MODES = new Set(['standard','concise','detailed','creative','technical']);
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(message) { const error = new Error(message); error.status = 400; throw error; }
function text(value, max, name) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || value.includes('\u0000')) fail('Invalid ' + name);
  return value.trim();
}
export function validatePreferences(body) {
  if (!body || typeof body.saveDrafts !== 'boolean' || typeof body.saveSearches !== 'boolean' || body.disclosureVersion !== DISCLOSURE_VERSION) fail('Accept the current disclosure and provide both preferences.');
  return { saveDrafts: body.saveDrafts, saveSearches: body.saveSearches, disclosureVersion: DISCLOSURE_VERSION };
}
export function validateActivity(body) {
  if (!body || !UUID.test(body.clientId || '')) fail('Invalid activity ID');
  if (body.kind === 'draft') {
    if (!PLATFORMS.has(body.platform) || !MODES.has(body.mode) || !Number.isSafeInteger(body.revision) || body.revision < 1 || body.revision > 2147483647) fail('Invalid draft settings');
    return { kind:'draft', clientId:body.clientId, text:text(body.text,6000,'draft'), platform:body.platform, mode:body.mode, revision:body.revision };
  }
  if (body.kind === 'search') {
    if (!Number.isSafeInteger(body.resultCount) || body.resultCount < 0 || body.resultCount > 10000) fail('Invalid result count');
    return { kind:'search',clientId:body.clientId,text:text(body.text,500,'search'),category:text(body.category,100,'category'),resultCount:body.resultCount };
  }
  fail('Invalid activity kind');
}
export function validateActivityPage(query) {
  const limit = query.limit === undefined ? 50 : Number(query.limit);
  const offset = query.offset === undefined ? 0 : Number(query.offset);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0 || offset > 10000) fail('Invalid pagination');
  return {limit,offset};
}

export function validateOptimization(body) {
  if (!body || !PLATFORMS.has(body.platform)) fail('Invalid platform');
  text(body.original,6000,'original prompt');
  text(body.optimized,20000,'optimized prompt');
  if (!Number.isInteger(body.scoreDelta) || body.scoreDelta < -100 || body.scoreDelta > 100) fail('Invalid score change');
  for (const key of ['scoreOriginal','scoreOptimized']) {
    if(body[key] != null && (!Number.isInteger(body[key]) || body[key]<0 || body[key]>100)) fail('Invalid score');
  }
  if(body.mode != null && !MODES.has(body.mode)) fail('Invalid mode');
  if(body.intent != null) text(body.intent,100,'intent');
  if(body.clientEventId != null && !UUID.test(body.clientEventId)) fail('Invalid event ID');
  if(body.engine != null && !['smart_template','premium_ai'].includes(body.engine)) fail('Invalid engine');
  return body;
}
