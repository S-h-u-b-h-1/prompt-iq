export class SubscriptionRepository {
  constructor(sql) {
    this.sql = sql;
  }

  async findByUserId(userId) {
    const results = await this.sql`
      SELECT id, user_id, status, plan, stripe_customer_id, stripe_subscription_id, updated_at
      FROM subscriptions
      WHERE user_id = ${userId.toString()} AND status = 'active'
    `;
    return results[0] || null;
  }

  async findByCustomerId(customerId) {
    const results = await this.sql`
      SELECT id, user_id, status, plan, stripe_customer_id, stripe_subscription_id, updated_at
      FROM subscriptions
      WHERE stripe_customer_id = ${customerId}
    `;
    return results[0] || null;
  }

  async createOrUpdate(userId, status, plan, customerId, subscriptionId) {
    const results = await this.sql`
      INSERT INTO subscriptions (user_id, status, plan, stripe_customer_id, stripe_subscription_id, updated_at)
      VALUES (${userId.toString()}, ${status}, ${plan}, ${customerId}, ${subscriptionId}, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET 
        status = ${status}, 
        plan = ${plan}, 
        stripe_customer_id = ${customerId}, 
        stripe_subscription_id = ${subscriptionId}, 
        updated_at = NOW()
      RETURNING id, user_id, status, plan;
    `;
    return results[0];
  }

  async updateStatusByCustomerId(customerId, status, plan) {
    const results = await this.sql`
      UPDATE subscriptions
      SET status = ${status}, plan = ${plan}, updated_at = NOW()
      WHERE stripe_customer_id = ${customerId}
      RETURNING id, user_id, status, plan
    `;
    return results;
  }

  async cancelByCustomerId(customerId) {
    const results = await this.sql`
      UPDATE subscriptions
      SET status = 'canceled', plan = 'free', updated_at = NOW()
      WHERE stripe_customer_id = ${customerId}
      RETURNING id, user_id, status, plan
    `;
    return results[0] || null;
  }
}
