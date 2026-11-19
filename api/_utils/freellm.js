import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { parseOptimizerResponse } from './optimizer-response.js';

export function getFreeLlmConfig(env = process.env) {
  const key = env.FREELLM_API_KEY?.trim();
  const model = env.FREELLM_MODEL?.trim();
  const provider = env.FREELLM_PROVIDER?.trim();
  if (!key || !model || !provider || provider.length > 80) return null;
  if (/^(auto($|[:/])|fusion($|[:/])|default$)/i.test(model)) return null;

  let url;
  try {
    url = new URL(env.FREELLM_BASE_URL);
  } catch {
    return null;
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  const loopback = ['localhost', '127.0.0.1', '::1'].includes(hostname);
  const localDev = loopback && env.NODE_ENV !== 'production' && env.VERCEL !== '1';
  if (url.username || url.password || url.search || url.hash) return null;
  if (!localDev && (url.protocol !== 'https:' || isIP(hostname) || !hostname.includes('.') || /\.(local|localhost|internal)$/.test(hostname))) {
    return null;
  }
  if (localDev && !['http:', 'https:'].includes(url.protocol)) return null;
  const base = url.href.replace(/\/+$/, '');
  const endpoint = base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
  const disclosureId = createHash('sha256').update(JSON.stringify([endpoint, provider, model])).digest('hex').slice(0, 24);
  return { key, model, endpoint, disclosure: { id: disclosureId, provider } };
}

export async function rewriteWithFreeLlm(config, systemPrompt, userPrompt) {
  const response = await fetch(config.endpoint, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1200,
      stream: false
    })
  });
  if (!response.ok) throw new Error(`FreeLLMAPI HTTP ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const text = Array.isArray(content) ? content.map((part) => part.text || '').join('') : content;
  return parseOptimizerResponse(text);
}
