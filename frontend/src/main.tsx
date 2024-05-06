import App from "./App";
import "./style.css";
import { C2paProvider } from "@contentauth/react";
import wasmSrc from "c2pa/dist/assets/wasm/toolkit_bg.wasm?url";
import workerSrc from "c2pa/dist/c2pa.worker.min.js?url";
import React from "react";
import ReactDOM from "react-dom/client";

ReactDOM.createRoot(document.getElementById("root")!).render(
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
