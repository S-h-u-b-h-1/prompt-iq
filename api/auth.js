import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { signToken, authenticate } from './_utils/auth-helper.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = neon(DATABASE_URL);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Determine the operation based on query parameter action
  const action = req.query.action || (req.method === 'GET' ? 'me' : null);

  try {
    if (action === 'me') {
      // --- GET USER PROFILE (formerly me.js) ---
      const session = authenticate(req);
      if (!session) {
        res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
        return;
      }

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
      return;
    }

    if (action === 'login' && req.method === 'POST') {
      // --- LOGIN (formerly login.js) ---
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

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

      const resolvedPlan = user.sub_status === 'active' && user.sub_plan ? user.sub_plan : user.base_plan;

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
      return;
    }

    if (action === 'signup' && req.method === 'POST') {
      // --- SIGNUP (formerly signup.js) ---
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long' });
        return;
      }

      const existing = await sql`
        SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}
      `;

      if (existing.length > 0) {
        res.status(409).json({ error: 'User with this email already exists' });
        return;
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
      const passwordHash = `${salt}:${hash}`;

      const result = await sql`
        INSERT INTO users (email, password_hash, plan, created_at)
        VALUES (${email.toLowerCase().trim()}, ${passwordHash}, 'free', NOW())
        RETURNING id, email, plan;
      `;

      const user = result[0];

      const token = signToken({
        userId: user.id,
        email: user.email,
        plan: user.plan
      });

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          plan: user.plan
        }
      });
      return;
    }

    res.status(400).json({ error: 'Invalid action or method' });
  } catch (error) {
    console.error('Auth API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
