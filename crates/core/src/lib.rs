pub mod db;
pub mod models;

pub use db::Database;
pub use models::*;

pub const VERSION: &str = env!("CARGO_PKG_VERSION");
