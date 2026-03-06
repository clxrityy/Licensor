use tauri::AppHandle;

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
        _ => Err(format!("Unsupported export format: {format}. Use \"md\" or \"txt\".")),
    }
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
    let result = result
        .replace("**", "")
        .replace("__", "");

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
                    if let Some(close_paren) = chars[close_idx + 2..].iter().position(|&c| c == ')') {
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
