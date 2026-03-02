use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use uuid::Uuid;

use super::open_db;

// ─── Types ──────────────────────────────────────────────────────────────────

/// Free-form key/value annotation on a document.
/// Use for tags, notes, custom fields — intentionally schema-less.
///
/// Design choice: key/value rows instead of a single JSON column because:
///   - Individual keys can be queried/indexed by SQLite
///   - No need to parse/rewrite a JSON blob for single-key updates
///   - Simpler conflict resolution if multiple operations touch different keys
#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentMetadata {
    pub id: String,
    pub document_id: String,
    pub key: String,
    pub value: String,
}

// ─── Commands ───────────────────────────────────────────────────────────────

/// Sets a metadata key/value pair on a document.
/// If the key already exists for this document, it updates the value (upsert).
/// This prevents duplicate keys without requiring the frontend to check first.
#[tauri::command]
pub fn set_metadata(
    app: AppHandle,
    document_id: String,
    key: String,
    value: String,
) -> Result<DocumentMetadata, String> {
    let conn = open_db(&app)?;

    // Check if this key already exists for this document
    let existing_id: Option<String> = conn
        .query_row(
            "SELECT id FROM document_metadata WHERE document_id = ?1 AND key = ?2",
            rusqlite::params![document_id, key],
            |row| row.get(0),
        )
        .ok(); // .ok() converts NotFound error to None — cleaner than matching

    let id = match existing_id {
        Some(eid) => {
            // Update existing
            conn.execute(
                "UPDATE document_metadata SET value = ?1 WHERE id = ?2",
                rusqlite::params![value, eid],
            )
            .map_err(|e| format!("Failed to update metadata: {e}"))?;
            eid
        }
        None => {
            // Insert new
            let new_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO document_metadata (id, document_id, key, value)
                 VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![new_id, document_id, key, value],
            )
            .map_err(|e| format!("Failed to set metadata: {e}"))?;
            new_id
        }
    };

    Ok(DocumentMetadata {
        id,
        document_id,
        key,
        value,
    })
}

/// Gets a single metadata value by document_id + key.
#[tauri::command]
pub fn get_metadata(
    app: AppHandle,
    document_id: String,
    key: String,
) -> Result<DocumentMetadata, String> {
    let conn = open_db(&app)?;

    conn.query_row(
        "SELECT id, document_id, key, value FROM document_metadata
         WHERE document_id = ?1 AND key = ?2",
        rusqlite::params![document_id, key],
        |row| {
            Ok(DocumentMetadata {
                id: row.get(0)?,
                document_id: row.get(1)?,
                key: row.get(2)?,
                value: row.get(3)?,
            })
        },
    )
    .map_err(|e| format!("Metadata not found: {e}"))
}

/// Deletes a metadata entry by ID.
#[tauri::command]
pub fn delete_metadata(app: AppHandle, id: String) -> Result<(), String> {
    let conn = open_db(&app)?;

    let rows = conn
        .execute(
            "DELETE FROM document_metadata WHERE id = ?1",
            rusqlite::params![id],
        )
        .map_err(|e| format!("Failed to delete metadata: {e}"))?;

    if rows == 0 {
        return Err(format!("Metadata entry not found: {id}"));
    }
    Ok(())
}
