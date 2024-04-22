// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

use tauri::{AppHandle, Manager};

mod file_ext;

#[derive(Debug)]
pub struct Inspect {
    app: AppHandle,
    ready: bool,
    // Queued path, if there are multiple paths queued, we only care about the latest one
    queued: Option<PathBuf>,
}

impl Inspect {
    pub fn send(&mut self, path: PathBuf) {
        match self.ready {
            true => {
                self.allow_file(&path);
                self.app.emit_all("inspect", path).unwrap();
            }
            false => {
                self.queued = Some(path);
            }
        }
    }

    pub fn ready(&mut self) {
        self.ready = true;

        if let Some(path) = self.queued.take() {
            self.allow_file(&path);
            self.app.emit_all("inspect", path).unwrap();
        }
    }

    fn allow_file(&self, path: &Path) {
        self.app.fs_scope().allow_file(path).unwrap();
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let inspect = Inspect {
                app: app.handle(),
                ready: false,
                queued: None,
            };
            if let Ok(matches) = app.get_cli_matches() {
                if let Some(path) = matches.args.get("path") {
                    if let Some(path) = path.value.as_str() {
                        inspect.allow_file(Path::new(path));
                    }
                }
            }

            let inspect = Arc::new(Mutex::new(inspect));
            file_ext::load(inspect.clone());

            app.listen_global("ready", move |_| {
                (*inspect.lock().unwrap()).ready();
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
