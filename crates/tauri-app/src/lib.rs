use mat_core::{
    CreateConversation, CreateMessage, CreateModelConfig, Database, UpdateConversation,
    UpdateModelConfig, VERSION,
};
use serde_json::{json, Value};
use tauri::State;
use tokio::sync::Mutex as AsyncMutex;

struct DbState(AsyncMutex<Database>);

/// 前端通过 invoke('api_request', { path, method, body }) 调用
/// path 格式: "api/conversations", "api/conversations/5", "api/messages" 等
/// 这与 Web 版的 REST API 路径一一对应
#[tauri::command]
async fn api_request(
    path: String,
    method: String,
    body: Option<Value>,
    state: State<'_, DbState>,
) -> Result<Value, String> {
    let db = state.0.lock().await;
    route(&db, &path, &method, body).await
}

async fn route(db: &Database, path: &str, method: &str, body: Option<Value>) -> Result<Value, String> {
    // 去掉前缀 "api/"
    let p = path.strip_prefix("api/").unwrap_or(path);
    let parts: Vec<&str> = p.split('/').collect();
    let m = method.to_uppercase();

    match parts.as_slice() {
        // GET /api/health
        ["health"] => Ok(json!({ "status": "ok", "version": VERSION })),

        // GET /api/check-update
        ["check-update"] => {
            // Tauri 端做更新检测：请求 GitHub API
            let client = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(10))
                .build()
                .map_err(|e| e.to_string())?;
            let resp = client
                .get("https://api.github.com/repos/yachen4ever/ModelApiTester/releases/latest")
                .header("User-Agent", "ModelApiTester")
                .header("Accept", "application/vnd.github+json")
                .send()
                .await
                .map_err(|e| format!("GitHub API 不可达: {}", e))?;
            let body: Value = resp.json().await.map_err(|e| e.to_string())?;
            let latest = body["tag_name"].as_str().unwrap_or("").to_string();
            let html_url = body["html_url"].as_str().unwrap_or("").to_string();
            let current = VERSION.trim_start_matches('v').to_string();
            let latest_trim = latest.trim_start_matches('v').to_string();
            let has_update = !latest.is_empty() && latest_trim != current;
            Ok(json!({
                "available": true,
                "current_version": VERSION,
                "latest_version": latest,
                "has_update": has_update,
                "html_url": html_url,
            }))
        }

        // GET/POST /api/configs
        ["configs"] if m == "GET" => {
            let configs = db.list_model_configs().map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(configs).unwrap())
        }
        ["configs"] if m == "POST" => {
            let data: CreateModelConfig = parse_body(body)?;
            let id = db.create_model_config(&data).map_err(|e| e.to_string())?;
            let config = db.get_model_config(id).map_err(|e| e.to_string())?;
            Ok(json!({ "id": id, "config": config }))
        }

        // PUT/DELETE /api/configs/:id
        ["configs", id_str] => {
            let id: i64 = id_str.parse().map_err(|_| "invalid id")?;
            match m.as_str() {
                "PUT" => {
                    let data: UpdateModelConfig = parse_body(body)?;
                    db.update_model_config(id, &data).map_err(|e| e.to_string())?;
                    let config = db.get_model_config(id).map_err(|e| e.to_string())?;
                    Ok(json!({ "id": id, "config": config }))
                }
                "DELETE" => {
                    db.delete_model_config(id).map_err(|e| e.to_string())?;
                    Ok(json!({ "ok": true }))
                }
                _ => Err(format!("method {} not allowed on configs/:id", m)),
            }
        }

        // GET/POST /api/conversations
        ["conversations"] if m == "GET" => {
            let convs = db.list_conversations().map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(convs).unwrap())
        }
        ["conversations"] if m == "POST" => {
            let data: CreateConversation = parse_body(body)?;
            let id = db.create_conversation(&data).map_err(|e| e.to_string())?;
            let conv = db.get_conversation(id).map_err(|e| e.to_string())?;
            Ok(json!({ "id": id, "conversation": conv }))
        }

        // PUT/DELETE /api/conversations/:id
        ["conversations", id_str] => {
            let id: i64 = id_str.parse().map_err(|_| "invalid id")?;
            match m.as_str() {
                "PUT" => {
                    let data: UpdateConversation = parse_body(body)?;
                    db.update_conversation(id, &data).map_err(|e| e.to_string())?;
                    let conv = db.get_conversation(id).map_err(|e| e.to_string())?;
                    Ok(json!({ "id": id, "conversation": conv }))
                }
                "DELETE" => {
                    db.delete_conversation(id).map_err(|e| e.to_string())?;
                    Ok(json!({ "ok": true }))
                }
                _ => Err(format!("method {} not allowed on conversations/:id", m)),
            }
        }

        // GET/DELETE /api/conversations/:id/messages
        ["conversations", id_str, "messages"] => {
            let id: i64 = id_str.parse().map_err(|_| "invalid id")?;
            match m.as_str() {
                "GET" => {
                    let msgs = db.list_messages(id).map_err(|e| e.to_string())?;
                    Ok(serde_json::to_value(msgs).unwrap())
                }
                "DELETE" => {
                    db.delete_messages(id).map_err(|e| e.to_string())?;
                    Ok(json!({ "ok": true }))
                }
                _ => Err(format!(
                    "method {} not allowed on conversations/:id/messages",
                    m
                )),
            }
        }

        // POST /api/messages
        ["messages"] if m == "POST" => {
            let data: CreateMessage = parse_body(body)?;
            let id = db.create_message(&data).map_err(|e| e.to_string())?;
            Ok(json!({ "id": id }))
        }

        _ => Err(format!("unknown route: {} {}", method, path)),
    }
}

fn parse_body<T: serde::de::DeserializeOwned>(body: Option<Value>) -> Result<T, String> {
    serde_json::from_value(body.unwrap_or(Value::Null))
        .map_err(|e| format!("invalid request body: {}", e))
}

pub fn run() {
    // 数据目录统一放 ~/.mat-desktop（跨平台，用户可见，易备份）
    let db_path = dirs_next::home_dir()
        .map(|d| d.join(".mat-desktop").join("model_api_tester.db"))
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "./model_api_tester.db".to_string());

    // 确保目录存在
    if let Some(parent) = std::path::Path::new(&db_path).parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let db = Database::open(&db_path).expect("Failed to open database");

    tauri::Builder::default()
        .manage(DbState(AsyncMutex::new(db)))
        .invoke_handler(tauri::generate_handler![api_request])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
