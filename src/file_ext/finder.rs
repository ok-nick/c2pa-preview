use objc2::{declare_class, msg_send_id, mutability, rc::Id, ClassType, DeclaredClass};
use objc2_app_kit::{
    NSApplication, NSPasteboard, NSPasteboardTypeFileURL, NSUpdateDynamicServices,
};
use objc2_foundation::{run_on_main, NSError, NSObject, NSString, NSURL};

use std::{
    ffi::CStr,
    path::PathBuf,
    str,
    sync::{Arc, Mutex},
};

use crate::Inspect;

declare_class!(
    #[derive(Debug)]
    struct ContextMenu;

    unsafe impl ClassType for ContextMenu {
        type Super = NSObject;
        type Mutability = mutability::Immutable;
        const NAME: &'static str = "c2pa-preview_ContextMenu";
    }

    impl DeclaredClass for ContextMenu {
        type Ivars = Arc<Mutex<Inspect>>;
    }

    unsafe impl ContextMenu {
        #[method(inspectCredentialsWithPasteboard:userData:error:)]
        unsafe fn inspect_credentials(
            &self,
            pasteboard: *mut NSPasteboard,
            _user_data: *mut NSString,
            _error: *mut *mut NSError
        ) {
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
                        None => inspect.error_string("Failed to read path from context menu because path does not conform to RC 1808".to_owned())
                    }
                }
                None => inspect.error_string("Failed to read path from context menu".to_owned())
            }
        }
    }
);

impl ContextMenu {
    fn init_with(inspect: Arc<Mutex<Inspect>>) -> Id<Self> {
        let this = Self::alloc().set_ivars(inspect);
        unsafe { msg_send_id![super(this), init] }
    }
}

pub fn load(inspect: Arc<Mutex<Inspect>>) {
    unsafe {
        run_on_main(move |mtm| {
            NSApplication::sharedApplication(mtm)
                .setServicesProvider(Some(&ContextMenu::init_with(inspect)));

            NSUpdateDynamicServices();
        });
    }
}
