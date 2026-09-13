export class ActivityRepository {
  constructor(sql) { this.sql = sql; }

  async run(userId, statements) {
    const result = await this.sql.transaction([
      this.sql`SELECT set_config('app.user_id', ${String(userId)}, true)`,
      ...statements
    ]);
    return result.slice(1);
  }

  async preferences(userId) {
    const [rows] = await this.run(userId, [this.sql`
      SELECT save_drafts AS "saveDrafts", save_searches AS "saveSearches",
             disclosure_version AS "disclosureVersion"
      FROM prompt_iq.capture_preferences WHERE user_id = ${userId}
    `]);
    return rows[0] || {saveDrafts:false,saveSearches:false,disclosureVersion:'2026-09-13-v2'};
  }

  async setPreferences(userId, value) {
    const [rows] = await this.run(userId, [this.sql`
      INSERT INTO prompt_iq.capture_preferences(user_id,save_drafts,save_searches,disclosure_version,accepted_at)
      VALUES (${userId},${value.saveDrafts},${value.saveSearches},${value.disclosureVersion},
              CASE WHEN ${value.saveDrafts} THEN now() ELSE NULL END)
      ON CONFLICT(user_id) DO UPDATE SET save_drafts=EXCLUDED.save_drafts,
        save_searches=EXCLUDED.save_searches,disclosure_version=EXCLUDED.disclosure_version,
        accepted_at=CASE WHEN EXCLUDED.save_drafts THEN now() ELSE prompt_iq.capture_preferences.accepted_at END,
        updated_at=now()
      RETURNING save_drafts AS "saveDrafts",save_searches AS "saveSearches",disclosure_version AS "disclosureVersion"
    `]);
    return rows[0];
  }

  async save(userId, entry) {
    const sql = this.sql;
    // Lock the preference row so opt-out and writes cannot cross each other.
    const statement = entry.kind === 'draft' ? sql`
      WITH consent AS MATERIALIZED (
        SELECT user_id FROM prompt_iq.capture_preferences
        WHERE user_id=${userId} AND save_drafts=true FOR UPDATE
      )
      INSERT INTO prompt_iq.drafts(user_id,client_id,prompt_text,platform,mode,client_revision)
      SELECT user_id,${entry.clientId}::uuid,${entry.text},${entry.platform},${entry.mode},${entry.revision} FROM consent
      ON CONFLICT(user_id,client_id) DO UPDATE
        SET prompt_text=EXCLUDED.prompt_text,platform=EXCLUDED.platform,mode=EXCLUDED.mode,
            client_revision=EXCLUDED.client_revision,updated_at=now()
        WHERE EXCLUDED.client_revision > prompt_iq.drafts.client_revision
      RETURNING client_id AS id
    ` : sql`
      WITH consent AS MATERIALIZED (
        SELECT user_id FROM prompt_iq.capture_preferences
        WHERE user_id=${userId} AND save_searches=true FOR UPDATE
      )
      INSERT INTO prompt_iq.searches(user_id,client_id,query_text,category,result_count)
      SELECT user_id,${entry.clientId}::uuid,${entry.text},${entry.category},${entry.resultCount} FROM consent
      ON CONFLICT(user_id,client_id) DO NOTHING RETURNING client_id AS id
    `;
    const [savedRows] = await this.run(userId, [statement, ...this.expired(userId)]);
    return {saved:savedRows.length > 0};
  }

  expired(userId) {
    return [
      this.sql`DELETE FROM prompt_iq.drafts WHERE user_id=${userId} AND updated_at < now() - interval '30 days'`,
      this.sql`DELETE FROM prompt_iq.searches WHERE user_id=${userId} AND created_at < now() - interval '30 days'`
    ];
  }

  async list(userId, {limit,offset}) {
    const [rows] = await this.run(userId, [this.sql`
      SELECT * FROM (
        SELECT 'draft' AS kind,client_id AS id,prompt_text AS text,platform,mode,
               NULL::text AS category,NULL::integer AS "resultCount",updated_at AS timestamp
        FROM prompt_iq.drafts WHERE user_id=${userId} AND updated_at >= now() - interval '30 days'
        UNION ALL
        SELECT 'search',client_id,query_text,'promptiq',NULL,category,result_count,created_at
        FROM prompt_iq.searches WHERE user_id=${userId} AND created_at >= now() - interval '30 days'
      ) AS entries ORDER BY timestamp DESC,id DESC LIMIT ${limit + 1} OFFSET ${offset}
    `, ...this.expired(userId)]);
    return {entries:rows.slice(0,limit),nextOffset:rows.length>limit?offset+limit:null};
  }

  async clear(userId) {
    // Serialize against in-flight saves, turn off capture, then remove the user's records.
    await this.run(userId, [
      this.sql`INSERT INTO prompt_iq.capture_preferences(user_id,save_drafts,save_searches)
        VALUES (${userId},false,false) ON CONFLICT(user_id) DO UPDATE
        SET save_drafts=false,save_searches=false,updated_at=now()`,
      this.sql`DELETE FROM prompt_iq.drafts WHERE user_id=${userId}`,
      this.sql`DELETE FROM prompt_iq.searches WHERE user_id=${userId}`
    ]);
  }
}
