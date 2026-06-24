import { neon } from '@neondatabase/serverless';
import { authenticate } from './utils/auth-helper.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_GmxFb4Q9YZKP@ep-odd-bar-ajcs0l0q-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
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

    await sql`
      DELETE FROM prompt_history
      WHERE user_id = ${userId};
    `;

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
