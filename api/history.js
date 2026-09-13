import { neon } from '@neondatabase/serverless';
import { authenticate } from './_utils/auth-helper.js';
import { handleActivityRequest } from './_utils/activity-handler.js';
import { validateOptimization } from './_utils/activity-validation.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = neon(DATABASE_URL);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const session = authenticate(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }

    const numericUserId = Number(session.userId);
    if (!Number.isSafeInteger(numericUserId) || numericUserId < 1) {
      return res.status(401).json({ error: 'Invalid account session' });
    }
    const userId = String(numericUserId);
    if (req.query?.action === 'activity' || req.query?.action === 'preferences') {
      return handleActivityRequest(req, res, sql, numericUserId);
    }

    if (req.method === 'GET') {
      // 1. Get History (formerly history.js)
      const history = await sql`
        SELECT
          id,
          original,
          optimized,
          score_delta as "scoreDelta",
          platform,
          intent,
          mode,
          engine,
          source,
          client_event_id as "clientEventId",
          score_original as "scoreOriginal",
          score_optimized as "scoreOptimized",
          created_at as "timestamp"
        FROM prompt_history
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 100;
      `;

      // Map timestamp to milliseconds for JS client
      const formatted = history.map(item => ({
        ...item,
        timestamp: new Date(item.timestamp).getTime()
      }));

      res.status(200).json(formatted);
      return;
    } 
    
    if (req.method === 'POST') {
      // 2. Save Optimization (formerly save.js)
      const { original, optimized, scoreDelta, platform, intent, mode, scoreOriginal, scoreOptimized, clientEventId, engine } = validateOptimization(req.body);

      if (!original || !optimized || scoreDelta === undefined || !platform) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await sql`
        INSERT INTO prompt_history (original, optimized, score_delta, platform, user_id, intent, mode, score_original, score_optimized, client_event_id, engine, created_at)
        VALUES (
          ${original}, 
          ${optimized}, 
          ${parseInt(scoreDelta, 10)}, 
          ${platform}, 
          ${userId}, 
          ${intent || null}, 
          ${mode || null}, 
          ${scoreOriginal != null ? scoreOriginal : null},
          ${scoreOptimized != null ? scoreOptimized : null},
          ${clientEventId || null}::uuid,
          ${engine || null},
          NOW()
        )
        ON CONFLICT(user_id, client_event_id) WHERE client_event_id IS NOT NULL
        DO UPDATE SET client_event_id = EXCLUDED.client_event_id
        RETURNING id, created_at;
      `;

      res.status(200).json({ success: true, data: result[0] });
      return;
    }

    if (req.method === 'DELETE') {
      // 3. Clear History (formerly clear.js)
      await sql`
        DELETE FROM prompt_history
        WHERE user_id = ${userId};
      `;

      res.status(200).json({ success: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({error:error.message});
    console.error('History API error:', {code:error.code || 'INTERNAL'});
    res.status(500).json({ error: 'History is temporarily unavailable.' });
  }
}
