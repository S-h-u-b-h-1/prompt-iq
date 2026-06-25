import { neon } from '@neondatabase/serverless';
import { authenticate } from './utils/auth-helper.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = neon(DATABASE_URL);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

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

    const userId = session.userId.toString();

    if (req.method === 'GET') {
      // 1. Get History (formerly history.js)
      const history = await sql`
        SELECT id, original, optimized, score_delta as "scoreDelta", platform, created_at as "timestamp"
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
      const { original, optimized, scoreDelta, platform, intent, mode, scoreOriginal, scoreOptimized } = req.body;

      if (!original || !optimized || scoreDelta === undefined || !platform) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await sql`
        INSERT INTO prompt_history (original, optimized, score_delta, platform, user_id, intent, mode, score_original, score_optimized, created_at)
        VALUES (
          ${original}, 
          ${optimized}, 
          ${parseInt(scoreDelta, 10)}, 
          ${platform}, 
          ${userId}, 
          ${intent || null}, 
          ${mode || null}, 
          ${scoreOriginal !== undefined ? parseInt(scoreOriginal, 10) : null}, 
          ${scoreOptimized !== undefined ? parseInt(scoreOptimized, 10) : null}, 
          NOW()
        )
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
    console.error('History API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
