export class PromptHistoryRepository {
  constructor(sql) {
    this.sql = sql;
  }

  async create(data) {
    const { 
      original, 
      optimized, 
      scoreDelta, 
      platform, 
      userId, 
      intent, 
      mode, 
      scoreOriginal, 
      scoreOptimized 
    } = data;

    const results = await this.sql`
      INSERT INTO prompt_history (
        original, 
        optimized, 
        score_delta, 
        platform, 
        user_id, 
        intent, 
        mode, 
        score_original, 
        score_optimized, 
        created_at
      )
      VALUES (
        ${original}, 
        ${optimized}, 
        ${parseInt(scoreDelta, 10)}, 
        ${platform}, 
        ${userId.toString()}, 
        ${intent || null}, 
        ${mode || null}, 
        ${scoreOriginal !== undefined ? parseInt(scoreOriginal, 10) : null}, 
        ${scoreOptimized !== undefined ? parseInt(scoreOptimized, 10) : null}, 
        NOW()
      )
      RETURNING id, created_at;
    `;
    return results[0];
  }

  async findByUserId(userId, limit = 100) {
    const results = await this.sql`
      SELECT id, original, optimized, score_delta as "scoreDelta", platform, created_at as "timestamp"
      FROM prompt_history
      WHERE user_id = ${userId.toString()}
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit, 10)}
    `;
    return results;
  }

  async updateFeedback(id, userId, feedback) {
    const results = await this.sql`
      UPDATE prompt_history
      SET feedback = ${feedback}
      WHERE id = ${parseInt(id, 10)} AND user_id = ${userId.toString()}
      RETURNING id, feedback;
    `;
    return results[0] || null;
  }

  async clearByUserId(userId) {
    await this.sql`
      DELETE FROM prompt_history
      WHERE user_id = ${userId.toString()}
    `;
    return true;
  }
}
