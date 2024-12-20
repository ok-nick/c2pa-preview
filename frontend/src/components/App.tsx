import { logError } from "../error";
import "./App.css";
import Inspect from "./Inspect";
import Loader from "./Loader";
import Upload from "./Upload";
import { useC2pa } from "@contentauth/react";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getMatches } from "@tauri-apps/plugin-cli";
import { readFile } from "@tauri-apps/plugin-fs";
import { L2ManifestStore, createL2ManifestStore } from "c2pa";
import mime from "mime/lite";
import { useCallback, useEffect, useState } from "react";

export interface InspectSource {
  // "string" being a path
  origin: Blob | string;
  url?: string;
}

export interface ProcessedSource {
  origin: Blob;
  url?: string;
}

function processSource(source: InspectSource): Promise<ProcessedSource> {
  const origin = source.origin;
  if (origin instanceof Blob) {
    // TODO: origin.mimeType is incorrect for drag&drop files, need to determine mime type based on
    //       file signature. Unfortunately, the file-type crate only supports nodejs. When the mime
    //       type is incorrect, a spontaneous promise error occurs in c2pa and breaks everything.
    //       Either impl signature checker in js or send to backend and call the infer crate.
    return Promise.resolve({
      origin,
      url: source.url,
    });
  } else {
    // } else if (typeof origin === "string") {
    return readFile(origin).then((data) => {
      const mimeType = mime.getType(origin);
      if (mimeType) {
        return Promise.resolve({
          origin: new Blob([data], { type: mimeType }),
          url: source.url,
        });
      } else {
        return Promise.reject(new Error(`MIME type not found for "${origin}"`));
      }
    });
  }
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [inspectSource, setInspectSource] = useState<InspectSource | null>(
    null,
  );
  const [processedSource, setProcessedSource] =
    useState<ProcessedSource | null>();
  const [manifestStore, setManifestStore] = useState<L2ManifestStore | null>(
    null,
  );

  // Must be outside, it internally calls a hook which must be at the top-level
  const provenance = useC2pa(processedSource?.origin);

  const error = useCallback((err: string) => {
    // If an error occurs then it should go back to upload screen
    setLoading(false);
    setInspectSource(null);
    setProcessedSource(null);
    setManifestStore(null);

    getCurrentWindow().setSize(new LogicalSize(304, 242)).catch(logError);

    logError(err);
  }, []);

  const handleInspect = useCallback((source: InspectSource) => {
    setLoading(true);
    setProcessedSource(null);
    setManifestStore(null);
    setInspectSource(source);
  }, []);

  // Convert source to C2PA-digestable format
  useEffect(() => {
    if (inspectSource) {
      processSource(inspectSource).then(setProcessedSource).catch(error);
    }
  }, [error, inspectSource]);

  // Convert processed source to manifest
  useEffect(() => {
    if (provenance) {
      if (provenance.manifestStore?.activeManifest) {
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
  }, [error, provenance]);

  // Handle file drops
  useEffect(() => {
    function dragOver(event: DragEvent) {
      event.preventDefault();
    }

    function drop(event: DragEvent) {
      event.preventDefault();

      const files = event.dataTransfer?.files;
      if (files?.length && files.length >= 1) {
        handleInspect({
          origin: files[0],
          url: event.dataTransfer?.getData("text/uri-list"),
        });
      }
    }

    window.addEventListener("dragover", dragOver);
    window.addEventListener("drop", drop);

    return () => {
      window.removeEventListener("dragover", dragOver);
      window.removeEventListener("drop", drop);
    };
  }, [handleInspect]);

  // Handle CLI args and sources passed from backend (like for file extension)
  useEffect(() => {
    let isMounted = true;
    let unlisten: (() => void) | null = null;

    // File passed from CLI
    getMatches()
      .then((matches) => {
        const path = matches.args.path?.value;
        if (typeof path === "string") {
          handleInspect({ origin: path });
        }
      })
      .catch(error);

    // File passed from file extension
    listen("inspect", (event) => {
      handleInspect({ origin: event.payload as string });
    })
      .then((unlistenFn) => {
        if (isMounted) {
          unlisten = unlistenFn;
        } else {
          unlistenFn();
        }
      })
      .catch(error);

    // Tell the backend that the frontend is ready for inspect requests
    emit("ready").catch(error);

    return () => {
      isMounted = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, [error, handleInspect]);

  return (
    <div>
      {!loading && !manifestStore && (
        <Upload onError={error} onInspect={handleInspect} />
      )}

      {!loading && manifestStore && processedSource && (
        <Inspect
          onError={error}
          manifestStore={manifestStore}
          source={processedSource}
        />
      )}

      {loading && <Loader />}
    </div>
  );
}
