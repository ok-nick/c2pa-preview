import App from "./components/App";
import Editor from "./components/Editor";
import "./style.css";
import { C2paProvider } from "@contentauth/react";
import wasmSrc from "c2pa/dist/assets/wasm/toolkit_bg.wasm?url";
import workerSrc from "c2pa/dist/c2pa.worker.min.js?url";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createHashRouter } from "react-router-dom";

// TODO: fix app + editor top-level
const router = createHashRouter([
  {
    path: "/",
    element: (
      <C2paProvider
        config={{
          wasmSrc,
          workerSrc,
        }}
      >
        <App />
      </C2paProvider>
    ),
  },
  {
    path: "/editor",
    element: <Editor />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
