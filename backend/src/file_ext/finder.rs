use objc2::{
    define_class, msg_send, rc::Retained, AllocAnyThread, ClassType, DeclaredClass,
    MainThreadMarker,
};
use objc2_app_kit::{NSApplication, NSPasteboard, NSUpdateDynamicServices};
use objc2_foundation::{
    ns_string, NSArray, NSDictionary, NSError, NSInteger, NSObject, NSString, NSURL,
};

use std::{
    error::Error,
    ffi::CStr,
    fmt::Display,
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
        fn _inspect_credentials(
            &self,
            pasteboard: *mut NSPasteboard,
            _user_data: *mut NSString,
            error: *mut *mut NSError
        ) {
            let mut inspect = self.ivars().lock().unwrap();
            if let Err(err) = unsafe {self.inspect_credentials(pasteboard, &mut inspect) } {
                if !error.is_null() {
                    unsafe {
                    *error = Retained::into_raw(NSError::errorWithDomain_code_userInfo(
                        // TODO: reference string from config
                        ns_string!("com.c2pa-preview.dev"),
                        err.code(),
                        Some(&NSDictionary::from_slices(
                            &[ns_string!("description")],
                            &[NSString::from_str(&err.to_string()).as_ref()],
                        )),
                    ));
                    }
                }

                inspect.error(err);
            }
        }
    }
);

impl ContextMenu {
    fn init_with(inspect: Arc<Mutex<Inspect>>) -> Retained<Self> {
        let this = Self::alloc().set_ivars(inspect);
        unsafe { msg_send![super(this), init] }
    }

    unsafe fn inspect_credentials(
        &self,
        pasteboard: *mut NSPasteboard,
        inspect: &mut Inspect,
    ) -> Result<(), FinderError> {
        let paths = (*pasteboard)
            .readObjectsForClasses_options(&NSArray::from_slice(&[NSURL::class()]), None)
            .ok_or(FinderError::FailedToGetPath)?;
        for path in paths {
            let path = path
                .downcast::<NSURL>()
                .map_err(|_| FinderError::FailedToGetPath)?
                .path()
                .ok_or(FinderError::PathInvalidOrNoLongerExists)?;
            let path = str::from_utf8(CStr::from_ptr(path.UTF8String()).to_bytes())
                .map_err(|_| FinderError::PathInvalidUtf8)?;

            // TODO: set window pos to the current mouse pos?
            inspect.send(PathBuf::from(path))?;
        }

        Ok(())
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

#[derive(Debug)]
pub enum FinderError {
    Tauri(tauri::Error),
    FailedToGetPath,
    PathInvalidOrNoLongerExists,
    PathInvalidUtf8,
}

impl Error for FinderError {}

impl FinderError {
    pub fn code(&self) -> NSInteger {
        match self {
            FinderError::Tauri(_) => 1001,
            FinderError::FailedToGetPath => 1002,
            FinderError::PathInvalidOrNoLongerExists => 1003,
            FinderError::PathInvalidUtf8 => 1004,
        }
    }
}

impl Display for FinderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FinderError::Tauri(err) => err.fmt(f),
            FinderError::FailedToGetPath => {
                write!(f, "Failed to get file path from the context menu")
            }
            FinderError::PathInvalidOrNoLongerExists => {
                write!(f, "Failed to parse file path from the context menu")
            }
            FinderError::PathInvalidUtf8 => {
                write!(f, "Failed to parse file path from the context menu")
            }
        }
    }
}

impl From<tauri::Error> for FinderError {
    fn from(err: tauri::Error) -> Self {
        FinderError::Tauri(err)
    }
}
