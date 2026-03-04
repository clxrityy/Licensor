mod commands;
mod seed;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        // No .setup() — seeding now happens frontend-side after migrations
        .invoke_handler(tauri::generate_handler![
            // Templates
            commands::templates::create_template,
            commands::templates::update_template,
            commands::templates::delete_template,
            commands::templates::list_templates,
            commands::templates::get_template,
            commands::templates::clone_template,
            // Documents
            commands::documents::create_document_from_template,
            commands::documents::update_document,
            commands::documents::delete_document,
            commands::documents::list_documents,
            commands::documents::get_document,
            commands::documents::search_documents,
            // Folders
            commands::folders::create_folder,
            commands::folders::rename_folder,
            commands::folders::delete_folder,
            commands::folders::list_folder_contents,
            // Attachments
            commands::attachments::add_attachment,
            commands::attachments::delete_attachment,
            commands::attachments::list_attachments,
            // Metadata
            commands::metadata::set_metadata,
            commands::metadata::get_metadata,
            commands::metadata::delete_metadata,
            // Export
            commands::export::export_document,
            // Preview
            commands::preview::render_preview,
            // Seed
            seed::load_bundled_templates,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
