import { neon } from '@neondatabase/serverless';
import { authenticate } from '../utils/auth-helper.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = neon(DATABASE_URL);

export default async function handler(req, res) {
  // CORS headers
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
      res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
      return;
    }

    // Resolve real-time plan status from the database
    const users = await sql`
      SELECT u.id, u.email, u.plan as base_plan, s.plan as sub_plan, s.status as sub_status
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = CAST(u.id AS VARCHAR) AND s.status = 'active'
      WHERE u.id = ${parseInt(session.userId, 10)}
    `;

    if (users.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = users[0];
    const resolvedPlan = user.sub_status === 'active' && user.sub_plan ? user.sub_plan : user.base_plan;

    res.status(200).json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        plan: resolvedPlan
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
