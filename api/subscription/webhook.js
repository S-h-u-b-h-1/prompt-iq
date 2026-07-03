import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = neon(DATABASE_URL);

export const config = {
  api: {
    bodyParser: false, // Disable body parser to get raw body stream for Stripe signature validation
  },
};

async function getRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    if (!webhookSecret) {
      res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET is not configured on the server' });
      return;
    }

    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    // Verify Stripe Webhook Signature Natively
    try {
      const headerParts = signature.split(',');
      const tPart = headerParts.find(p => p.startsWith('t='));
      const v1Part = headerParts.find(p => p.startsWith('v1='));

      if (!tPart || !v1Part) {
        throw new Error('Invalid signature format');
      }

      const t = tPart.split('=')[1];
      const v1 = v1Part.split('=')[1];
      const timestamp = Number.parseInt(t, 10);
      if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) {
        throw new Error('Signature timestamp is outside the accepted window');
      }

      const computedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(`${t}.${rawBody}`)
        .digest('hex');

      const computedBuffer = Buffer.from(computedSignature, 'hex');
      const signatureBuffer = Buffer.from(v1, 'hex');
      if (
        computedBuffer.length !== signatureBuffer.length ||
        !crypto.timingSafeEqual(computedBuffer, signatureBuffer)
      ) {
        throw new Error('Signature mismatch');
      }

      event = JSON.parse(rawBody);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      res.status(400).json({ error: `Signature verification failed: ${err.message}` });
      return;
    }

    const { type, data } = event;
    console.log(`Processing Stripe Webhook Event: ${type}`);

    if (type === 'checkout.session.completed') {
      const session = data.object;
      const userId = session.client_reference_id;
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      if (userId) {
        await sql`
          INSERT INTO subscriptions (user_id, status, plan, stripe_customer_id, stripe_subscription_id, updated_at)
          VALUES (${userId}, 'active', 'premium', ${customerId}, ${subscriptionId}, NOW())
          ON CONFLICT (user_id)
          DO UPDATE SET status = 'active', plan = 'premium', stripe_customer_id = ${customerId}, stripe_subscription_id = ${subscriptionId}, updated_at = NOW();
        `;

        await sql`
          UPDATE users
          SET plan = 'premium'
          WHERE id = ${parseInt(userId, 10)};
        `;
        console.log(`User ${userId} successfully upgraded to Premium via webhook.`);
      }
    } else if (type === 'customer.subscription.updated') {
      const subscription = data.object;
      const customerId = subscription.customer;
      const subId = subscription.id;
      const status = subscription.status; // e.g. active, trialing, past_due, canceled
      const resolvedStatus = (status === 'active' || status === 'trialing') ? 'active' : 'inactive';
      const resolvedPlan = resolvedStatus === 'active' ? 'premium' : 'free';

      // Find user matching customerId
      const users = await sql`
        SELECT user_id FROM subscriptions WHERE stripe_customer_id = ${customerId}
      `;

      if (users.length > 0) {
        const userId = users[0].user_id;

        await sql`
          UPDATE subscriptions
          SET status = ${resolvedStatus}, plan = ${resolvedPlan}, updated_at = NOW()
          WHERE stripe_customer_id = ${customerId};
        `;

        await sql`
          UPDATE users
          SET plan = ${resolvedPlan}
          WHERE id = ${parseInt(userId, 10)};
        `;
        console.log(`User ${userId} subscription status updated to ${resolvedStatus} (${resolvedPlan}) via webhook.`);
      }
    } else if (type === 'customer.subscription.deleted') {
      const subscription = data.object;
      const customerId = subscription.customer;

      const users = await sql`
        SELECT user_id FROM subscriptions WHERE stripe_customer_id = ${customerId}
      `;

      if (users.length > 0) {
        const userId = users[0].user_id;

        await sql`
          UPDATE subscriptions
          SET status = 'canceled', plan = 'free', updated_at = NOW()
          WHERE stripe_customer_id = ${customerId};
        `;

        await sql`
          UPDATE users
          SET plan = 'free'
          WHERE id = ${parseInt(userId, 10)};
        `;
        console.log(`User ${userId} subscription deleted. Plan reset to free.`);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
