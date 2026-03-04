// app/src/commands/preview.rs
// Renders markdown content to HTML for in-app preview,
// stripping YAML frontmatter so it never appears in the preview pane.

use comrak::{markdown_to_html, Options};

/// Strips YAML frontmatter (content between opening and closing `---` delimiters)
/// from a markdown string, returning only the body.
///
/// Reused pattern from documents.rs — could be extracted to a shared util,
/// but keeping it local avoids cross-module coupling for a 15-line function.
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

/// Tauri command: converts markdown to HTML for the preview pane.
///
/// Steps:
///   1. Strip YAML frontmatter (if present)
///   2. Render remaining markdown body → HTML via comrak
///
/// Called by TemplateEditor (raw content with frontmatter) and
/// DocumentView (rendered content, frontmatter already stripped — harmless no-op).
#[tauri::command]
pub fn render_preview(markdown: String) -> Result<String, String> {
    let body = strip_frontmatter(&markdown);

    // comrak Options::default() enables standard CommonMark features.
    // No unsafe HTML passthrough — keeps preview sandboxed.
    let html = markdown_to_html(body, &Options::default());
    Ok(html)
}
