import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = neon(DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  try {
    // 1. Core KPIs
    const [{ count: installs }] = await sql`SELECT COUNT(*)::int as count FROM users`;
    const [{ count: activeSubs }] = await sql`SELECT COUNT(*)::int as count FROM subscriptions WHERE status = 'active'`;
    const [{ dau }] = await sql`SELECT COUNT(DISTINCT user_id)::int as dau FROM prompt_history WHERE created_at >= CURRENT_DATE`;
    const [{ wau }] = await sql`SELECT COUNT(DISTINCT user_id)::int as wau FROM prompt_history WHERE created_at >= NOW() - INTERVAL '7 days'`;
    const [{ optimizations, unique_opt_users }] = await sql`SELECT COUNT(*)::int as optimizations, COUNT(DISTINCT user_id)::int as unique_opt_users FROM prompt_history`;
    const optsPerUser = unique_opt_users > 0 ? (optimizations / unique_opt_users).toFixed(1) : 0;
    const [{ upgradeClicks }] = await sql`SELECT COUNT(*)::int as count FROM event_logs WHERE event_type = 'upgrade_click'`;

    // 2. Fetch Surveys
    const surveys = await sql`
      SELECT q1_reason, q2_tool, q3_frequency, q4_value, q5_profession, pay_willingness, pay_amount, core_value, created_at 
      FROM survey_responses 
      ORDER BY created_at DESC 
      LIMIT 100
    `;

    // 3. Segment Calculations
    // Fetch stats grouped by segment
    const segmentStats = await sql`
      SELECT 
        s.q5_profession as segment,
        COUNT(DISTINCT s.user_id)::int as installs,
        COUNT(h.id)::int as optimizations,
        COALESCE(AVG(h.score_delta), 0)::float as avg_score_improvement,
        COUNT(CASE WHEN s.pay_willingness = 'yes' THEN 1 END)::int as pay_yes,
        COUNT(CASE WHEN s.pay_willingness = 'maybe' THEN 1 END)::int as pay_maybe,
        COUNT(CASE WHEN s.pay_willingness = 'no' THEN 1 END)::int as pay_no,
        COUNT(e.id)::int as upgrade_clicks,
        COUNT(sub.id)::int as paid_conversions
      FROM survey_responses s
      LEFT JOIN prompt_history h ON h.user_id = s.user_id
      LEFT JOIN event_logs e ON e.user_id = s.user_id AND e.event_type = 'upgrade_click'
      LEFT JOIN subscriptions sub ON sub.user_id = s.user_id AND sub.status = 'active'
      GROUP BY s.q5_profession
    `;

    // Map segments cleanly
    const segments = segmentStats.map(stat => {
      const totalPayResponses = stat.pay_yes + stat.pay_maybe + stat.pay_no;
      const wtRate = totalPayResponses > 0 ? (((stat.pay_yes + stat.pay_maybe) / totalPayResponses) * 100).toFixed(1) : '0.0';
      const optsPerUserSeg = stat.installs > 0 ? (stat.optimizations / stat.installs).toFixed(1) : '0.0';
      
      return {
        name: stat.segment || 'unknown',
        installs: stat.installs,
        optimizations: stat.optimizations,
        optsPerUser: parseFloat(optsPerUserSeg),
        avgImprovement: stat.avg_score_improvement.toFixed(1),
        payYes: stat.pay_yes,
        payMaybe: stat.pay_maybe,
        payWillingnessRate: parseFloat(wtRate),
        upgradeClicks: stat.upgrade_clicks,
        conversions: stat.paid_conversions
      };
    });

    // 4. Generate PMF Rankings
    const rankedByEngagement = [...segments].sort((a, b) => b.optsPerUser - a.optsPerUser);
    const rankedByWillingness = [...segments].sort((a, b) => b.payWillingnessRate - a.payWillingnessRate);
    const rankedByClicks = [...segments].sort((a, b) => b.upgradeClicks - a.upgradeClicks);

    // Compute basic retention metrics per segment
    const segmentRetention = await sql`
      SELECT 
        s.q5_profession as segment,
        COUNT(DISTINCT u.id)::int as total,
        COUNT(DISTINCT CASE WHEN h.created_at::date = (u.created_at::date + INTERVAL '1 day')::date THEN u.id END)::int as retained_d1
      FROM survey_responses s
      JOIN users u ON CAST(u.id AS VARCHAR) = s.user_id
      LEFT JOIN prompt_history h ON h.user_id = s.user_id
      WHERE u.created_at <= NOW() - INTERVAL '2 days'
      GROUP BY s.q5_profession
    `;

    const retentionMap = {};
    segmentRetention.forEach(r => {
      retentionMap[r.segment] = r.total > 0 ? ((r.retained_d1 / r.total) * 100).toFixed(1) : '0.0';
    });

    const rankedByRetention = [...segments].map(s => ({
      ...s,
      d1Retention: parseFloat(retentionMap[s.name] || '0.0')
    })).sort((a, b) => b.d1Retention - a.d1Retention);

    // Dynamic Decision Framework Output
    let decisionHeading = 'Horizontal Mode';
    let decisionDesc = 'No segment clearly dominates prompt optimizations yet. Keep collecting user research data.';
    if (rankedByEngagement.length > 0) {
      const topSegment = rankedByEngagement[0].name.toLowerCase();
      if (rankedByEngagement[0].optsPerUser >= 5.0) {
        if (topSegment === 'developer') {
          decisionHeading = 'Pivot target: "The Prompt Optimizer for AI Coding"';
          decisionDesc = 'Developers represent your most active and high-value segment. Refocus the product on technical rigor, system constraints, and coding structures.';
        } else if (topSegment === 'marketer') {
          decisionHeading = 'Pivot target: "The Prompt Optimizer for AI Marketing"';
          decisionDesc = 'Marketers represent your most active segment. Refocus PromptIQ on copywriting hooks, conversion frameworks, and social formats.';
        } else if (topSegment === 'researcher') {
          decisionHeading = 'Pivot target: "The Research Prompt Copilot"';
          decisionDesc = 'Researchers dominate your usage. Refocus the product on citation structures, multi-perspective logical analysis, and data synthesis.';
        }
      }
    }

    // 5. Render dashboard HTML
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PromptIQ - ICP Discovery Panel</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
        <style>
          :root {
            --bg-color: #020617;
            --card-bg: rgba(15, 23, 42, 0.7);
            --card-border: rgba(255, 255, 255, 0.08);
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent-blue: #3b82f6;
            --accent-purple: #a855f7;
            --accent-green: #22c55e;
            --accent-pink: #ec4899;
          }
          body {
            background-color: var(--bg-color);
            color: var(--text-primary);
            font-family: 'Plus Jakarta Sans', sans-serif;
            margin: 0;
            padding: 40px;
            min-height: 100vh;
            background-image: radial-gradient(circle at 10% 20%, rgba(168, 85, 247, 0.15) 0%, transparent 40%),
                              radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 40%);
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            border-bottom: 1px solid var(--card-border);
            padding-bottom: 20px;
          }
          h1 {
            font-size: 32px;
            font-weight: 800;
            margin: 0;
            letter-spacing: -0.03em;
            background: linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .decision-banner {
            background: linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
            border: 1px solid rgba(168, 85, 247, 0.3);
            border-radius: 24px;
            padding: 30px;
            margin-bottom: 40px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          }
          .banner-title {
            font-size: 20px;
            font-weight: 800;
            color: var(--accent-purple);
            margin: 0 0 10px 0;
            letter-spacing: -0.02em;
          }
          .banner-desc {
            font-size: 14px;
            color: var(--text-secondary);
            margin: 0;
            line-height: 1.6;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
          }
          .kpi-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 20px;
            padding: 20px;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
          }
          .kpi-label {
            font-size: 12px;
            color: var(--text-secondary);
            font-weight: 600;
            margin-bottom: 6px;
          }
          .kpi-value {
            font-size: 32px;
            font-weight: 800;
            letter-spacing: -0.02em;
          }
          .section-title {
            font-size: 22px;
            font-weight: 800;
            margin-top: 0;
            margin-bottom: 24px;
            letter-spacing: -0.02em;
          }
          .chart-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 40px;
          }
          @media (max-width: 768px) {
            .chart-grid {
              grid-template-columns: 1fr;
            }
          }
          .card-block {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 24px;
            padding: 30px;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
          }
          .ranking-row {
            display: flex;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
          }
          .ranking-row:last-child {
            border-bottom: none;
          }
          .rank-num {
            font-size: 16px;
            font-weight: 800;
            width: 32px;
            color: var(--text-secondary);
          }
          .rank-name {
            flex-grow: 1;
            font-size: 14px;
            font-weight: 600;
            text-transform: capitalize;
          }
          .rank-val {
            font-size: 14px;
            font-weight: 800;
            color: var(--accent-blue);
          }
          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            margin-top: 20px;
          }
          th {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-secondary);
            padding: 12px 16px;
            border-bottom: 1px solid var(--card-border);
          }
          td {
            font-size: 14px;
            padding: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.03);
            color: var(--text-secondary);
          }
          tr:hover td {
            color: var(--text-primary);
            background: rgba(255,255,255,0.02);
          }
          .badge {
            display: inline-block;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: 800;
            border-radius: 6px;
            text-transform: uppercase;
          }
          .badge-blue { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
          .badge-purple { background: rgba(168, 85, 247, 0.2); color: #c084fc; }
          .badge-green { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
          .badge-pink { background: rgba(236, 72, 153, 0.2); color: #f472b6; }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <div>
              <h1>ICP Discovery Dashboard</h1>
              <p style="color: var(--text-secondary); margin: 5px 0 0 0;">Ideal Customer Profile Discovery & PMF Analysis</p>
            </div>
            <div style="font-size: 14px; color: var(--text-secondary);">
              Live Segment Tracker: <span style="color: var(--accent-green); font-weight: 800;">Snowy Queen</span>
            </div>
          </header>

          <div class="decision-banner">
            <div class="banner-title">Decision Framework: ${decisionHeading}</div>
            <p class="banner-desc">${decisionDesc}</p>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Installs / Surveys</div>
              <div class="kpi-value">${installs}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">DAU</div>
              <div class="kpi-value">${dau}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">WAU</div>
              <div class="kpi-value">${wau}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Optimizations</div>
              <div class="kpi-value">${optimizations}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Upgrade Clicks</div>
              <div class="kpi-value">${upgradeClicks}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Paid Conversions</div>
              <div class="kpi-value">${activeSubs}</div>
            </div>
          </div>

          <h2 class="section-title">PMF Segment Rankings</h2>
          <div class="chart-grid">
            <div class="card-block">
              <h3 class="banner-title" style="color: var(--accent-blue); font-size: 16px;">1. Most Engaged (Optimizations/User)</h3>
              ${rankedByEngagement.map((s, index) => `
                <div class="ranking-row">
                  <div class="rank-num">#${index + 1}</div>
                  <div class="rank-name">${s.name.replace('_', ' ')}</div>
                  <div class="rank-val" style="color: var(--accent-blue);">${s.optsPerUser} runs</div>
                </div>
              `).join('')}
            </div>

            <div class="card-block">
              <h3 class="banner-title" style="color: var(--accent-purple); font-size: 16px;">2. Highest Retention (D1 Cohort)</h3>
              ${rankedByRetention.map((s, index) => `
                <div class="ranking-row">
                  <div class="rank-num">#${index + 1}</div>
                  <div class="rank-name">${s.name.replace('_', ' ')}</div>
                  <div class="rank-val" style="color: var(--accent-purple);">${s.d1Retention || 0}%</div>
                </div>
              `).join('')}
            </div>

            <div class="card-block">
              <h3 class="banner-title" style="color: var(--accent-green); font-size: 16px;">3. Highest Willingness to Pay</h3>
              ${rankedByWillingness.map((s, index) => `
                <div class="ranking-row">
                  <div class="rank-num">#${index + 1}</div>
                  <div class="rank-name">${s.name.replace('_', ' ')}</div>
                  <div class="rank-val" style="color: var(--accent-green);">${s.payWillingnessRate}% (Yes/Maybe)</div>
                </div>
              `).join('')}
            </div>

            <div class="card-block">
              <h3 class="banner-title" style="color: var(--accent-pink); font-size: 16px;">4. Highest Upgrade Clicks</h3>
              ${rankedByClicks.map((s, index) => `
                <div class="ranking-row">
                  <div class="rank-num">#${index + 1}</div>
                  <div class="rank-name">${s.name.replace('_', ' ')}</div>
                  <div class="rank-val" style="color: var(--accent-pink);">${s.upgradeClicks} clicks</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="card-block" style="margin-bottom: 40px;">
            <h2 class="card-title">User Segment Breakdown Table</h2>
            <table>
              <thead>
                <tr>
                  <th>Segment</th>
                  <th>Installs</th>
                  <th>Opts</th>
                  <th>Opts/User</th>
                  <th>Avg Improvement</th>
                  <th>Pay Willingness (Yes/Maybe)</th>
                  <th>Upgrade Clicks</th>
                  <th>Conversions</th>
                </tr>
              </thead>
              <tbody>
                ${segments.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align: center;">No segment logs recorded. Submit a survey to start discovery.</td>
                  </tr>
                ` : segments.map(s => `
                  <tr>
                    <td style="color: var(--text-primary); font-weight: 600; text-transform: capitalize;">${s.name.replace('_', ' ')}</td>
                    <td>${s.installs}</td>
                    <td>${s.optimizations}</td>
                    <td>${s.optsPerUser}</td>
                    <td><span style="color: var(--accent-green); font-weight: 800;">+${s.avgImprovement} pts</span></td>
                    <td>${s.payWillingnessRate}%</td>
                    <td>${s.upgradeClicks}</td>
                    <td><span class="badge badge-green">${s.conversions}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="card-block">
            <h2 class="card-title">Survey Pricing & Value Responses</h2>
            <table>
              <thead>
                <tr>
                  <th>Profession</th>
                  <th>Pay Willingness</th>
                  <th>Pay Amount ($)</th>
                  <th>Core Value Segment</th>
                  <th>Date Submitted</th>
                </tr>
              </thead>
              <tbody>
                ${surveys.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center;">No responses recorded yet.</td>
                  </tr>
                ` : surveys.map(s => `
                  <tr>
                    <td style="color: var(--text-primary); font-weight: 600; text-transform: capitalize;">${s.q5_profession ? s.q5_profession.replace('_', ' ') : '-'}</td>
                    <td><span class="badge badge-blue">${s.pay_willingness || '-'}</span></td>
                    <td>$${s.pay_amount || '-'}</td>
                    <td><span class="badge badge-purple">${s.core_value ? s.core_value.replace('_', ' ') : '-'}</span></td>
                    <td>${new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </body>
      </html>
    `;

    res.status(200).send(html);
  } catch (error) {
    console.error('Error rendering ICP Discovery dashboard:', error);
    res.status(500).send(`<h1>Internal Server Error</h1><pre>${error.message}</pre>`);
  }
}
