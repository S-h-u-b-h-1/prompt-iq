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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const session = authenticate(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }

    const userId = session.userId.toString();

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
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
