-- PromptIQ Database Migration Schema
-- Executed on Snowy Queen Neon Project

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL,
  plan VARCHAR(50) NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create usage_events table (daily counts)
CREATE TABLE IF NOT EXISTS usage_events (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Add indexes for prompt_history
CREATE INDEX IF NOT EXISTS idx_prompt_history_user_id ON prompt_history(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_history_created_at ON prompt_history(created_at);
CREATE INDEX IF NOT EXISTS idx_prompt_history_user_created ON prompt_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_history_intent ON prompt_history(intent);
CREATE INDEX IF NOT EXISTS idx_prompt_history_mode ON prompt_history(mode);
CREATE INDEX IF NOT EXISTS idx_prompt_history_feedback ON prompt_history(feedback);

-- Add indexes for usage_events
CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_date ON usage_events(date);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_date ON usage_events(user_id, date);

-- Add indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan);

-- Razorpay billing and webhook idempotency
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
