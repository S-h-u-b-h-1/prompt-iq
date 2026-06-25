import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { signToken } from '../utils/auth-helper.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = neon(DATABASE_URL);

export default async function handler(req, res) {
  // CORS headers
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
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Retrieve user and active subscription plan if any
    const users = await sql`
      SELECT u.id, u.email, u.password_hash, u.plan as base_plan, s.plan as sub_plan, s.status as sub_status
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = CAST(u.id AS VARCHAR) AND s.status = 'active'
      WHERE u.email = ${email.toLowerCase().trim()}
    `;

    if (users.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = users[0];

    // Verify password hash
    const parts = user.password_hash.split(':');
    if (parts.length !== 2) {
      res.status(500).json({ error: 'Database password format error' });
      return;
    }

    const [salt, storedHash] = parts;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

    if (storedHash !== verifyHash) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Determine resolved plan
    const resolvedPlan = user.sub_status === 'active' && user.sub_plan ? user.sub_plan : user.base_plan;

    // Sign JWT token
    const token = signToken({
      userId: user.id,
      email: user.email,
      plan: resolvedPlan
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: resolvedPlan
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
