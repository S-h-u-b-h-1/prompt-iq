import { timingSafeEqual } from 'crypto';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL environment variable is not set');

const sql = neon(DATABASE_URL);

function isAuthorized(req) {
  const expected = process.env.ADMIN_DASHBOARD_KEY || '';
  const header = String(req.headers.authorization || '');
  if (!expected || !header.startsWith('Basic ')) return false;

  try {
    const credentials = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = credentials.indexOf(':');
    if (separator < 0) return false;
    const password = credentials.slice(separator + 1);
    const actualBuffer = Buffer.from(password);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderRows(rows, labelKey, valueKey) {
  if (!rows.length) return '<tr><td colspan="2">No data yet</td></tr>';
  return rows.map((row) => `
    <tr><td>${escapeHtml(row[labelKey])}</td><td>${Number(row[valueKey] || 0).toLocaleString()}</td></tr>
  `).join('');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!process.env.ADMIN_DASHBOARD_KEY) {
    res.status(503).send('ADMIN_DASHBOARD_KEY is not configured.');
    return;
  }

  if (!isAuthorized(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="PromptIQ Analytics"');
    res.status(401).send('Authentication required.');
    return;
  }

  try {
    const [users] = await sql`SELECT COUNT(*)::int AS count FROM users`;
    const [dau] = await sql`
      SELECT COUNT(DISTINCT user_id)::int AS count
      FROM prompt_history
      WHERE created_at >= CURRENT_DATE
    `;
    const [wau] = await sql`
      SELECT COUNT(DISTINCT user_id)::int AS count
      FROM prompt_history
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `;
    const [optimizations] = await sql`SELECT COUNT(*)::int AS count FROM prompt_history`;
    const [drafts] = await sql`
      SELECT COUNT(*)::int AS count
      FROM prompt_iq.drafts
      WHERE updated_at >= NOW() - INTERVAL '30 days'
    `;
    const events = await sql`
      SELECT event_type, COUNT(*)::int AS count
      FROM event_logs
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY event_type
      ORDER BY count DESC, event_type
    `;
    const platforms = await sql`
      SELECT platform, COUNT(*)::int AS count
      FROM prompt_history
      GROUP BY platform
      ORDER BY count DESC, platform
      LIMIT 12
    `;
    const modes = await sql`
      SELECT COALESCE(mode, 'unknown') AS mode, COUNT(*)::int AS count
      FROM prompt_history
      GROUP BY mode
      ORDER BY count DESC, mode
    `;

    res.status(200).send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PromptIQ Analytics</title><style>
:root{color-scheme:dark;--bg:#101414;--ink:#f1f7f3;--muted:#a8b8af;--accent:#9fffc8;--line:rgba(159,255,200,.16)}
*{box-sizing:border-box;letter-spacing:0}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.55 system-ui,sans-serif}
main{width:min(1040px,calc(100% - 36px));margin:auto;padding:48px 0 72px}h1{font-size:36px;margin:0}p{color:var(--muted)}
.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:28px 0}.kpi{border:1px solid var(--line);padding:18px;border-radius:8px}.kpi b{display:block;color:var(--accent);font-size:26px}.kpi span{color:var(--muted);font-size:11px}
.tables{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}section{border-top:1px solid var(--line);padding-top:16px}h2{font-size:15px;margin:0 0 12px}table{width:100%;border-collapse:collapse}td{padding:8px 0;border-bottom:1px solid var(--line)}td:last-child{text-align:right;color:var(--accent)}
@media(max-width:760px){.kpis{grid-template-columns:1fr 1fr}.tables{grid-template-columns:1fr}}
</style></head><body><main>
<h1>PromptIQ Analytics</h1><p>Aggregate product signals only. Prompt text is never displayed here.</p>
<div class="kpis">
<div class="kpi"><b>${users.count}</b><span>Accounts</span></div>
<div class="kpi"><b>${dau.count}</b><span>Daily active users</span></div>
<div class="kpi"><b>${wau.count}</b><span>Weekly active users</span></div>
<div class="kpi"><b>${optimizations.count}</b><span>Saved optimizations</span></div>
<div class="kpi"><b>${drafts.count}</b><span>Drafts updated, 30 days</span></div>
</div>
<div class="tables">
<section><h2>Product events, 30 days</h2><table>${renderRows(events, 'event_type', 'count')}</table></section>
<section><h2>Optimization platforms</h2><table>${renderRows(platforms, 'platform', 'count')}</table></section>
<section><h2>Optimization modes</h2><table>${renderRows(modes, 'mode', 'count')}</table></section>
</div>
</main></body></html>`);
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).send('Analytics are temporarily unavailable.');
  }
}
