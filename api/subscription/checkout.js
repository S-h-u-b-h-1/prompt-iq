import { neon } from '@neondatabase/serverless';
import { authenticate } from '../_utils/auth-helper.js';
import { isExpectedRazorpayPlan } from '../_utils/razorpay-plan.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(DATABASE_URL);
const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

function sendJsonError(res, status, code, message) {
  res.status(status).json({ error: message, code });
}

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const planId = process.env.RAZORPAY_PLAN_ID;
  const configuredTotalCount = Number.parseInt(process.env.RAZORPAY_TOTAL_COUNT || '120', 10);
  const totalCount = Number.isSafeInteger(configuredTotalCount) && configuredTotalCount > 0
    ? Math.min(configuredTotalCount, 1200)
    : 120;

  if (!keyId || !keySecret || !planId) return null;
  return { keyId, keySecret, planId, totalCount };
}

async function razorpayRequest(path, config, options = {}) {
  const response = await fetch(`${RAZORPAY_API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    sendJsonError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    return;
  }

  try {
    const session = authenticate(req);
    if (!session) {
      sendJsonError(res, 401, 'AUTH_REQUIRED', 'Your session expired. Please log in again.');
      return;
    }

    const userId = Number.parseInt(session.userId, 10);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      sendJsonError(res, 401, 'AUTH_INVALID', 'Your session could not be verified.');
      return;
    }

    const config = getRazorpayConfig();
    if (!config) {
      sendJsonError(
        res,
        503,
        'BILLING_NOT_CONFIGURED',
        'Premium checkout is being connected to Razorpay. Free Smart Template remains available.'
      );
      return;
    }

    const { response: planResponse, data: planData } = await razorpayRequest(
      `/plans/${encodeURIComponent(config.planId)}`,
      config
    );
    const validPlan = planResponse.ok && isExpectedRazorpayPlan(planData);

    if (!validPlan) {
      console.error('Razorpay plan validation failed', {
        status: planResponse.status,
        planId: config.planId,
        amount: planData.item?.amount,
        currency: planData.item?.currency,
        period: planData.period,
        interval: planData.interval
      });
      sendJsonError(
        res,
        503,
        'RAZORPAY_PLAN_MISMATCH',
        'Premium billing is not ready. The configured plan must be ₹50 INR billed monthly.'
      );
      return;
    }

    const existingRows = await sql`
      SELECT status, razorpay_subscription_id
      FROM subscriptions
      WHERE user_id = ${String(userId)}
      LIMIT 1
    `;
    const existing = existingRows[0];

    if (existing?.status === 'active') {
      sendJsonError(res, 409, 'ALREADY_PREMIUM', 'Premium is already active on this account.');
      return;
    }

    if (existing?.razorpay_subscription_id) {
      const { response, data } = await razorpayRequest(
        `/subscriptions/${encodeURIComponent(existing.razorpay_subscription_id)}`,
        config
      );
      if (
        response.ok &&
        data.short_url &&
        ['created', 'authenticated', 'pending'].includes(data.status)
      ) {
        res.status(200).json({ url: data.short_url, provider: 'razorpay', reused: true });
        return;
      }
    }

    const { response, data } = await razorpayRequest('/subscriptions', config, {
      method: 'POST',
      body: JSON.stringify({
        plan_id: config.planId,
        total_count: config.totalCount,
        quantity: 1,
        customer_notify: true,
        notes: {
          user_id: String(userId),
          product: 'PromptIQ Premium'
        }
      })
    });

    if (!response.ok || !data.id || !data.short_url) {
      console.error('Razorpay subscription creation failed', {
        status: response.status,
        code: data.error?.code,
        description: data.error?.description
      });
      sendJsonError(res, 502, 'RAZORPAY_CHECKOUT_FAILED', 'Unable to start Premium checkout right now.');
      return;
    }

    await sql`
      INSERT INTO subscriptions (
        user_id,
        status,
        plan,
        payment_provider,
        razorpay_subscription_id,
        razorpay_plan_id,
        updated_at
      )
      VALUES (
        ${String(userId)},
        'created',
        'free',
        'razorpay',
        ${data.id},
        ${data.plan_id || config.planId},
        NOW()
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        status = 'created',
        plan = 'free',
        payment_provider = 'razorpay',
        razorpay_subscription_id = ${data.id},
        razorpay_plan_id = ${data.plan_id || config.planId},
        updated_at = NOW()
    `;

    res.status(200).json({ url: data.short_url, provider: 'razorpay', reused: false });
  } catch (error) {
    console.error('Razorpay checkout creation error:', error);
    sendJsonError(res, 500, 'CHECKOUT_INTERNAL_ERROR', 'Unable to start Premium checkout right now.');
  }
}
