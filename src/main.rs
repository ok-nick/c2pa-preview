// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    fs::{self, File},
    io::Write,
    path::PathBuf,
    sync::{Arc, Mutex},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

mod file_ext;

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Config {
    #[serde(default)]
    file_manager_extension: bool,
}

impl Config {
    pub fn load(mut path: PathBuf) -> Result<Config, ()> {
        fs::create_dir_all(&path).unwrap();

        path.push("c2pa-preview.toml");
        if !path.exists() {
            let mut file = File::create(&path).unwrap();
            let config = Config::default();
            file.write_all(toml::to_string(&config).unwrap().as_bytes())
                .unwrap();
            Ok(config)
        } else {
            Ok(toml::from_str(&fs::read_to_string(path).unwrap()).unwrap())
        }
    }
}

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
            self.app.emit_all("inspect", path).unwrap();
        }
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // TODO: returns none if unsupported platform
            let config = Config::load(app.path_resolver().app_config_dir().unwrap()).unwrap();
            let inspect = Arc::new(Mutex::new(Inspect {
                app: app.handle(),
                ready: false,
                queued: None,
            }));

            if config.file_manager_extension {
                file_ext::load(inspect.clone());
            } else {
                file_ext::unload();
            }

            app.listen_global("ready", move |_| {
                (*inspect.lock().unwrap()).ready();
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
