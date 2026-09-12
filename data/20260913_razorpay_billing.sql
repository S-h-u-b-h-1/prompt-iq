ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(32),
  ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS razorpay_plan_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_razorpay_subscription_id
  ON subscriptions(razorpay_subscription_id)
  WHERE razorpay_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  provider VARCHAR(32) NOT NULL,
  event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_received_at
  ON billing_webhook_events(received_at DESC);
