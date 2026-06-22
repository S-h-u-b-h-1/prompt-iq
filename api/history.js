import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_GmxFb4Q9YZKP@ep-odd-bar-ajcs0l0q-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
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
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'Missing userId parameter' });
      return;
    }

    const history = await sql`
      SELECT id, original, optimized, score_delta as "scoreDelta", platform, created_at as "timestamp"
      FROM prompt_history
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 100;
    `;

    // Map timestamp to timestamp milliseconds since epoch for client-side JS Date constructor
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
