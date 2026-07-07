import { authenticate } from '../_utils/auth-helper.js';

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
    const session = authenticate(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }

    const userId = Number.parseInt(session.userId, 10);

    // Instantly upgrade user in the database for free
    await sql`
      UPDATE users
      SET plan = 'premium'
      WHERE id = ${userId};
    `;

    // Insert or update active subscription record for consistency
    await sql`
      INSERT INTO subscriptions (user_id, status, plan, stripe_customer_id, stripe_subscription_id, updated_at)
      VALUES (${String(userId)}, 'active', 'premium', 'simulated_cust', 'simulated_sub', NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET status = 'active', plan = 'premium', updated_at = NOW();
    `;

    res.status(200).json({ 
      url: 'https://promptiq-theta.vercel.app/api/subscription/status?simulated=true', 
      simulated: true 
    });
  } catch (error) {
    console.error('Simulated checkout creation error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
