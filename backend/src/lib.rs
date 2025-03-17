use std::path::Path;

use inspect::Inspect;
use tauri_plugin_cli::CliExt;

mod editor;
mod file_ext;
mod inspect;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let inspect = Inspect::new(app.handle().clone())?;
            if let Ok(matches) = app.cli().matches() {
                if let Some(path) = matches.args.get("path") {
                    if let Some(path) = path.value.as_str() {
                        inspect.allow_file(Path::new(path));
                    }
                }
            }

            file_ext::load(inspect);

            Ok(())
        })
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![editor::c2pa_report])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
