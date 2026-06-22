import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_GmxFb4Q9YZKP@ep-odd-bar-ajcs0l0q-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
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
    const { original, optimized, scoreDelta, platform, userId } = req.body;

    if (!original || !optimized || scoreDelta === undefined || !platform || !userId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await sql`
      INSERT INTO prompt_history (original, optimized, score_delta, platform, user_id, created_at)
      VALUES (${original}, ${optimized}, ${parseInt(scoreDelta, 10)}, ${platform}, ${userId}, NOW())
      RETURNING id, created_at;
    `;

    res.status(200).json({ success: true, data: result[0] });
  } catch (error) {
    console.error('Error saving prompt:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
