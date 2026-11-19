import { neon } from '@neondatabase/serverless';
import { authenticate } from './_utils/auth-helper.js';
import {
  getCloudAiDailyLimit,
  getSmartTemplateDailyLimit
} from './_utils/usage-limits.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(DATABASE_URL);
function getUtcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

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

    const users = await sql`SELECT id FROM users WHERE id = ${userId} LIMIT 1`;

    if (users.length === 0) {
      res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    const cloudAiLimit = getCloudAiDailyLimit();
    const date = getUtcDateKey();
    const usageRows = await sql`
      SELECT count
      FROM usage_events
      WHERE user_id = ${String(userId)} AND date = ${date}
      LIMIT 1
    `;
    const aiRewriteUsed = Number(usageRows[0]?.count || 0);
    const aiRewrite = {
      used: aiRewriteUsed,
      limit: cloudAiLimit,
      remaining: Math.max(0, cloudAiLimit - aiRewriteUsed)
    };

    res.status(200).json({
      date,
      plan: 'free',
      aiRewrite,
      premiumAi: aiRewrite,
      smartTemplate: {
        limit: getSmartTemplateDailyLimit()
      }
    });
  } catch (error) {
    console.error('Usage API error:', error);
    res.status(500).json({
      error: 'Usage information is temporarily unavailable.',
      code: 'USAGE_INTERNAL_ERROR'
    });
  }
}
