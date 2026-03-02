// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Each plugin must be explicitly initialized here.
        // The order matters: opener is Tauri's built-in, the rest are addons.
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::new().build())   // SQLite via JS frontend
        .plugin(tauri_plugin_fs::init())                    // File system access
        .plugin(tauri_plugin_dialog::init())                // Native save/open dialogs
        .invoke_handler(tauri::generate_handler![
            // Commands will be registered here in Step 4
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
