import { neon } from '@neondatabase/serverless';
import { verifyToken } from '../_utils/auth-helper.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = neon(DATABASE_URL);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { stripe_session_id, token, cancel } = req.query;

  // Handle cancellation redirect
  if (cancel === 'true') {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(renderResponsePage(false, 'Checkout cancelled. You can try again when you are ready.'));
    return;
  }

  // Validate session token
  if (!token) {
    res.setHeader('Content-Type', 'text/html');
    res.status(400).send(renderResponsePage(false, 'Missing authorization token.'));
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.setHeader('Content-Type', 'text/html');
    res.status(401).send(renderResponsePage(false, 'Unauthorized: Invalid session token.'));
    return;
  }

  const userId = decoded.userId;

  try {
    let success = false;
    let message = 'Subscription updated successfully.';

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe is not configured on this server.');
    }

    if (stripe_session_id) {
      // Real Stripe Checkout Verification
      const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${stripe_session_id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve checkout session details.');
      }

      const sessionDetails = await response.json();

      if (sessionDetails.payment_status === 'paid' || sessionDetails.status === 'complete') {
        const stripeCustomerId = sessionDetails.customer;
        const stripeSubscriptionId = sessionDetails.subscription;

        // Update database in a transactional logic
        await sql`
          INSERT INTO subscriptions (user_id, status, plan, stripe_customer_id, stripe_subscription_id, updated_at)
          VALUES (${userId.toString()}, 'active', 'pro', ${stripeCustomerId}, ${stripeSubscriptionId}, NOW())
          ON CONFLICT (user_id)
          DO UPDATE SET status = 'active', plan = 'pro', stripe_customer_id = ${stripeCustomerId}, stripe_subscription_id = ${stripeSubscriptionId}, updated_at = NOW();
        `;

        await sql`
          UPDATE users
          SET plan = 'pro'
          WHERE id = ${parseInt(userId, 10)};
        `;

        success = true;
        message = 'Thank you! Your payment was verified and your Pro account is now active.';
      } else {
        message = 'Stripe checkout session has not completed payment yet.';
      }
    } else {
      message = 'Invalid checkout query parameters.';
    }

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(renderResponsePage(success, message));

  } catch (error) {
    console.error('Verify checkout error:', error);
    res.setHeader('Content-Type', 'text/html');
    res.status(500).send(renderResponsePage(false, `Error: ${error.message}`));
  }
}

function renderResponsePage(success, message) {
  const themeBg = success ? 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #450a0a 0%, #0f172a 100%)';
  const icon = success ? '🎉' : '❌';
  const title = success ? 'Subscription Active!' : 'Checkout Failed';
  const accentColor = success ? '#3b82f6' : '#ef4444';
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PromptIQ - Status</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: system-ui, -apple-system, sans-serif;
          background: ${themeBg};
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          overflow: hidden;
        }
        .container {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 40px;
          text-align: center;
          max-width: 440px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 {
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 12px;
          letter-spacing: -0.02em;
        }
        p {
          font-size: 14px;
          line-height: 1.6;
          color: #cbd5e1;
          margin-bottom: 30px;
        }
        .btn {
          display: inline-block;
          background: ${accentColor};
          color: white;
          text-decoration: none;
          padding: 12px 30px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
        }
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">${icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="#" class="btn" onclick="window.close(); return false;">Close Window</a>
      </div>
    </body>
    </html>
  `;
}
