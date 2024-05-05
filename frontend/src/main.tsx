import React from "react";
import { C2paProvider } from "@contentauth/react";
import wasmSrc from "c2pa/dist/assets/wasm/toolkit_bg.wasm?url";
import workerSrc from "c2pa/dist/c2pa.worker.min.js?url";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <C2paProvider
      config={{
        wasmSrc,
        workerSrc,
      }}
    >
      <App />
    </C2paProvider>
  </React.StrictMode>,
);
