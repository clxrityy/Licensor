use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use uuid::Uuid;

use super::open_db;
use super::templates::get_template;

// ─── Types ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct Document {
    pub id: String,
    pub template_id: String,
    pub folder_id: Option<String>,
    pub title: String,
    pub rendered_content: String,
    pub variable_values: String, // JSON object: { "year": "2026", "holder": "Acme" }
    pub created_at: String,
    pub updated_at: String,
}

/// Lightweight projection returned by FTS5 search.
/// Avoids sending full rendered_content for every result in a list view.
#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub snippet: String, // FTS5 snippet() — highlighted excerpt, not full content
    pub rank: f64,       // BM25 score (lower = more relevant)
}

// ─── Template Rendering ─────────────────────────────────────────────────────

/// Splits frontmatter from body, then runs minijinja substitution on the body
/// using the provided variable values.
///
/// Why minijinja over str::replace?
///   - Supports `{% if variable %}` conditionals for optional clauses
///   - Auto-escaping, filters, loops if needed later
///   - ~100KB overhead, but future-proofs the template engine
fn render_template_content(
    raw_content: &str,
    variables: &std::collections::HashMap<String, String>,
) -> Result<String, String> {
    // Strip frontmatter — we only render the markdown body
    let body = strip_frontmatter(raw_content);

    let mut env = minijinja::Environment::new();
    // Add the template body as an in-memory template
    env.add_template("doc", body)
        .map_err(|e| format!("Template parse error: {e}"))?;

    let tmpl = env
        .get_template("doc")
        .map_err(|e| format!("Template lookup error: {e}"))?;

    tmpl.render(minijinja::context! { ..minijinja::Value::from_serialize(variables) })
        .map_err(|e| format!("Template render error: {e}"))
}

/// Returns just the body portion of a markdown+frontmatter document.
fn strip_frontmatter(content: &str) -> &str {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return content;
    }
    let after_open = &trimmed[3..];
    match after_open.find("\n---") {
        Some(pos) => {
            let body_start = pos + 4; // skip "\n---"
            if body_start < after_open.len() {
                after_open[body_start..].trim_start_matches('\n')
            } else {
                ""
            }
        }
        None => content,
    }
}

// ─── Commands ───────────────────────────────────────────────────────────────

/// Creates a document by rendering a template with the provided variable values.
///
/// Flow:
/// 1. Fetch the template by ID
/// 2. Run minijinja substitution: body + variables → rendered markdown
/// 3. Store the rendered result in the documents table
///
/// The FTS5 triggers on `documents` auto-index the new row for search.
#[tauri::command]
pub fn create_document_from_template(
    app: AppHandle,
    template_id: String,
    title: String,
    variable_values: std::collections::HashMap<String, String>,
    folder_id: Option<String>,
) -> Result<Document, String> {
    // Fetch the source template
    let template = get_template(app.clone(), template_id.clone())?;

    // Render: substitute {{ variables }} in the template body
    let rendered = render_template_content(&template.content, &variable_values)?;

    let conn = open_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let values_json = serde_json::to_string(&variable_values)
        .map_err(|e| format!("Failed to serialize variable values: {e}"))?;

    conn.execute(
        "INSERT INTO documents (id, template_id, folder_id, title, rendered_content, variable_values, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, template_id, folder_id, title, rendered, values_json, now, now],
    )
    .map_err(|e| format!("Failed to create document: {e}"))?;

    Ok(Document {
        id,
        template_id,
        folder_id,
        title,
        rendered_content: rendered,
        variable_values: values_json,
        created_at: now.clone(),
        updated_at: now,
    })
}

/// Updates a document's title, folder, or re-renders with new variable values.
/// If variable_values is provided, re-fetches the source template and re-renders.
#[tauri::command]
pub fn update_document(
    app: AppHandle,
    id: String,
    title: String,
    folder_id: Option<String>,
    variable_values: Option<std::collections::HashMap<String, String>>,
) -> Result<Document, String> {
    let conn = open_db(&app)?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Fetch existing document to get template_id and current values
    let existing = get_document(app.clone(), id.clone())?;

    let (rendered, values_json) = match variable_values {
        Some(new_values) => {
            // Re-render from the original template with new values
            let template = get_template(app.clone(), existing.template_id.clone())?;
            let rendered = render_template_content(&template.content, &new_values)?;
            let json = serde_json::to_string(&new_values)
                .map_err(|e| format!("Failed to serialize variable values: {e}"))?;
            (rendered, json)
        }
        None => {
            // Keep existing rendered content and values
            (existing.rendered_content, existing.variable_values)
        }
    };

    conn.execute(
        "UPDATE documents SET title = ?1, folder_id = ?2, rendered_content = ?3,
         variable_values = ?4, updated_at = ?5 WHERE id = ?6",
        rusqlite::params![title, folder_id, rendered, values_json, now, id],
    )
    .map_err(|e| format!("Failed to update document: {e}"))?;

    Ok(Document {
        id,
        template_id: existing.template_id,
        folder_id,
        title,
        rendered_content: rendered,
        variable_values: values_json,
        created_at: existing.created_at,
        updated_at: now,
    })
}

#[tauri::command]
pub fn delete_document(app: AppHandle, id: String) -> Result<(), String> {
    let conn = open_db(&app)?;

    let rows = conn
        .execute("DELETE FROM documents WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| format!("Failed to delete document: {e}"))?;

    if rows == 0 {
        return Err(format!("Document not found: {id}"));
    }
    Ok(())
}

#[tauri::command]
pub fn list_documents(
    app: AppHandle,
    folder_id: Option<String>,
) -> Result<Vec<Document>, String> {
    let conn = open_db(&app)?;
    let mut docs = Vec::new();

    match folder_id {
        Some(fid) => {
            let mut stmt = conn
                .prepare(
                    "SELECT id, template_id, folder_id, title, rendered_content,
                            variable_values, created_at, updated_at
                     FROM documents WHERE folder_id = ?1 ORDER BY updated_at DESC",
                )
                .map_err(|e| format!("Query prepare failed: {e}"))?;

            let rows = stmt
                .query_map(rusqlite::params![fid], row_to_document)
                .map_err(|e| format!("Query failed: {e}"))?;

            for row in rows {
                docs.push(row.map_err(|e| format!("Row read failed: {e}"))?);
            }
        }
        None => {
            let mut stmt = conn
                .prepare(
                    "SELECT id, template_id, folder_id, title, rendered_content,
                            variable_values, created_at, updated_at
                     FROM documents ORDER BY updated_at DESC",
                )
                .map_err(|e| format!("Query prepare failed: {e}"))?;

            let rows = stmt
                .query_map([], row_to_document)
                .map_err(|e| format!("Query failed: {e}"))?;

            for row in rows {
                docs.push(row.map_err(|e| format!("Row read failed: {e}"))?);
            }
        }
    }

    Ok(docs)
}

/// Shared row mapper — avoids repeating the same 8-column extraction.
fn row_to_document(row: &rusqlite::Row) -> rusqlite::Result<Document> {
    Ok(Document {
        id: row.get(0)?,
        template_id: row.get(1)?,
        folder_id: row.get(2)?,
        title: row.get(3)?,
        rendered_content: row.get(4)?,
        variable_values: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

#[tauri::command]
pub fn get_document(app: AppHandle, id: String) -> Result<Document, String> {
    let conn = open_db(&app)?;

    conn.query_row(
        "SELECT id, template_id, folder_id, title, rendered_content,
                variable_values, created_at, updated_at
         FROM documents WHERE id = ?1",
        rusqlite::params![id],
        row_to_document,
    )
    .map_err(|e| format!("Document not found: {e}"))
}

/// Full-text search across documents using FTS5.
///
/// How FTS5 works here:
/// - `document_fts` is a virtual table that mirrors `documents.title` and `rendered_content`
/// - It's kept in sync by INSERT/UPDATE/DELETE triggers on the `documents` table
/// - `MATCH ?1` runs a BM25-ranked search against the FTS index
/// - `snippet()` returns a highlighted excerpt (marks matches with <b> tags)
/// - `rank` is the BM25 score — lower (more negative) = more relevant
#[tauri::command]
pub fn search_documents(app: AppHandle, query: String) -> Result<Vec<SearchResult>, String> {
    let conn = open_db(&app)?;

    let mut stmt = conn
        .prepare(
            "SELECT d.id, d.title,
                    snippet(document_fts, 1, '<b>', '</b>', '...', 32) AS snippet,
                    document_fts.rank
             FROM document_fts
             JOIN documents d ON d.rowid = document_fts.rowid
             WHERE document_fts MATCH ?1
             ORDER BY document_fts.rank
             LIMIT 50",
        )
        .map_err(|e| format!("Search query failed: {e}"))?;

    let rows = stmt
        .query_map(rusqlite::params![query], |row| {
            Ok(SearchResult {
                id: row.get(0)?,
                title: row.get(1)?,
                snippet: row.get(2)?,
                rank: row.get(3)?,
            })
        })
        .map_err(|e| format!("Search failed: {e}"))?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| format!("Row read failed: {e}"))?);
    }

    Ok(results)
}
