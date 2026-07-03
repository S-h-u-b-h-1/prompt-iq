import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { signToken, authenticate } from './_utils/auth-helper.js';
import { normalizePlan } from './_utils/plans.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = neon(DATABASE_URL);
const PASSWORD_ITERATIONS = 310000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function derivePasswordHash(password, salt, iterations) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, 64, 'sha512', (error, key) => {
      if (error) reject(error);
      else resolve(key.toString('hex'));
    });
  });
}

async function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await derivePasswordHash(password, salt, PASSWORD_ITERATIONS);
  return `pbkdf2$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
}

async function verifyPassword(password, passwordHash) {
  let iterations;
  let salt;
  let storedHash;
  let needsUpgrade = false;

  if (passwordHash.startsWith('pbkdf2$')) {
    const parts = passwordHash.split('$');
    if (parts.length !== 4) return { matches: false, needsUpgrade: false };
    iterations = Number.parseInt(parts[1], 10);
    salt = parts[2];
    storedHash = parts[3];
  } else {
    const parts = passwordHash.split(':');
    if (parts.length !== 2) return { matches: false, needsUpgrade: false };
    iterations = 1000;
    [salt, storedHash] = parts;
    needsUpgrade = true;
  }

  const candidateHash = await derivePasswordHash(password, salt, iterations);
  const candidateBuffer = Buffer.from(candidateHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');
  const matches =
    candidateBuffer.length === storedBuffer.length &&
    crypto.timingSafeEqual(candidateBuffer, storedBuffer);

  return { matches, needsUpgrade: matches && needsUpgrade };
}

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
      const resolvedPlan = normalizePlan(
        user.sub_status === 'active' && user.sub_plan ? user.sub_plan : user.base_plan
      );

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
      const { email, password } = req.body || {};

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      const users = await sql`
        SELECT u.id, u.email, u.password_hash, u.plan as base_plan, s.plan as sub_plan, s.status as sub_status
        FROM users u
        LEFT JOIN subscriptions s ON s.user_id = CAST(u.id AS VARCHAR) AND s.status = 'active'
        WHERE u.email = ${normalizedEmail}
      `;

      if (users.length === 0) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const user = users[0];

      const passwordResult = await verifyPassword(password, user.password_hash);
      if (!passwordResult.matches) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      if (passwordResult.needsUpgrade) {
        const upgradedHash = await createPasswordHash(password);
        await sql`
          UPDATE users
          SET password_hash = ${upgradedHash}
          WHERE id = ${user.id}
        `;
      }

      const resolvedPlan = normalizePlan(
        user.sub_status === 'active' && user.sub_plan ? user.sub_plan : user.base_plan
      );

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
      const { email, password } = req.body || {};

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 254) {
        res.status(400).json({ error: 'Enter a valid email address' });
        return;
      }

      if (password.length < 8 || password.length > 128) {
        res.status(400).json({ error: 'Password must be between 8 and 128 characters long' });
        return;
      }

      const existing = await sql`
        SELECT id FROM users WHERE email = ${normalizedEmail}
      `;

      if (existing.length > 0) {
        res.status(409).json({ error: 'User with this email already exists' });
        return;
      }

      const passwordHash = await createPasswordHash(password);

      const result = await sql`
        INSERT INTO users (email, password_hash, plan, created_at)
        VALUES (${normalizedEmail}, ${passwordHash}, 'free', NOW())
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
    if (error.code === '23505') {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }
    res.status(500).json({ error: 'Authentication is temporarily unavailable. Please try again.' });
  }
}
