import { Database } from "bun:sqlite";

/**
 * SQLite 数据库初始化与管理
 */
export class DB {
  db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, { create: true });
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.init();
  }

  private init() {
    // 模型配置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS model_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        base_url TEXT NOT NULL,
        api_key TEXT NOT NULL,
        model TEXT NOT NULL,
        endpoint TEXT DEFAULT 'auto',
        system_prompt TEXT DEFAULT '',
        temperature REAL DEFAULT 1,
        max_tokens INTEGER DEFAULT 4096,
        top_p REAL DEFAULT 1,
        frequency_penalty REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // 会话表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT '新对话',
        model_config_id INTEGER,
        context_enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (model_config_id) REFERENCES model_configs(id) ON DELETE SET NULL
      );
    `);

    // 消息表（支持多模态内容）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        role TEXT NOT NULL,  -- 'user' | 'assistant' | 'system'
        content TEXT NOT NULL,          -- 文本内容（JSON: string 或 多模态数组）
        is_error INTEGER DEFAULT 0,
        duration_ms REAL,    -- 响应耗时
        tokens INTEGER,      -- token 用量
        model_name TEXT,     -- 实际使用的模型名
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );
    `);

    // 图片表（分离存储，避免消息表过大）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS message_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        image_data TEXT NOT NULL,  -- base64 data URL
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      );
    `);
  }

  // ==================== 模型配置 CRUD ====================

  listModelConfigs() {
    return this.db.query("SELECT * FROM model_configs ORDER BY updated_at DESC").all();
  }

  getModelConfig(id: number) {
    return this.db.query("SELECT * FROM model_configs WHERE id = ?").get(id);
  }

  createModelConfig(data: any) {
    const stmt = this.db.prepare(`
      INSERT INTO model_configs (name, base_url, api_key, model, endpoint, system_prompt, temperature, max_tokens, top_p, frequency_penalty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.name || `${data.model} @ ${new URL(data.base_url).host}`,
      data.base_url, data.api_key, data.model,
      data.endpoint || "auto", data.system_prompt || "",
      data.temperature ?? 1, data.max_tokens ?? 4096,
      data.top_p ?? 1, data.frequency_penalty ?? 0
    );
    return this.getLastInsertId();
  }

  updateModelConfig(id: number, data: any) {
    const stmt = this.db.prepare(`
      UPDATE model_configs SET
        name = ?, base_url = ?, api_key = ?, model = ?, endpoint = ?,
        system_prompt = ?, temperature = ?, max_tokens = ?, top_p = ?, frequency_penalty = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(
      data.name, data.base_url, data.api_key, data.model, data.endpoint,
      data.system_prompt, data.temperature, data.max_tokens, data.top_p, data.frequency_penalty,
      id
    );
  }

  deleteModelConfig(id: number) {
    this.db.prepare("DELETE FROM model_configs WHERE id = ?").run(id);
  }

  // ==================== 会话 CRUD ====================

  listConversations() {
    return this.db.query(`
      SELECT c.*, mc.name as config_name, mc.model as model_name,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
      FROM conversations c
      LEFT JOIN model_configs mc ON c.model_config_id = mc.id
      ORDER BY c.updated_at DESC
    `).all();
  }

  getConversation(id: number) {
    return this.db.query("SELECT * FROM conversations WHERE id = ?").get(id);
  }

  createConversation(data: any) {
    const stmt = this.db.prepare(`
      INSERT INTO conversations (title, model_config_id, context_enabled)
      VALUES (?, ?, ?)
    `);
    stmt.run(data.title || "新对话", data.model_config_id || null, data.context_enabled ?? 1);
    return this.getLastInsertId();
  }

  updateConversation(id: number, data: any) {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.title !== undefined) { fields.push("title = ?"); values.push(data.title); }
    if (data.model_config_id !== undefined) { fields.push("model_config_id = ?"); values.push(data.model_config_id); }
    if (data.context_enabled !== undefined) { fields.push("context_enabled = ?"); values.push(data.context_enabled); }
    if (fields.length === 0) return;
    fields.push("updated_at = datetime('now')");
    values.push(id);
    this.db.prepare(`UPDATE conversations SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }

  deleteConversation(id: number) {
    this.db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
  }

  // ==================== 消息 CRUD ====================

  listMessages(conversationId: number) {
    const messages = this.db.query(`
      SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
    `).all(conversationId) as any[];

    // 附加图片
    for (const msg of messages) {
      if (msg.role === "user") {
        const imgs = this.db.query("SELECT image_data FROM message_images WHERE message_id = ? ORDER BY sort_order ASC").all(msg.id) as any[];
        if (imgs.length > 0) {
          msg.images = imgs.map((i: any) => i.image_data);
        }
      }
    }
    return messages;
  }

  createMessage(data: any) {
    const content = typeof data.content === "string" ? data.content : JSON.stringify(data.content);
    const stmt = this.db.prepare(`
      INSERT INTO messages (conversation_id, role, content, is_error, duration_ms, tokens, model_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.conversation_id, data.role, content,
      data.is_error ? 1 : 0,
      data.duration_ms || null, data.tokens || null, data.model_name || null
    );
    const msgId = this.getLastInsertId();

    // 保存图片
    if (data.images && Array.isArray(data.images)) {
      const imgStmt = this.db.prepare("INSERT INTO message_images (message_id, image_data, sort_order) VALUES (?, ?, ?)");
      data.images.forEach((img: string, idx: number) => imgStmt.run(msgId, img, idx));
    }

    // 更新会话的 updated_at
    this.db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(data.conversation_id);

    return msgId;
  }

  deleteMessages(conversationId: number) {
    this.db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(conversationId);
    this.db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conversationId);
  }

  // ==================== 工具 ====================

  private getLastInsertId(): number {
    return (this.db.query("SELECT last_insert_rowid() as id").get() as any).id;
  }

  close() {
    this.db.close();
  }
}
