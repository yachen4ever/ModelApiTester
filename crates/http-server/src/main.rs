use axum::{
    extract::{Path, State},
    response::{IntoResponse, Json, Response},
    routing::{get, post, put},
    Router,
};
use mat_core::{CreateConversation, CreateMessage, CreateModelConfig, Database, UpdateConversation, UpdateModelConfig, VERSION};
use serde_json::{json, Value};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

#[derive(Clone)]
struct AppState {
    db: Arc<Database>,
}

struct AppError(String);

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (axum::http::StatusCode::BAD_REQUEST, Json(json!({ "error": self.0 }))).into_response()
    }
}

// ============================ 路由 ============================

pub fn build_router(db: Database) -> Router {
    let state = AppState {
        db: Arc::new(db),
    };

    Router::new()
        .route("/api/configs", get(list_configs).post(create_config))
        .route("/api/configs/{id}", put(update_config).delete(delete_config))
        .route("/api/conversations", get(list_conversations).post(create_conversation))
        .route("/api/conversations/{id}", put(update_conversation).delete(delete_conversation))
        .route("/api/conversations/{id}/messages", get(list_messages).delete(delete_messages))
        .route("/api/messages", post(create_message))
        .route("/api/health", get(health))
        .fallback_service(ServeDir::new("crates/http-server/static"))
        .layer(CorsLayer::very_permissive())
        .with_state(state)
}

// ============================ Handlers ============================

async fn health(State(_s): State<AppState>) -> Json<Value> {
    Json(json!({ "status": "ok", "version": VERSION }))
}

// --- 模型配置 ---

async fn list_configs(State(s): State<AppState>) -> Result<Json<Value>, AppError> {
    let configs = s.db.list_model_configs().map_err(|e| AppError(e.to_string()))?;
    Ok(Json(serde_json::to_value(configs).unwrap()))
}

async fn create_config(State(s): State<AppState>, Json(data): Json<CreateModelConfig>) -> Result<Json<Value>, AppError> {
    let id = s.db.create_model_config(&data).map_err(|e| AppError(e.to_string()))?;
    let config = s.db.get_model_config(id).map_err(|e| AppError(e.to_string()))?;
    Ok(Json(json!({ "id": id, "config": config })))
}

async fn update_config(State(s): State<AppState>, Path(id): Path<i64>, Json(data): Json<UpdateModelConfig>) -> Result<Json<Value>, AppError> {
    s.db.update_model_config(id, &data).map_err(|e| AppError(e.to_string()))?;
    let config = s.db.get_model_config(id).map_err(|e| AppError(e.to_string()))?;
    Ok(Json(json!({ "id": id, "config": config })))
}

async fn delete_config(State(s): State<AppState>, Path(id): Path<i64>) -> Result<Json<Value>, AppError> {
    s.db.delete_model_config(id).map_err(|e| AppError(e.to_string()))?;
    Ok(Json(json!({ "ok": true })))
}

// --- 会话 ---

async fn list_conversations(State(s): State<AppState>) -> Result<Json<Value>, AppError> {
    let convs = s.db.list_conversations().map_err(|e| AppError(e.to_string()))?;
    Ok(Json(serde_json::to_value(convs).unwrap()))
}

async fn create_conversation(State(s): State<AppState>, Json(data): Json<CreateConversation>) -> Result<Json<Value>, AppError> {
    let id = s.db.create_conversation(&data).map_err(|e| AppError(e.to_string()))?;
    let conv = s.db.get_conversation(id).map_err(|e| AppError(e.to_string()))?;
    Ok(Json(json!({ "id": id, "conversation": conv })))
}

async fn update_conversation(State(s): State<AppState>, Path(id): Path<i64>, Json(data): Json<UpdateConversation>) -> Result<Json<Value>, AppError> {
    s.db.update_conversation(id, &data).map_err(|e| AppError(e.to_string()))?;
    let conv = s.db.get_conversation(id).map_err(|e| AppError(e.to_string()))?;
    Ok(Json(json!({ "id": id, "conversation": conv })))
}

async fn delete_conversation(State(s): State<AppState>, Path(id): Path<i64>) -> Result<Json<Value>, AppError> {
    s.db.delete_conversation(id).map_err(|e| AppError(e.to_string()))?;
    Ok(Json(json!({ "ok": true })))
}

// --- 消息 ---

async fn list_messages(State(s): State<AppState>, Path(id): Path<i64>) -> Result<Json<Value>, AppError> {
    let msgs = s.db.list_messages(id).map_err(|e| AppError(e.to_string()))?;
    Ok(Json(serde_json::to_value(msgs).unwrap()))
}

async fn delete_messages(State(s): State<AppState>, Path(id): Path<i64>) -> Result<Json<Value>, AppError> {
    s.db.delete_messages(id).map_err(|e| AppError(e.to_string()))?;
    Ok(Json(json!({ "ok": true })))
}

async fn create_message(State(s): State<AppState>, Json(data): Json<CreateMessage>) -> Result<Json<Value>, AppError> {
    let id = s.db.create_message(&data).map_err(|e| AppError(e.to_string()))?;
    Ok(Json(json!({ "id": id })))
}

// ============================ Main ============================

#[tokio::main]
async fn main() {
    let db_path = std::env::var("DB_PATH").unwrap_or_else(|_| "./model_api_tester.db".to_string());
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(52081);
    let host = std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());

    let db = Database::open(&db_path).expect("Failed to open database");
    let router = build_router(db);

    let addr = format!("{}:{}", host, port);
    let listener = tokio::net::TcpListener::bind(&addr).await.expect("Failed to bind");
    println!("Model API Tester v{} listening on http://{}", VERSION, addr);
    axum::serve(listener, router).await.expect("Server error");
}
