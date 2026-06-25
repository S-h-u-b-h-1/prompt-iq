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

    const { id, feedback } = req.body;

    if (!id || !feedback) {
      res.status(400).json({ error: 'Missing required parameters: id and feedback' });
      return;
    }

    if (feedback !== 'helpful' && feedback !== 'unhelpful') {
      res.status(400).json({ error: 'Invalid feedback value' });
      return;
    }

    const userId = session.userId.toString();

    const result = await sql`
      UPDATE prompt_history
      SET feedback = ${feedback}
      WHERE id = ${parseInt(id, 10)} AND user_id = ${userId}
      RETURNING id, feedback;
    `;

    if (result.length === 0) {
      res.status(404).json({ error: 'Prompt history record not found or unauthorized' });
      return;
    }

    res.status(200).json({ success: true, data: result[0] });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
