import { logError } from "../error";
import "./Editor.css";
import Loader from "./Loader";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import JsonView from "@uiw/react-json-view";
import { useState, useEffect } from "react";

export interface EditorPayload {
  readonly: boolean;
  manifest: object;
}

export default function Editor() {
  const [manifest, setManifest] = useState<object | null>(null);

  useEffect(() => {
    // TODO: listen to window theme and change JsonView corrsponding theme

    const webview = WebviewWindow.getCurrent();
    if (webview) {
      webview
        .once("edit-info", (event) => {
          const payload = event.payload as EditorPayload;
          if (payload.readonly) {
            // TODO: set window size based on size of json?
            setManifest(payload.manifest);
          } else {
            // TODO: implement manifest editing
          }
        })
        .catch(logError);

      webview.emit("request-edit-info").catch(logError);
    }
  }, []);

  return (
    <>
      {!manifest && <Loader />}

      {manifest && (
        <JsonView
          value={manifest}
          displayDataTypes={false}
          displayObjectSize={false}
          collapsed={3}
        />
      )}
    </>
  );
}
