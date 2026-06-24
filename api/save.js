import { neon } from '@neondatabase/serverless';
import { authenticate } from './utils/auth-helper.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_GmxFb4Q9YZKP@ep-odd-bar-ajcs0l0q-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const session = authenticate(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }

    const { original, optimized, scoreDelta, platform, intent, mode, scoreOriginal, scoreOptimized } = req.body;

    if (!original || !optimized || scoreDelta === undefined || !platform) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const userId = session.userId.toString();

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
  } catch (error) {
    console.error('Error saving prompt:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
