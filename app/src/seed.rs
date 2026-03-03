// app/src/seed.rs
// Reads bundled template files from the resource directory.
// Returns raw file contents to the frontend for insertion after migrations.

use std::fs;
use serde::Serialize;
use tauri::Manager;

#[derive(Debug, Serialize)]
pub struct BundledTemplate {
    pub filename: String,
    pub content: String,
}

/// Returns the raw content of all bundled .md template files.
/// Frontend handles parsing frontmatter and inserting into SQLite.
#[tauri::command]
pub fn load_bundled_templates(app: tauri::AppHandle) -> Result<Vec<BundledTemplate>, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to resolve resource dir: {e}"))?;

    let templates_dir = resource_dir.join("templates");

    if !templates_dir.exists() {
        return Ok(vec![]);
    }

    let mut templates = Vec::new();

    let entries = fs::read_dir(&templates_dir)
        .map_err(|e| format!("Failed to read templates dir: {e}"))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Dir entry error: {e}"))?;
        let path = entry.path();

        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }

        let filename = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown.md")
            .to_string();

        let content = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read {:?}: {e}", path))?;

        templates.push(BundledTemplate { filename, content });
    }

    Ok(templates)
}
