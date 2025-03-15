use objc2::{
    define_class, msg_send, rc::Retained, AllocAnyThread, DeclaredClass, MainThreadMarker,
};
use objc2_app_kit::{
    NSApplication, NSPasteboard, NSPasteboardTypeFileURL, NSUpdateDynamicServices,
};
use objc2_foundation::{NSError, NSObject, NSString, NSURL};

use std::{
    ffi::CStr,
    path::PathBuf,
    str,
    sync::{Arc, Mutex},
};

use crate::Inspect;

define_class!(
    #[unsafe(super(NSObject))]
    #[name = "ContextMenu"]
    #[ivars = Arc<Mutex<Inspect>>]
    struct ContextMenu;

    impl ContextMenu {
        #[unsafe(method(inspectCredentialsWithPasteboard:userData:error:))]
        fn inspect_credentials(
            &self,
            pasteboard: *mut NSPasteboard,
            _user_data: *mut NSString,
            _error: *mut *mut NSError
        ) {
            unsafe {
                let mut inspect = self.ivars().lock().unwrap();
                // TODO: there's got to be a better way to do this
                match (*pasteboard).stringForType(NSPasteboardTypeFileURL) {
                    Some(path) => {
                        match NSURL::fileURLWithPath(&path).standardizedURL() {
                            Some(path) => {
                                match path.path() {
                                    Some(path) => {
                                        let path = CStr::from_ptr(path.UTF8String());
                                        match str::from_utf8(path.to_bytes()) {
                                            Ok(path) => {
                                                // TODO: set window pos to the current mouse pos?

                                                // TODO: maybe open a new window with path?
                                                if let Err(err) = inspect.send(PathBuf::from(path)) {
                                                    inspect.error(err);
                                                }
                                            }
                                            Err(err) => {
                                                inspect.error(err);
                                            }
                                        }
                                    }
                                    None => inspect.error_string("Failed to read path from context menu because: path does not conform to RFC 1808 or the file no longer exists".to_owned())
                                }
                            }
                            None => inspect.error_string("Failed to read path from context menu because path does not conform to RFC 1808".to_owned())
                        }
                    }
                    None => inspect.error_string("Failed to read path from context menu".to_owned())
                }
            }
        }
    }
);

impl ContextMenu {
    fn init_with(inspect: Arc<Mutex<Inspect>>) -> Retained<Self> {
        let this = Self::alloc().set_ivars(inspect);
        unsafe { msg_send![super(this), init] }
    }
}

pub fn load(inspect: Arc<Mutex<Inspect>>) {
    unsafe {
        let mtm = MainThreadMarker::new().unwrap();
        NSApplication::sharedApplication(mtm)
            .setServicesProvider(Some(&ContextMenu::init_with(inspect)));

        NSUpdateDynamicServices();
    }
}
