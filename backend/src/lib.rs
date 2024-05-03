use std::{
    error::Error,
    mem,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

use tauri::{AppHandle, Manager};
use tauri_plugin_cli::CliExt;
use tauri_plugin_fs::FsExt;

mod file_ext;

#[derive(Debug)]
pub struct Inspect {
    app: AppHandle,
    ready: bool,
    // Queued path, if there are multiple paths queued, we only care about the latest one
    queued: Option<PathBuf>,
    // Errors passed to the client to be displayed (or logged)
    errors: Vec<String>,
}

impl Inspect {
    pub fn send(&mut self, path: PathBuf) -> tauri::Result<()> {
        match self.ready {
            true => {
                self.allow_file(&path);
                self.app.emit("inspect", path)?;
            }
            false => {
                self.queued = Some(path);
            }
        }

        Ok(())
    }

    pub fn ready(&mut self) -> tauri::Result<()> {
        self.ready = true;

        if let Some(path) = self.queued.take() {
            self.allow_file(&path);
            self.app.emit("inspect", path)?;

            // No longer using self.errors, so clear out the allocation
            for error in mem::take(&mut self.errors) {
                self.error_string(error);
            }
        }

        Ok(())
    }

    pub fn error_string(&mut self, error: String) {
        match self.ready {
            true => {
                // TODO: if this errors, save to log file, ignore result for now
                let _ = self.app.emit("error", error);
            }
            false => {
                self.errors.push(error);
            }
        }
    }

    pub fn error<T: Error>(&mut self, err: T) {
        self.error_string(err.to_string());
    }

    fn allow_file(&self, path: &Path) {
        self.app.fs_scope().allow_file(path);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let inspect = Inspect {
                app: app.handle().clone(),
                ready: false,
                queued: None,
                errors: Vec::new(),
            };
            if let Ok(matches) = app.cli().matches() {
                if let Some(path) = matches.args.get("path") {
                    if let Some(path) = path.value.as_str() {
                        inspect.allow_file(Path::new(path));
                    }
                }
            }

            let inspect = Arc::new(Mutex::new(inspect));
            file_ext::load(inspect.clone());

            app.listen_any("ready", move |_| {
                let mut inspect = inspect.lock().unwrap();
                if let Err(err) = inspect.ready() {
                    inspect.error(err);
                }
            });

            Ok(())
        })
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
