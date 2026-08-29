use serde::{Deserialize, Serialize};

// ==================== 模型配置 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub id: Option<i64>,
    pub name: String,
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub endpoint: Option<String>,   // "auto" or custom path
    pub api_type: Option<String>,   // "openai" | "anthropic" | "google" | "other"
    pub system_prompt: Option<String>,
    pub temperature: Option<f64>,
    pub max_tokens: Option<i64>,
    pub top_p: Option<f64>,
    pub frequency_penalty: Option<f64>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: Option<i64>,
    pub title: String,
    pub model_config_id: Option<i64>,
    pub context_enabled: Option<bool>,
    pub last_config: Option<String>,  // JSON string of form data
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    // Joined fields
    pub config_name: Option<String>,
    pub model_name: Option<String>,
    pub message_count: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: Option<i64>,
    pub conversation_id: i64,
    pub role: String,           // "user" | "assistant" | "system"
    pub content: String,        // plain text or JSON array
    pub is_error: Option<bool>,
    pub duration_ms: Option<f64>,
    pub tokens: Option<i64>,
    pub model_name: Option<String>,
    pub prompt_tokens: Option<i64>,
    pub completion_tokens: Option<i64>,
    pub prefill_ms: Option<f64>,
    pub decode_ms: Option<f64>,
    pub created_at: Option<String>,
    pub images: Option<Vec<String>>,  // base64 data URLs (joined from message_images)
}

// ==================== 请求 DTO ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateModelConfig {
    pub name: Option<String>,
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub endpoint: Option<String>,
    pub api_type: Option<String>,
    pub system_prompt: Option<String>,
    pub temperature: Option<f64>,
    pub max_tokens: Option<i64>,
    pub top_p: Option<f64>,
    pub frequency_penalty: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateModelConfig {
    pub name: String,
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub endpoint: Option<String>,
    pub api_type: Option<String>,
    pub system_prompt: Option<String>,
    pub temperature: Option<f64>,
    pub max_tokens: Option<i64>,
    pub top_p: Option<f64>,
    pub frequency_penalty: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateConversation {
    pub title: Option<String>,
    pub model_config_id: Option<i64>,
    pub context_enabled: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateConversation {
    pub title: Option<String>,
    pub model_config_id: Option<i64>,
    pub context_enabled: Option<bool>,
    pub last_config: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMessage {
    pub conversation_id: i64,
    pub role: String,
    pub content: serde_json::Value,  // string or array
    pub is_error: Option<bool>,
    pub duration_ms: Option<f64>,
    pub tokens: Option<i64>,
    pub model_name: Option<String>,
    pub prompt_tokens: Option<i64>,
    pub completion_tokens: Option<i64>,
    pub prefill_ms: Option<f64>,
    pub decode_ms: Option<f64>,
    pub images: Option<Vec<String>>,
}

// ==================== 健康检查 ====================

#[derive(Debug, Serialize)]
pub struct HealthStatus {
    pub status: String,
    pub version: &'static str,
}
