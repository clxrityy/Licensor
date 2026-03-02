use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use uuid::Uuid;

use super::open_db;

// ─── Types ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct Folder {
    pub id: String,
    pub parent_id: Option<String>, // None = root-level folder
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
}

// ─── Commands ───────────────────────────────────────────────────────────────

/// Creates a new folder. If parent_id is None, it's a root-level folder.
/// Nested folders work via self-referential FK: parent_id → folders.id.
/// The schema has ON DELETE CASCADE, so deleting a parent nukes all children.
#[tauri::command]
pub fn create_folder(
    app: AppHandle,
    name: String,
    parent_id: Option<String>,
) -> Result<Folder, String> {
    let conn = open_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "INSERT INTO folders (id, parent_id, name, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, parent_id, name, now, now],
    )
    .map_err(|e| format!("Failed to create folder: {e}"))?;

    Ok(Folder {
        id,
        parent_id,
        name,
        created_at: now.clone(),
        updated_at: now,
    })
}

/// Renames a folder. Only touches name + updated_at.
#[tauri::command]
pub fn rename_folder(app: AppHandle, id: String, name: String) -> Result<(), String> {
    let conn = open_db(&app)?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let rows = conn
        .execute(
            "UPDATE folders SET name = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![name, now, id],
        )
        .map_err(|e| format!("Failed to rename folder: {e}"))?;

    if rows == 0 {
        return Err(format!("Folder not found: {id}"));
    }
    Ok(())
}

/// Deletes a folder by ID.
/// CASCADE behavior:
///   - Child folders are deleted (ON DELETE CASCADE on parent_id)
///   - Templates in this folder get folder_id = NULL (ON DELETE SET NULL)
///   - Documents in this folder get folder_id = NULL (ON DELETE SET NULL)
///
/// This is intentional: deleting a folder shouldn't destroy user content,
/// it just "un-files" templates and documents back to the root level.
#[tauri::command]
pub fn delete_folder(app: AppHandle, id: String) -> Result<(), String> {
    let conn = open_db(&app)?;

    let rows = conn
        .execute("DELETE FROM folders WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| format!("Failed to delete folder: {e}"))?;

    if rows == 0 {
        return Err(format!("Folder not found: {id}"));
    }
    Ok(())
}

/// Lists the contents of a folder (or root if parent_id is None).
/// Returns child folders — templates and documents are listed by their own commands
/// with a folder_id filter.
///
/// For the FolderTree component, the frontend calls this recursively
/// starting from parent_id = NULL to build the full tree.
#[tauri::command]
pub fn list_folder_contents(
    app: AppHandle,
    parent_id: Option<String>,
) -> Result<Vec<Folder>, String> {
    let conn = open_db(&app)?;
    let mut folders = Vec::new();

    // SQLite quirk: `WHERE parent_id = NULL` doesn't work (NULL != NULL).
    // Must use `IS NULL` for root-level folders, `= ?1` for nested.
    match parent_id {
        Some(pid) => {
            let mut stmt = conn
                .prepare(
                    "SELECT id, parent_id, name, created_at, updated_at
                     FROM folders WHERE parent_id = ?1 ORDER BY name",
                )
                .map_err(|e| format!("Query failed: {e}"))?;

            let rows = stmt
                .query_map(rusqlite::params![pid], row_to_folder)
                .map_err(|e| format!("Query failed: {e}"))?;

            for row in rows {
                folders.push(row.map_err(|e| format!("Row read failed: {e}"))?);
            }
        }
        None => {
            let mut stmt = conn
                .prepare(
                    "SELECT id, parent_id, name, created_at, updated_at
                     FROM folders WHERE parent_id IS NULL ORDER BY name",
                )
                .map_err(|e| format!("Query failed: {e}"))?;

            let rows = stmt
                .query_map([], row_to_folder)
                .map_err(|e| format!("Query failed: {e}"))?;

            for row in rows {
                folders.push(row.map_err(|e| format!("Row read failed: {e}"))?);
            }
        }
    }

    Ok(folders)
}

fn row_to_folder(row: &rusqlite::Row) -> rusqlite::Result<Folder> {
    Ok(Folder {
        id: row.get(0)?,
        parent_id: row.get(1)?,
        name: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
    })
}
