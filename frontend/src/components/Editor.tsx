import { logError } from "../error";
import "./Editor.css";
import Loader from "./Loader";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
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

    let isMounted = true;
    let unlisten: (() => void) | null = null;

    getCurrentWebviewWindow()
      .listen("edit-info", (event) => {
        const payload = event.payload as EditorPayload;
        if (payload.readonly) {
          // TODO: set window size based on size of json?
          setManifest(payload.manifest);
        } else {
          // TODO: implement manifest editing
        }
      })
      .then((unlistenFn) => {
        if (isMounted) {
          unlisten = unlistenFn;
        } else {
          unlistenFn();
        }
      })
      .catch(logError);

    getCurrentWebviewWindow()
      .emitTo(getCurrentWebviewWindow().label, "request-edit-info")
      .catch(logError);

    return () => {
      isMounted = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  return (
    <>
      {!manifest && <Loader />}

      {manifest && (
        <JsonView
          value={manifest}
          objectSortKeys={true}
          displayDataTypes={false}
          displayObjectSize={false}
          collapsed={3}
        />
      )}
    </>
  );
}
