use objc2::{declare_class, msg_send_id, mutability, rc::Id, ClassType, DeclaredClass};
use objc2_app_kit::{
    NSApplication, NSPasteboard, NSPasteboardTypeFileURL, NSUpdateDynamicServices,
};
use objc2_foundation::{run_on_main, NSError, NSObject, NSString, NSURL};

use std::{
    ffi::CStr,
    path::Path,
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
            // TODO: there's definitely a better way to do this
            let path = (*pasteboard).stringForType(NSPasteboardTypeFileURL);
            let path = NSURL::fileURLWithPath(&path.unwrap()).standardizedURL().unwrap().path().unwrap();
            let path = CStr::from_ptr(path.UTF8String());
            let path = Path::new(str::from_utf8(path.to_bytes()).unwrap());

            // TODO: set window pos to the current mouse pos?

            (*self.ivars().lock().unwrap()).send(path.to_owned())
        }
    }
);

impl ContextMenu {
    fn init_with(inspect: Arc<Mutex<Inspect>>) -> Option<Id<Self>> {
        let this = Self::alloc().set_ivars(inspect);
        unsafe { msg_send_id![super(this), init] }
    }
}

pub fn load(inspect: Arc<Mutex<Inspect>>) {
    unsafe {
        run_on_main(move |mtm| {
            NSApplication::sharedApplication(mtm)
                .setServicesProvider(Some(&ContextMenu::init_with(inspect).unwrap()));

            NSUpdateDynamicServices();
        });
    }
}

pub fn unload() {
    unsafe {
        run_on_main(|mtm| {
            NSApplication::sharedApplication(mtm).setServicesProvider(None);
            NSUpdateDynamicServices();
        });
    }
}
