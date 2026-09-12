export class SubscriptionRepository {
  constructor(sql) {
    this.sql = sql;
  }

  async findByUserId(userId) {
    const results = await this.sql`
      SELECT id, user_id, status, plan, payment_provider,
             razorpay_customer_id, razorpay_subscription_id, razorpay_plan_id, updated_at
      FROM subscriptions
      WHERE user_id = ${userId.toString()}
      LIMIT 1
    `;
    return results[0] || null;
  }

  async findBySubscriptionId(subscriptionId) {
    const results = await this.sql`
      SELECT id, user_id, status, plan, payment_provider,
             razorpay_customer_id, razorpay_subscription_id, razorpay_plan_id, updated_at
      FROM subscriptions
      WHERE razorpay_subscription_id = ${subscriptionId}
      LIMIT 1
    `;
    return results[0] || null;
  }

  async createOrUpdate(userId, status, plan, customerId, subscriptionId, planId) {
    const results = await this.sql`
      INSERT INTO subscriptions (
        user_id, status, plan, payment_provider, razorpay_customer_id,
        razorpay_subscription_id, razorpay_plan_id, updated_at
      )
      VALUES (
        ${userId.toString()}, ${status}, ${plan}, 'razorpay', ${customerId},
        ${subscriptionId}, ${planId}, NOW()
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        status = ${status},
        plan = ${plan},
        payment_provider = 'razorpay',
        razorpay_customer_id = ${customerId},
        razorpay_subscription_id = ${subscriptionId},
        razorpay_plan_id = ${planId},
        updated_at = NOW()
      RETURNING id, user_id, status, plan, payment_provider
    `;
    return results[0];
  }

  async updateStatusBySubscriptionId(subscriptionId, status, plan) {
    const results = await this.sql`
      UPDATE subscriptions
      SET status = ${status}, plan = ${plan}, updated_at = NOW()
      WHERE razorpay_subscription_id = ${subscriptionId}
      RETURNING id, user_id, status, plan
    `;
    return results;
  }
}
