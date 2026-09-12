import { neon } from '@neondatabase/serverless';
import { authenticate } from '../_utils/auth-helper.js';
import { normalizePlan } from '../_utils/plans.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
    return;
  }

  try {
    const session = authenticate(req);
    if (!session) {
      res.status(401).json({ error: 'Your session expired. Please log in again.', code: 'AUTH_REQUIRED' });
      return;
    }

    const userId = Number.parseInt(session.userId, 10);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      res.status(401).json({ error: 'Your session could not be verified.', code: 'AUTH_INVALID' });
      return;
    }

    const rows = await sql`
      SELECT u.plan AS base_plan, s.status, s.plan, s.payment_provider, s.updated_at
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = CAST(u.id AS VARCHAR)
      WHERE u.id = ${userId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    const row = rows[0];
    const plan = normalizePlan(row.status === 'active' ? row.plan : row.base_plan);
    res.status(200).json({
      plan,
      subscription: row.status
        ? {
            status: row.status,
            provider: row.payment_provider || null,
            updatedAt: row.updated_at || null
          }
        : null
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: 'Unable to check subscription status.', code: 'STATUS_INTERNAL_ERROR' });
  }
}
