use rusqlite::{Connection, params};
use std::sync::Mutex;

use crate::models::*;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn open(path: &str) -> rusqlite::Result<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode = WAL;")?;
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        Self::init_schema(&conn)?;
        Self::migrate(&conn)?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    fn init_schema(conn: &Connection) -> rusqlite::Result<()> {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS model_configs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                base_url TEXT NOT NULL,
                api_key TEXT NOT NULL,
                model TEXT NOT NULL,
                endpoint TEXT DEFAULT 'auto',
                api_type TEXT DEFAULT 'openai',
                system_prompt TEXT DEFAULT '',
                temperature REAL DEFAULT 1,
                max_tokens INTEGER DEFAULT 4096,
                top_p REAL DEFAULT 1,
                frequency_penalty REAL DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL DEFAULT '新对话',
                model_config_id INTEGER,
                context_enabled INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (model_config_id) REFERENCES model_configs(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                is_error INTEGER DEFAULT 0,
                duration_ms REAL,
                tokens INTEGER,
                model_name TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS message_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER NOT NULL,
                image_data TEXT NOT NULL,
                sort_order INTEGER DEFAULT 0,
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
            );"
        )?;
        Ok(())
    }

    fn migrate(conn: &Connection) -> rusqlite::Result<()> {
        // Add api_type column if missing
        let cols: Vec<String> = conn
            .prepare("PRAGMA table_info(model_configs)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .filter_map(|r| r.ok())
            .collect();
        if !cols.iter().any(|c| c == "api_type") {
            conn.execute("ALTER TABLE model_configs ADD COLUMN api_type TEXT DEFAULT 'openai'", [])?;
        }

        // Add last_config column if missing
        let conv_cols: Vec<String> = conn
            .prepare("PRAGMA table_info(conversations)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .filter_map(|r| r.ok())
            .collect();
        if !conv_cols.iter().any(|c| c == "last_config") {
            conn.execute("ALTER TABLE conversations ADD COLUMN last_config TEXT", [])?;
        }
        Ok(())
    }

    // ==================== 模型配置 CRUD ====================

    pub fn list_model_configs(&self) -> rusqlite::Result<Vec<ModelConfig>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, base_url, api_key, model, endpoint, api_type, system_prompt,
                    temperature, max_tokens, top_p, frequency_penalty, created_at, updated_at
             FROM model_configs ORDER BY updated_at DESC"
        )?;
        let rows = stmt.query_map([], row_to_model_config)?;
        rows.collect()
    }

    pub fn get_model_config(&self, id: i64) -> rusqlite::Result<Option<ModelConfig>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, base_url, api_key, model, endpoint, api_type, system_prompt,
                    temperature, max_tokens, top_p, frequency_penalty, created_at, updated_at
             FROM model_configs WHERE id = ?"
        )?;
        let mut rows = stmt.query_map(params![id], row_to_model_config)?;
        rows.next().transpose()
    }

    pub fn create_model_config(&self, data: &CreateModelConfig) -> rusqlite::Result<i64> {
        let conn = self.conn.lock().unwrap();
        let name = data.name.clone().unwrap_or_else(|| {
            // fallback: "{model} @ {host}" — extract host from base_url
            let host = data.base_url
                .strip_prefix("https://")
                .or_else(|| data.base_url.strip_prefix("http://"))
                .unwrap_or(&data.base_url)
                .split('/')
                .next()
                .unwrap_or("");
            format!("{} @ {}", data.model, host)
        });
        conn.execute(
            "INSERT INTO model_configs
                (name, base_url, api_key, model, endpoint, api_type, system_prompt,
                 temperature, max_tokens, top_p, frequency_penalty)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            params![
                name,
                data.base_url,
                data.api_key,
                data.model,
                data.endpoint.as_deref().unwrap_or("auto"),
                data.api_type.as_deref().unwrap_or("openai"),
                data.system_prompt.as_deref().unwrap_or(""),
                data.temperature.unwrap_or(1.0),
                data.max_tokens.unwrap_or(4096),
                data.top_p.unwrap_or(1.0),
                data.frequency_penalty.unwrap_or(0.0),
            ],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn update_model_config(&self, id: i64, data: &UpdateModelConfig) -> rusqlite::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE model_configs SET
                name = ?, base_url = ?, api_key = ?, model = ?, endpoint = ?, api_type = ?,
                system_prompt = ?, temperature = ?, max_tokens = ?, top_p = ?, frequency_penalty = ?,
                updated_at = datetime('now')
             WHERE id = ?",
            params![
                data.name,
                data.base_url,
                data.api_key,
                data.model,
                data.endpoint.as_deref().unwrap_or("auto"),
                data.api_type.as_deref().unwrap_or("openai"),
                data.system_prompt.as_deref().unwrap_or(""),
                data.temperature.unwrap_or(1.0),
                data.max_tokens.unwrap_or(4096),
                data.top_p.unwrap_or(1.0),
                data.frequency_penalty.unwrap_or(0.0),
                id,
            ],
        )?;
        Ok(())
    }

    pub fn delete_model_config(&self, id: i64) -> rusqlite::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM model_configs WHERE id = ?", params![id])?;
        Ok(())
    }

    // ==================== 会话 CRUD ====================

    pub fn list_conversations(&self) -> rusqlite::Result<Vec<Conversation>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT c.id, c.title, c.model_config_id, c.context_enabled, c.last_config,
                    c.created_at, c.updated_at,
                    mc.name as config_name, mc.model as model_name,
                    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
             FROM conversations c
             LEFT JOIN model_configs mc ON c.model_config_id = mc.id
             ORDER BY c.updated_at DESC"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Conversation {
                id: Some(row.get(0)?),
                title: row.get(1)?,
                model_config_id: row.get(2)?,
                context_enabled: Some(row.get::<_, i64>(3)? != 0),
                last_config: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                config_name: row.get(7)?,
                model_name: row.get(8)?,
                message_count: Some(row.get(9)?),
            })
        })?;
        rows.collect()
    }

    pub fn get_conversation(&self, id: i64) -> rusqlite::Result<Option<Conversation>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, model_config_id, context_enabled, last_config, created_at, updated_at
             FROM conversations WHERE id = ?"
        )?;
        let mut rows = stmt.query_map(params![id], |row| {
            Ok(Conversation {
                id: Some(row.get(0)?),
                title: row.get(1)?,
                model_config_id: row.get(2)?,
                context_enabled: Some(row.get::<_, i64>(3)? != 0),
                last_config: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                config_name: None,
                model_name: None,
                message_count: None,
            })
        })?;
        rows.next().transpose()
    }

    pub fn create_conversation(&self, data: &CreateConversation) -> rusqlite::Result<i64> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO conversations (title, model_config_id, context_enabled) VALUES (?,?,?)",
            params![
                data.title.as_deref().unwrap_or("新对话"),
                data.model_config_id,
                data.context_enabled.unwrap_or(true) as i64,
            ],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn update_conversation(&self, id: i64, data: &UpdateConversation) -> rusqlite::Result<()> {
        let conn = self.conn.lock().unwrap();
        let mut sets: Vec<String> = Vec::new();
        let mut args: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(ref title) = data.title {
            sets.push("title = ?".into());
            args.push(Box::new(title.clone()));
        }
        if let Some(model_config_id) = data.model_config_id {
            sets.push("model_config_id = ?".into());
            args.push(Box::new(model_config_id));
        }
        if let Some(context_enabled) = data.context_enabled {
            sets.push("context_enabled = ?".into());
            args.push(Box::new(context_enabled as i64));
        }
        if let Some(ref last_config) = data.last_config {
            sets.push("last_config = ?".into());
            args.push(Box::new(last_config.clone()));
        }
        if sets.is_empty() {
            return Ok(());
        }
        sets.push("updated_at = datetime('now')".into());
        args.push(Box::new(id));

        let sql = format!("UPDATE conversations SET {} WHERE id = ?", sets.join(", "));
        let arg_refs: Vec<&dyn rusqlite::ToSql> = args.iter().map(|a| a.as_ref()).collect();
        conn.execute(&sql, arg_refs.as_slice())?;
        Ok(())
    }

    pub fn delete_conversation(&self, id: i64) -> rusqlite::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM conversations WHERE id = ?", params![id])?;
        Ok(())
    }

    // ==================== 消息 CRUD ====================

    pub fn list_messages(&self, conversation_id: i64) -> rusqlite::Result<Vec<Message>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, conversation_id, role, content, is_error, duration_ms, tokens, model_name, created_at
             FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
        )?;
        let mut messages: Vec<Message> = Vec::new();
        let rows = stmt.query_map(params![conversation_id], |row| {
            Ok(Message {
                id: Some(row.get(0)?),
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                is_error: Some(row.get::<_, i64>(4)? != 0),
                duration_ms: row.get(5)?,
                tokens: row.get(6)?,
                model_name: row.get(7)?,
                created_at: row.get(8)?,
                images: None,
            })
        })?;
        for msg in rows {
            let mut m = msg?;
            // Load images for user messages
            if m.role == "user" {
                let mut img_stmt = conn.prepare(
                    "SELECT image_data FROM message_images WHERE message_id = ? ORDER BY sort_order ASC"
                )?;
                let imgs: Vec<String> = img_stmt
                    .query_map(params![m.id], |row| row.get(0))?
                    .filter_map(|r| r.ok())
                    .collect();
                if !imgs.is_empty() {
                    m.images = Some(imgs);
                }
            }
            messages.push(m);
        }
        Ok(messages)
    }

    pub fn create_message(&self, data: &CreateMessage) -> rusqlite::Result<i64> {
        let conn = self.conn.lock().unwrap();
        // Normalize content: if it's a string, store as-is; if array, store as JSON string
        let content_str = if let serde_json::Value::String(s) = &data.content {
            s.clone()
        } else {
            serde_json::to_string(&data.content).unwrap_or_default()
        };

        conn.execute(
            "INSERT INTO messages (conversation_id, role, content, is_error, duration_ms, tokens, model_name)
             VALUES (?,?,?,?,?,?,?)",
            params![
                data.conversation_id,
                data.role,
                content_str,
                data.is_error.unwrap_or(false) as i64,
                data.duration_ms,
                data.tokens,
                data.model_name,
            ],
        )?;
        let msg_id = conn.last_insert_rowid();

        // Save images
        if let Some(ref images) = data.images {
            for (idx, img) in images.iter().enumerate() {
                conn.execute(
                    "INSERT INTO message_images (message_id, image_data, sort_order) VALUES (?,?,?)",
                    params![msg_id, img, idx],
                )?;
            }
        }

        // Update conversation's updated_at
        conn.execute(
            "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?",
            params![data.conversation_id],
        )?;
        Ok(msg_id)
    }

    pub fn delete_messages(&self, conversation_id: i64) -> rusqlite::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM messages WHERE conversation_id = ?", params![conversation_id])?;
        conn.execute(
            "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?",
            params![conversation_id],
        )?;
        Ok(())
    }
}

// ==================== Row mappers ====================

fn row_to_model_config(row: &rusqlite::Row) -> rusqlite::Result<ModelConfig> {
    Ok(ModelConfig {
        id: Some(row.get(0)?),
        name: row.get(1)?,
        base_url: row.get(2)?,
        api_key: row.get(3)?,
        model: row.get(4)?,
        endpoint: row.get(5)?,
        api_type: row.get(6)?,
        system_prompt: row.get(7)?,
        temperature: row.get(8)?,
        max_tokens: row.get(9)?,
        top_p: row.get(10)?,
        frequency_penalty: row.get(11)?,
        created_at: row.get(12)?,
        updated_at: row.get(13)?,
    })
}
