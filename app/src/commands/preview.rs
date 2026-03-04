// app/src/commands/preview.rs
// Renders markdown content to HTML for in-app preview,
// stripping YAML frontmatter so it never appears in the preview pane.

use comrak::{markdown_to_html, Options};
use regex::Regex;

/// Strips YAML frontmatter (content between opening and closing `---` delimiters)
/// from a markdown string, returning only the body.
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

/// Wraps Jinja-style `{{ variable }}` placeholders in a styled span
/// so they're visually distinct in the preview.
fn highlight_variables(html: &str) -> String {
    let re = Regex::new(r"\{\{\s*(\w+)\s*\}\}").unwrap();

    re.replace_all(html, |caps: &regex::Captures| {
        let var_name = &caps[1];
        format!(
            r#"<span class="template-variable" style="background:#fef3c7;border:1px solid #fcd34d;border-radius:3px;padding:0 4px;font-family:monospace;font-size:0.9em;color:#92400e;">{{{{{}}}}}</span>"#,
            var_name
        )
    }).to_string()
}

/// Tauri command: converts markdown to HTML for the preview pane.
///
/// Steps:
///   1. Strip YAML frontmatter (if present)
///   2. Render remaining markdown body → HTML via comrak (with hardbreaks)
///   3. Highlight {{ variable }} placeholders with styled spans
#[tauri::command]
pub fn render_preview(markdown: String) -> Result<String, String> {
    let body = strip_frontmatter(&markdown);

    // Configure comrak to treat single newlines as <br> tags.
    // This matches user expectation that pressing Enter = new line in preview.
    let mut options = Options::default();
    options.render.hardbreaks = true;  // <-- Single \n becomes <br>

    let html = markdown_to_html(body, &options);
    let highlighted = highlight_variables(&html);

    Ok(highlighted)
}
