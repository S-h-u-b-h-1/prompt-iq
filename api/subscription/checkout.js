import { authenticate } from '../utils/auth-helper.js';

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

    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.split(' ')[1] : '';

    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeKey) {
      res.status(500).json({ error: 'STRIPE_SECRET_KEY environment variable is not configured' });
      return;
    }

    // Call Stripe API directly using native fetch to keep dependencies clean
    const params = new URLSearchParams({
      'payment_method_types[0]': 'card',
      'line_items[0][price_data][currency]': 'inr',
      'line_items[0][price_data][product_data][name]': 'PromptIQ Pro',
      'line_items[0][price_data][product_data][description]': 'Unlimited optimizations & pro modes',
      'line_items[0][price_data][unit_amount]': '9900', // ₹99 in paise (99.00 INR)
      'line_items[0][price_data][recurring][interval]': 'month',
      'line_items[0][quantity]': '1',
      'mode': 'subscription',
      'success_url': `https://promptiq-theta.vercel.app/api/subscription/status?stripe_session_id={CHECKOUT_SESSION_ID}&token=${token}`,
      'cancel_url': 'https://promptiq-theta.vercel.app/api/subscription/status?cancel=true',
      'client_reference_id': session.userId.toString(),
      'customer_email': session.email
    });

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Stripe API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    res.status(200).json({ url: data.url, simulated: false });
  } catch (error) {
    console.error('Checkout creation error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
