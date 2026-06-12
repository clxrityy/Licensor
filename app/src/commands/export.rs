use std::io::Write;

use serde_json::json;
use tauri::{AppHandle, Manager};

use zip::write::SimpleFileOptions;
use zip::CompressionMethod;

use super::open_db;

// ─── Commands ───────────────────────────────────────────────────────────────

// Exports a document's rendered content as either markdown or plain text.
// `document_id` intentionally matches the frontend's `documentId` payload via
// Tauri's snake_case <-> camelCase argument mapping.
#[tauri::command]
pub fn export_document(
    app: AppHandle,
    document_id: String,
    format: String,
) -> Result<String, String> {
    let conn = open_db(&app)?;

    let rendered: String = conn
        .query_row(
            "SELECT rendered_content FROM documents WHERE id = ?1",
            rusqlite::params![document_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Document not found: {e}"))?;

    match format.as_str() {
        "md" => Ok(rendered),
        "txt" => Ok(strip_markdown(&rendered)),
        _ => Err(format!(
            "Unsupported export format: {format}. Use \"md\" or \"txt\"."
        )),
    }
}

#[tauri::command]
pub fn export_document_bundle(app: AppHandle, document_id: String) -> Result<Vec<u8>, String> {
    let conn = open_db(&app)?;

    //
    // Document
    //
    let (title, rendered_content): (String, String) = conn
        .query_row(
            "SELECT title, rendered_content
             FROM documents
             WHERE id = ?1",
            rusqlite::params![document_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Document not found: {e}"))?;

    //
    // Metadata
    //
    let mut metadata_stmt = conn
        .prepare(
            "SELECT id, document_id, key, value
             FROM document_metadata
             WHERE document_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let metadata_rows = metadata_stmt
        .query_map(rusqlite::params![document_id], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "document_id": row.get::<_, String>(1)?,
                "key": row.get::<_, String>(2)?,
                "value": row.get::<_, String>(3)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut metadata = Vec::new();

    for row in metadata_rows {
        metadata.push(row.map_err(|e| e.to_string())?);
    }

    //
    // Attachments
    //
    let mut attachment_stmt = conn
        .prepare(
            "SELECT filename, file_path
             FROM attachments
             WHERE document_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let attachment_rows = attachment_stmt
        .query_map(rusqlite::params![document_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;

    //
    // ZIP
    //
    let cursor = std::io::Cursor::new(Vec::<u8>::new());

    let mut zip = zip::ZipWriter::new(cursor);

    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);

    //
    // LICENSE.md
    //
    zip.start_file("LICENSE.md", options)
        .map_err(|e| e.to_string())?;

    zip.write_all(rendered_content.as_bytes())
        .map_err(|e| e.to_string())?;

    //
    // LICENSE.txt
    //
    zip.start_file("LICENSE.txt", options)
        .map_err(|e| e.to_string())?;

    zip.write_all(strip_markdown(&rendered_content).as_bytes())
        .map_err(|e| e.to_string())?;

    //
    // metadata.json
    //
    zip.start_file("metadata.json", options)
        .map_err(|e| e.to_string())?;

    let metadata_json = serde_json::to_vec_pretty(&metadata).map_err(|e| e.to_string())?;

    zip.write_all(&metadata_json).map_err(|e| e.to_string())?;

    //
    // document.json
    //
    zip.start_file("document.json", options)
        .map_err(|e| e.to_string())?;

    let document_json = serde_json::to_vec_pretty(&json!({
        "id": document_id,
        "title": title,
        "schemaVersion": 1
    }))
    .map_err(|e| e.to_string())?;

    zip.write_all(&document_json).map_err(|e| e.to_string())?;

    //
    // attachments
    //
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    for row in attachment_rows {
        let (filename, relative_path) = row.map_err(|e| e.to_string())?;

        let safe_name = sanitize_filename(&filename);

        let file_path = app_data_dir.join(&relative_path);

        let canonical = file_path.canonicalize().map_err(|e| e.to_string())?;

        let canonical_root = app_data_dir.canonicalize().map_err(|e| e.to_string())?;

        if !canonical.starts_with(&canonical_root) {
            return Err(format!("Invalid attachment path: {}", relative_path));
        }

        if !file_path.exists() {
            continue;
        }

        let bytes = std::fs::read(&file_path).map_err(|e| e.to_string())?;

        zip.start_file(format!("attachments/{safe_name}"), options)
            .map_err(|e| e.to_string())?;

        zip.write_all(&bytes).map_err(|e| e.to_string())?;
    }

    let cursor = zip.finish().map_err(|e| e.to_string())?;

    Ok(cursor.into_inner())
}

/// Naive markdown stripping for plain text export.
/// Removes common markdown syntax: headers, bold, italic, links, images, code fences.
///
/// This is intentionally simple — licenses are mostly plain text with minimal
/// formatting. For complex markdown, consider using comrak to parse the AST
/// and extract text nodes, but that's overkill here.
fn strip_markdown(md: &str) -> String {
    let mut result = String::with_capacity(md.len());
    let mut in_code_fence = false;

    for line in md.lines() {
        let trimmed = line.trim();

        // Toggle code fence state (``` blocks)
        if trimmed.starts_with("```") {
            in_code_fence = !in_code_fence;
            continue;
        }

        // Skip code fence contents
        if in_code_fence {
            result.push_str(line);
            result.push('\n');
            continue;
        }

        // Strip header markers: "## Title" → "Title"
        let line = if trimmed.starts_with('#') {
            trimmed.trim_start_matches('#').trim_start()
        } else {
            line
        };

        result.push_str(line);
        result.push('\n');
    }

    // Strip inline markdown: **bold**, *italic*, [text](url), ![alt](url)
    let result = result.replace("**", "").replace("__", "");

    // Strip links: [text](url) → text
    strip_links(&result)
}

/// Converts markdown links `[text](url)` → `text`.
/// Also handles images `![alt](url)` → `alt`.
fn strip_links(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let chars: Vec<char> = text.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        // Detect ![ or [
        if chars[i] == '[' || (chars[i] == '!' && i + 1 < chars.len() && chars[i + 1] == '[') {
            let start = if chars[i] == '!' { i + 2 } else { i + 1 };

            // Find closing ]
            if let Some(close_bracket) = chars[start..].iter().position(|&c| c == ']') {
                let close_idx = start + close_bracket;

                // Check for (url) immediately after ]
                if close_idx + 1 < chars.len() && chars[close_idx + 1] == '(' {
                    if let Some(close_paren) = chars[close_idx + 2..].iter().position(|&c| c == ')')
                    {
                        // Extract just the link text, skip the URL
                        let link_text: String = chars[start..close_idx].iter().collect();
                        result.push_str(&link_text);
                        i = close_idx + 2 + close_paren + 1;
                        continue;
                    }
                }
            }
        }

        result.push(chars[i]);
        i += 1;
    }

    result
}

/// Sanitizes a filename by replacing invalid characters with underscores.
/// This is used when exporting documents to ensure the filename is valid across platforms.
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c,
        })
        .collect()
}
