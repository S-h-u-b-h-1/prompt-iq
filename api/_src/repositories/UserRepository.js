export class UserRepository {
  constructor(sql) {
    this.sql = sql;
  }

  async findByEmail(email) {
    const results = await this.sql`
      SELECT id, email, password_hash, plan, created_at
      FROM users
      WHERE email = ${email.toLowerCase().trim()}
    `;
    return results[0] || null;
  }

  async findById(id) {
    const results = await this.sql`
      SELECT id, email, plan, created_at
      FROM users
      WHERE id = ${parseInt(id, 10)}
    `;
    return results[0] || null;
  }

  async create(email, passwordHash) {
    const results = await this.sql`
      INSERT INTO users (email, password_hash, plan, created_at)
      VALUES (${email.toLowerCase().trim()}, ${passwordHash}, 'free', NOW())
      RETURNING id, email, plan, created_at
    `;
    return results[0];
  }

  async updatePlan(id, plan) {
    const results = await this.sql`
      UPDATE users
      SET plan = ${plan}
      WHERE id = ${parseInt(id, 10)}
      RETURNING id, email, plan
    `;
    return results[0] || null;
  }
}
