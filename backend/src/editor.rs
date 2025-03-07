use std::io::Cursor;

use c2pa::Reader;
use tauri::{
    command,
    ipc::{InvokeBody, Request, Response},
};

#[command]
pub fn c2pa_report(request: Request<'_>) -> Result<Response, String> {
    if let InvokeBody::Raw(bytes) = request.body() {
        let mime = infer::get(bytes)
            .ok_or_else(|| "Could not get MIME type for file".to_owned())?
            .extension();
        Ok(Response::new(
            Reader::from_stream(mime, Cursor::new(bytes))
                .map_err(|err| err.to_string())?
                .to_string()
                .into_bytes(),
        ))
    } else {
        Err("Incorrect call to c2pa_report command".to_owned())
    }
}
