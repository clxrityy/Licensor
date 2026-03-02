use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use uuid::Uuid;

use super::open_db;

// ─── Types ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct Attachment {
    pub id: String,
    pub document_id: String,
    pub filename: String,
    pub file_path: String,   // Relative to $APPDATA — resolved at runtime
    pub mime_type: String,
    pub size_bytes: i64,
    pub created_at: String,
}

// ─── Commands ───────────────────────────────────────────────────────────────

/// Registers a file attachment for a document.
///
/// The actual file writing is handled by the frontend via tauri-plugin-fs.
/// This command only records the metadata in SQLite so we can list/manage
/// attachments. The file_path is relative to $APPDATA — e.g.:
///   "attachments/{document_id}/{uuid}.pdf"
///
/// Why split file I/O from DB metadata?
///   - tauri-plugin-fs already handles permissions, scoping, and streaming
///   - Rust commands stay focused on data, not file transfer
///   - Frontend knows the file size/mime before calling this
#[tauri::command]
pub fn add_attachment(
    app: AppHandle,
    document_id: String,
    filename: String,
    file_path: String,
    mime_type: Option<String>,
    size_bytes: Option<i64>,
) -> Result<Attachment, String> {
    let conn = open_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mime = mime_type.unwrap_or_else(|| "application/octet-stream".to_string());
    let size = size_bytes.unwrap_or(0);

    conn.execute(
        "INSERT INTO attachments (id, document_id, filename, file_path, mime_type, size_bytes, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, document_id, filename, file_path, mime, size, now],
    )
    .map_err(|e| format!("Failed to add attachment: {e}"))?;

    Ok(Attachment {
        id,
        document_id,
        filename,
        file_path,
        mime_type: mime,
        size_bytes: size,
        created_at: now,
    })
}

/// Deletes an attachment record from the DB.
///
/// NOTE: This does NOT delete the file from disk. The frontend should handle
/// file deletion via tauri-plugin-fs before or after calling this command.
/// Keeping them separate avoids partial failure states (DB deleted but file remains,
/// or vice versa).
#[tauri::command]
pub fn delete_attachment(app: AppHandle, id: String) -> Result<(), String> {
    let conn = open_db(&app)?;

    let rows = conn
        .execute("DELETE FROM attachments WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| format!("Failed to delete attachment: {e}"))?;

    if rows == 0 {
        return Err(format!("Attachment not found: {id}"));
    }
    Ok(())
}

/// Lists all attachments for a given document.
#[tauri::command]
pub fn list_attachments(app: AppHandle, document_id: String) -> Result<Vec<Attachment>, String> {
    let conn = open_db(&app)?;

    let mut stmt = conn
        .prepare(
            "SELECT id, document_id, filename, file_path, mime_type, size_bytes, created_at
             FROM attachments WHERE document_id = ?1 ORDER BY created_at DESC",
        )
        .map_err(|e| format!("Query failed: {e}"))?;

    let rows = stmt
        .query_map(rusqlite::params![document_id], |row| {
            Ok(Attachment {
                id: row.get(0)?,
                document_id: row.get(1)?,
                filename: row.get(2)?,
                file_path: row.get(3)?,
                mime_type: row.get(4)?,
                size_bytes: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("Query failed: {e}"))?;

    let mut attachments = Vec::new();
    for row in rows {
        attachments.push(row.map_err(|e| format!("Row read failed: {e}"))?);
    }
    Ok(attachments)
}
