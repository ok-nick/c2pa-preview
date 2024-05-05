import { C2paSourceType, L2ManifestStore, createL2ManifestStore } from "c2pa";
import "./App.css";
import Inspect from "./Inspect";
import Loader from "./Loader";
import Upload from "./Upload";
import { emit, listen } from "@tauri-apps/api/event";
import { getMatches } from "@tauri-apps/plugin-cli";
import { FileResponse, message } from "@tauri-apps/plugin-dialog";
import { useEffect, useRef, useState } from "react";
import { readFile } from "@tauri-apps/plugin-fs";
import mime from "mime/lite";
import { useC2pa } from "@contentauth/react";
import { getCurrent } from "@tauri-apps/api/webview";
import { LogicalSize } from "@tauri-apps/api/dpi";

// "string" being a path
export type InspectSourceType = Blob | FileResponse | string;

async function processSource(
  source: InspectSourceType,
): Promise<C2paSourceType> {
  if (source instanceof Blob) {
    return Promise.resolve(source);
  } else if (typeof source === "string") {
    const data = await readFile(source);
    const mimeType = mime.getType(source);
    if (mimeType) {
      return Promise.resolve(new Blob([data], { type: mimeType }));
    } else {
      return Promise.reject(new Error(`MIME type not found for "${source}"`));
    }
  } else {
    return processSource(source.path);
  }
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [inspectSource, setInspectSource] = useState<InspectSourceType | null>(
    null,
  );
  const [processedSource, setProcessedSource] =
    useState<C2paSourceType | null>();
  const [manifestStore, setManifestStore] = useState<L2ManifestStore | null>(
    null,
  );

  const unlistenRef = useRef<(() => void) | null>(null);

  // Must be outside, it internally calls a hook which must be at the top-level
  const provenance = useC2pa(processedSource ?? undefined);

  function error(err: string) {
    // If an error occurs then it should go back to upload screen
    setLoading(false);
    setInspectSource(null);
    setManifestStore(null);

    getCurrent().setSize(new LogicalSize(304, 242));

    console.error(err);
    // If this fails, whataya gonna do
    // TODO: save to log file?
    message(err, {
      kind: "error",
    });
  }

  function handleInspect(source: InspectSourceType) {
    setLoading(true);
    setInspectSource(source);
  }

  // Convert source to C2PA-digestable format
  useEffect(() => {
    if (inspectSource) {
      processSource(inspectSource).then(setProcessedSource).catch(error);
    }
  }, [inspectSource]);

  // Convert processed source to manifest
  useEffect(() => {
    // If the source isn't processed, then ignore it, as there can't be any manifest
    if (processedSource) {
      if (provenance?.manifestStore?.activeManifest) {
        createL2ManifestStore(provenance.manifestStore)
          .then((result) => {
            setManifestStore(result.manifestStore);
            setLoading(false);
            // Don't need the worker anymore
            result.dispose();
          })
          .catch(error);
      } else {
        error(new Error("Manifest not found for file").toString());
      }
    }
  }, [provenance]);

  // Handle file drops
  useEffect(() => {
    function dragOver(event: DragEvent) {
      event.preventDefault();
    }

    function drop(event: DragEvent) {
      event.preventDefault();

      const files = event.dataTransfer?.files;
      if (files?.length && files.length >= 1) {
        handleInspect(files[0]);
      }
    }

    window.addEventListener("dragover", dragOver);
    window.addEventListener("drop", drop);

    return () => {
      window.removeEventListener("dragover", dragOver);
      window.removeEventListener("drop", drop);
    };
  }, []);

  // Handle CLI args and sources passed from backend (like for file extension)
  useEffect(() => {
    // File passed from CLI
    getMatches()
      .then(async (matches) => {
        const path = matches.args.path?.value;
        if (typeof path === "string") {
          handleInspect(path);
        }
      })
      .catch(error);

    // File passed from file extension
    listen("inspect", (event) => {
      handleInspect(event.payload as string);
    })
      .then((dispose) => {
        unlistenRef.current = dispose;
      })
      .catch(error);

    // Tell the backend that the frontend is ready for inspect requests
    emit("ready").catch(error);
  }, []);

  // Cleanup listener
  useEffect(() => {
    if (unlistenRef.current) {
      return unlistenRef.current;
    }
  }, [unlistenRef.current]);

  return (
    <div>
      {!loading && !inspectSource && (
        <Upload onError={error} onInspect={handleInspect} />
      )}

      {!loading && manifestStore && (
        <Inspect onError={error} manifestStore={manifestStore} />
      )}

      {loading && <Loader />}
    </div>
  );
}
