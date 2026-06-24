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
    const { id, feedback } = req.body;

    if (!id || !feedback) {
      res.status(400).json({ error: 'Missing required parameters: id and feedback' });
      return;
    }

    if (feedback !== 'helpful' && feedback !== 'unhelpful') {
      res.status(400).json({ error: 'Invalid feedback value' });
      return;
    }

    const result = await sql`
      UPDATE prompt_history
      SET feedback = ${feedback}
      WHERE id = ${parseInt(id, 10)}
      RETURNING id, feedback;
    `;

    if (result.length === 0) {
      res.status(404).json({ error: 'Prompt history record not found' });
      return;
    }

    res.status(200).json({ success: true, data: result[0] });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
