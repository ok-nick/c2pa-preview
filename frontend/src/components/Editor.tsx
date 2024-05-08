import { logError } from "../error";
import "./Editor.css";
import Loader from "./Loader";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Theme } from "@tauri-apps/api/window";
import JsonView from "@uiw/react-json-view";
import { lightTheme } from "@uiw/react-json-view/light";
import { vscodeTheme } from "@uiw/react-json-view/vscode";
import { useState, useEffect } from "react";

export interface EditorPayload {
  readonly: boolean;
  manifest: object;
}

function themeToCss(theme: Theme): React.CSSProperties {
  return theme == "light" ? lightTheme : vscodeTheme;
}

export default function Editor() {
  const [manifest, setManifest] = useState<object | null>(null);
  const [theme, setTheme] = useState<React.CSSProperties>(lightTheme);

  useEffect(() => {
    const webview = WebviewWindow.getCurrent();
    if (webview) {
      webview
        .theme()
        .then((theme) => {
          if (theme) {
            setTheme(themeToCss(theme));
          }
        })
        .catch(logError);

      webview
        .onThemeChanged((event) => {
          setTheme(themeToCss(event.payload));
        })
        .catch(logError);

      webview
        .listen("edit-info", (event) => {
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
          style={theme}
          displayDataTypes={false}
          displayObjectSize={false}
          collapsed={3}
        />
      )}
    </>
  );
}
