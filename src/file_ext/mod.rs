#[cfg(target_os = "macos")]
#[path = "finder.rs"]
mod platform;

#[cfg(not(target_os = "macos"))]
mod platform {
    use crate::Inspect;
    use std::sync::{Arc, Mutex};
    pub fn load(_inspect: Arc<Mutex<Inspect>>) {}
}

pub use platform::*;
