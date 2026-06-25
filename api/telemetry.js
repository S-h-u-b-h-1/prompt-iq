import { neon } from '@neondatabase/serverless';
import { authenticate } from './_utils/auth-helper.js';

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
    // Authenticate if JWT token is provided (it's optional for telemetry like page views/installs)
    const session = authenticate(req);
    const userId = session ? session.userId.toString() : null;

    const { event_type } = req.body;

    if (!event_type) {
      res.status(400).json({ error: 'Missing required field: event_type' });
      return;
    }

    // Save event log
    await sql`
      INSERT INTO event_logs (user_id, event_type, created_at)
      VALUES (${userId}, ${event_type}, NOW())
    `;

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging telemetry event:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
