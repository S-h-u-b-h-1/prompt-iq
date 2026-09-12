import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(DATABASE_URL);

export const config = {
  api: {
    bodyParser: false
  }
};

async function getRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function signaturesMatch(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(signature, 'hex');
  return expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function resolveSubscriptionState(eventType, subscription) {
  const status = String(subscription.status || '').toLowerCase();
  if (
    ['subscription.cancelled', 'subscription.completed', 'subscription.expired'].includes(eventType) ||
    ['cancelled', 'completed', 'expired'].includes(status)
  ) {
    return { status: 'canceled', plan: 'free' };
  }

  if (
    ['subscription.halted', 'subscription.paused'].includes(eventType) ||
    ['halted', 'paused'].includes(status)
  ) {
    return { status: 'inactive', plan: 'free' };
  }

  if (
    ['subscription.activated', 'subscription.charged', 'subscription.resumed'].includes(eventType) ||
    status === 'active'
  ) {
    return { status: 'active', plan: 'premium' };
  }

  return { status: status || 'pending', plan: 'free' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const expectedPlanId = process.env.RAZORPAY_PLAN_ID;
  if (!webhookSecret || !expectedPlanId) {
    res.status(503).json({ error: 'Razorpay webhook is not configured' });
    return;
  }

  let eventId = null;
  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['x-razorpay-signature'];
    if (!signaturesMatch(rawBody, signature, webhookSecret)) {
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const event = JSON.parse(rawBody);
    eventId = String(req.headers['x-razorpay-event-id'] || '');
    const eventType = String(event.event || '');
    const subscription = event.payload?.subscription?.entity;

    if (!eventId || !eventType) {
      res.status(400).json({ error: 'Webhook event metadata is missing' });
      return;
    }

    const inserted = await sql`
      INSERT INTO billing_webhook_events (provider, event_id, event_type, received_at)
      VALUES ('razorpay', ${eventId}, ${eventType}, NOW())
      ON CONFLICT (provider, event_id) DO NOTHING
      RETURNING event_id
    `;
    if (inserted.length === 0) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    if (!subscription || !eventType.startsWith('subscription.')) {
      await sql`
        UPDATE billing_webhook_events
        SET processed_at = NOW()
        WHERE provider = 'razorpay' AND event_id = ${eventId}
      `;
      res.status(200).json({ received: true, ignored: true });
      return;
    }

    if (String(subscription.plan_id || '') !== expectedPlanId) {
      await sql`
        UPDATE billing_webhook_events
        SET processed_at = NOW()
        WHERE provider = 'razorpay' AND event_id = ${eventId}
      `;
      res.status(200).json({ received: true, ignored: true });
      return;
    }

    const subscriptionId = String(subscription.id || '');
    const notedUserId = Number.parseInt(subscription.notes?.user_id, 10);
    const linkedRows = subscriptionId
      ? await sql`
          SELECT user_id
          FROM subscriptions
          WHERE razorpay_subscription_id = ${subscriptionId}
          LIMIT 1
        `
      : [];
    const userId = Number.parseInt(linkedRows[0]?.user_id, 10) || notedUserId;

    if (!Number.isSafeInteger(userId) || userId <= 0 || !subscriptionId) {
      throw new Error('Razorpay subscription is not linked to a valid PromptIQ account');
    }

    const next = resolveSubscriptionState(eventType, subscription);
    await sql`
      INSERT INTO subscriptions (
        user_id,
        status,
        plan,
        payment_provider,
        razorpay_customer_id,
        razorpay_subscription_id,
        razorpay_plan_id,
        updated_at
      )
      VALUES (
        ${String(userId)},
        ${next.status},
        ${next.plan},
        'razorpay',
        ${subscription.customer_id || null},
        ${subscriptionId},
        ${subscription.plan_id || null},
        NOW()
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        status = ${next.status},
        plan = ${next.plan},
        payment_provider = 'razorpay',
        razorpay_customer_id = ${subscription.customer_id || null},
        razorpay_subscription_id = ${subscriptionId},
        razorpay_plan_id = ${subscription.plan_id || null},
        updated_at = NOW()
    `;
    await sql`
      UPDATE users
      SET plan = ${next.plan}
      WHERE id = ${userId}
    `;
    await sql`
      UPDATE billing_webhook_events
      SET processed_at = NOW()
      WHERE provider = 'razorpay' AND event_id = ${eventId}
    `;

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    if (eventId) {
      try {
        await sql`
          DELETE FROM billing_webhook_events
          WHERE provider = 'razorpay' AND event_id = ${eventId} AND processed_at IS NULL
        `;
      } catch (cleanupError) {
        console.error('Failed to release Razorpay webhook event:', cleanupError);
      }
    }
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
