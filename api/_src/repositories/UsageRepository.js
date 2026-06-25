export class UsageRepository {
  constructor(sql) {
    this.sql = sql;
  }

  async getDailyCount(userId, date) {
    const results = await this.sql`
      SELECT count 
      FROM usage_events
      WHERE user_id = ${userId.toString()} AND date = ${date}
    `;
    return results.length > 0 ? results[0].count : 0;
  }

  async incrementDailyCount(userId, date) {
    const results = await this.sql`
      INSERT INTO usage_events (user_id, date, count, created_at)
      VALUES (${userId.toString()}, ${date}, 1, NOW())
      ON CONFLICT (user_id, date)
      DO UPDATE SET count = usage_events.count + 1, created_at = NOW()
      RETURNING count;
    `;
    return results[0].count;
  }
}
