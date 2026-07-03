BEGIN;

UPDATE users
SET plan = 'premium'
WHERE plan = 'pro';

UPDATE subscriptions
SET plan = 'premium', updated_at = NOW()
WHERE plan = 'pro';

COMMIT;
