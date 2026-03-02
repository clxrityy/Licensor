use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use uuid::Uuid;

use super::open_db;

// ─── Types ──────────────────────────────────────────────────────────────────

/// Mirrors the `templates` table row.
/// Serde derives let Tauri auto-serialize this to JSON when returned from commands.
#[derive(Debug, Serialize, Deserialize)]
pub struct Template {
    pub id: String,
    pub folder_id: Option<String>,
    pub name: String,
    pub content: String,
    pub variables: String, // JSON string — parsed on the frontend into TemplateVariable[]
    pub created_at: String,
    pub updated_at: String,
}

/// A single variable definition parsed from the template's YAML frontmatter.
/// Used internally during create/update to extract and validate variables.
#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateVariable {
    pub name: String,
    pub label: String,
    #[serde(rename = "type", default = "default_var_type")]
    pub var_type: String,
    pub default: Option<String>,
    pub required: Option<bool>,
}

fn default_var_type() -> String {
    "text".to_string()
}

/// The frontmatter block parsed from YAML between `---` delimiters.
/// Only the `variables` field is required — name/description are optional metadata.
#[derive(Debug, Deserialize)]
struct Frontmatter {
    #[allow(dead_code)]
    name: Option<String>,
    #[allow(dead_code)]
    description: Option<String>,
    #[serde(default)]
    variables: Vec<TemplateVariable>,
}

// ─── Frontmatter Parsing ────────────────────────────────────────────────────

/// Extracts YAML frontmatter from raw markdown content.
/// Looks for content between the first `---` and the next `---`.
///
/// Returns (frontmatter_yaml, body_without_frontmatter).
/// If no frontmatter found, returns (None, original_content).
fn split_frontmatter(content: &str) -> (Option<&str>, &str) {
    let trimmed = content.trim_start();

    // Frontmatter must start at the very beginning of the document
    if !trimmed.starts_with("---") {
        return (None, content);
    }

    // Find the closing `---` delimiter (skip the opening one)
    let after_open = &trimmed[3..];
    if let Some(close_pos) = after_open.find("\n---") {
        let yaml = after_open[..close_pos].trim();
        // +4 to skip past the closing "---" plus newline
        let body_start = close_pos + 4;
        let body = if body_start < after_open.len() {
            after_open[body_start..].trim_start_matches('\n')
        } else {
            ""
        };
        (Some(yaml), body)
    } else {
        // Opening `---` found but no closing — treat entire content as body
        (None, content)
    }
}

/// Parses the YAML frontmatter and extracts variable definitions.
/// Returns the variables as a JSON string for DB storage.
fn extract_variables(content: &str) -> Result<String, String> {
    let (yaml, _body) = split_frontmatter(content);

    let variables = match yaml {
        Some(yaml_str) => {
            let fm: Frontmatter = serde_yaml::from_str(yaml_str)
                .map_err(|e| format!("Invalid frontmatter YAML: {e}"))?;
            fm.variables
        }
        None => Vec::new(), // No frontmatter = no variables
    };

    serde_json::to_string(&variables)
        .map_err(|e| format!("Failed to serialize variables: {e}"))
}

// ─── Commands ───────────────────────────────────────────────────────────────

/// Creates a new template from raw markdown content (with optional YAML frontmatter).
/// Parses the frontmatter to extract variable definitions, stores everything in DB.
#[tauri::command]
pub fn create_template(
    app: AppHandle,
    name: String,
    content: String,
    folder_id: Option<String>,
) -> Result<Template, String> {
    let conn = open_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let variables_json = extract_variables(&content)?;

    conn.execute(
        "INSERT INTO templates (id, folder_id, name, content, variables, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, folder_id, name, content, variables_json, now, now],
    )
    .map_err(|e| format!("Failed to create template: {e}"))?;

    Ok(Template {
        id,
        folder_id,
        name,
        content,
        variables: variables_json,
        created_at: now.clone(),
        updated_at: now,
    })
}

/// Updates an existing template's name, content, and/or folder.
/// Re-parses frontmatter to refresh the variables JSON — if the user changed
/// the variable definitions, the stored list stays in sync.
#[tauri::command]
pub fn update_template(
    app: AppHandle,
    id: String,
    name: String,
    content: String,
    folder_id: Option<String>,
) -> Result<Template, String> {
    let conn = open_db(&app)?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let variables_json = extract_variables(&content)?;

    let rows_affected = conn
        .execute(
            "UPDATE templates SET name = ?1, content = ?2, variables = ?3,
             folder_id = ?4, updated_at = ?5 WHERE id = ?6",
            rusqlite::params![name, content, variables_json, folder_id, now, id],
        )
        .map_err(|e| format!("Failed to update template: {e}"))?;

    if rows_affected == 0 {
        return Err(format!("Template not found: {id}"));
    }

    Ok(Template {
        id,
        folder_id,
        name,
        content,
        variables: variables_json,
        created_at: String::new(), // Not re-fetched; frontend can use cached value
        updated_at: now,
    })
}

/// Deletes a template by ID.
/// Will fail if any documents reference this template (ON DELETE RESTRICT).
#[tauri::command]
pub fn delete_template(app: AppHandle, id: String) -> Result<(), String> {
    let conn = open_db(&app)?;

    let rows_affected = conn
        .execute("DELETE FROM templates WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| format!("Failed to delete template: {e}"))?;

    if rows_affected == 0 {
        return Err(format!("Template not found: {id}"));
    }

    Ok(())
}

/// Returns all templates, optionally filtered by folder_id.
/// If folder_id is None, returns ALL templates across all folders.
#[tauri::command]
pub fn list_templates(
    app: AppHandle,
    folder_id: Option<String>,
) -> Result<Vec<Template>, String> {
    let conn = open_db(&app)?;

    let mut templates = Vec::new();

    // Dynamic query: filter by folder if specified, otherwise return all.
    // Using two separate queries avoids SQL injection and keeps the types clean.
    match folder_id {
        Some(fid) => {
            let mut stmt = conn
                .prepare(
                    "SELECT id, folder_id, name, content, variables, created_at, updated_at
                     FROM templates WHERE folder_id = ?1 ORDER BY name",
                )
                .map_err(|e| format!("Query prepare failed: {e}"))?;

            let rows = stmt
                .query_map(rusqlite::params![fid], |row| {
                    Ok(Template {
                        id: row.get(0)?,
                        folder_id: row.get(1)?,
                        name: row.get(2)?,
                        content: row.get(3)?,
                        variables: row.get(4)?,
                        created_at: row.get(5)?,
                        updated_at: row.get(6)?,
                    })
                })
                .map_err(|e| format!("Query failed: {e}"))?;

            for row in rows {
                templates.push(row.map_err(|e| format!("Row read failed: {e}"))?);
            }
        }
        None => {
            let mut stmt = conn
                .prepare(
                    "SELECT id, folder_id, name, content, variables, created_at, updated_at
                     FROM templates ORDER BY name",
                )
                .map_err(|e| format!("Query prepare failed: {e}"))?;

            let rows = stmt
                .query_map([], |row| {
                    Ok(Template {
                        id: row.get(0)?,
                        folder_id: row.get(1)?,
                        name: row.get(2)?,
                        content: row.get(3)?,
                        variables: row.get(4)?,
                        created_at: row.get(5)?,
                        updated_at: row.get(6)?,
                    })
                })
                .map_err(|e| format!("Query failed: {e}"))?;

            for row in rows {
                templates.push(row.map_err(|e| format!("Row read failed: {e}"))?);
            }
        }
    }

    Ok(templates)
}

/// Fetches a single template by ID.
#[tauri::command]
pub fn get_template(app: AppHandle, id: String) -> Result<Template, String> {
    let conn = open_db(&app)?;

    conn.query_row(
        "SELECT id, folder_id, name, content, variables, created_at, updated_at
         FROM templates WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok(Template {
                id: row.get(0)?,
                folder_id: row.get(1)?,
                name: row.get(2)?,
                content: row.get(3)?,
                variables: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    )
    .map_err(|e| format!("Template not found: {e}"))
}

/// Clones an existing template: copies the raw content with a new UUID
/// and appends " (Copy)" to the name. User edits from there.
///
/// This preserves template integrity — originals are never modified,
/// users customize by cloning.
#[tauri::command]
pub fn clone_template(app: AppHandle, id: String) -> Result<Template, String> {
    // Fetch the original
    let original = get_template(app.clone(), id)?;

    // Create the clone with a modified name
    let clone_name = format!("{} (Copy)", original.name);

    create_template(app, clone_name, original.content, original.folder_id)
}
