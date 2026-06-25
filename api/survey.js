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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
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
    // Authenticate user session
    const session = authenticate(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
      return;
    }

    const { 
      q1_reason, 
      q2_tool, 
      q3_frequency, 
      q4_value, 
      q5_profession, 
      pay_willingness, 
      pay_amount, 
      core_value 
    } = req.body;

    const userId = session.userId.toString();

    // Insert survey response
    await sql`
      INSERT INTO survey_responses (
        user_id, 
        q1_reason, 
        q2_tool, 
        q3_frequency, 
        q4_value, 
        q5_profession, 
        pay_willingness, 
        pay_amount, 
        core_value, 
        created_at
      )
      VALUES (
        ${userId}, 
        ${q1_reason || null}, 
        ${q2_tool || null}, 
        ${q3_frequency || null}, 
        ${q4_value || null}, 
        ${q5_profession || null}, 
        ${pay_willingness || null}, 
        ${pay_amount || null}, 
        ${core_value || null}, 
        NOW()
      )
    `;

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving survey response:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
