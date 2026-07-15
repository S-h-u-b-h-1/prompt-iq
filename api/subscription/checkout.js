import { authenticate } from '../_utils/auth-helper.js';

const APP_URL = process.env.APP_URL || 'https://promptiq-theta.vercel.app';

function sendJsonError(res, status, code, message) {
  res.status(status).json({ error: message, code });
}

export default async function handler(req, res) {
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

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = process.env.STRIPE_PRICE_ID;
    if (!stripeSecretKey || !stripePriceId) {
      sendJsonError(res, 503, 'BILLING_NOT_CONFIGURED', 'Premium checkout is not configured yet.');
      return;
    }

    const successUrl = `${APP_URL}/api/subscription/status?stripe_session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${APP_URL}/api/subscription/status?cancel=true`;
    const body = new URLSearchParams({
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: String(userId),
      'line_items[0][price]': stripePriceId,
      'line_items[0][quantity]': '1',
      'metadata[user_id]': String(userId),
      'subscription_data[metadata][user_id]': String(userId),
      allow_promotion_codes: 'true'
    });

    if (session.email) {
      body.set('customer_email', session.email);
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.url) {
      console.error('Stripe checkout session creation failed', {
        status: response.status,
        message: data.error?.message || response.statusText
      });
      sendJsonError(res, 502, 'STRIPE_CHECKOUT_FAILED', 'Unable to start Premium checkout right now.');
      return;
    }

    res.status(200).json({ url: data.url });
  } catch (error) {
    console.error('Stripe checkout creation error:', error);
    sendJsonError(res, 500, 'CHECKOUT_INTERNAL_ERROR', 'Unable to start Premium checkout right now.');
  }
}
