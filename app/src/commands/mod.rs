pub mod templates;
pub mod documents;
pub mod folders;
pub mod attachments;
pub mod export;
pub mod metadata;

use std::path::PathBuf;
use rusqlite::Connection;
use tauri::Manager;

/// Returns the path to the app's SQLite database.
/// tauri-plugin-sql stores it at: $APP_DATA/<identifier>/db.sqlite
/// We open the same file so both Rust commands and JS frontend share one DB.
fn db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {e}"))?;
    Ok(data_dir.join("db.sqlite"))
}

/// Opens a rusqlite connection to the shared SQLite database.
/// Each command call gets its own connection — SQLite handles concurrency
/// via file-level locking (WAL mode recommended for concurrent reads).
pub fn open_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let path = db_path(app)?;
    Connection::open(&path).map_err(|e| format!("Failed to open database: {e}"))
}
