import { C2paSourceType } from "c2pa";
import "./App.css";
import { Inspect, InspectSourceType } from "./Inspect";
import Loader from "./Loader";
import Upload from "./Upload";
import { emit, listen } from "@tauri-apps/api/event";
import { getMatches } from "@tauri-apps/plugin-cli";
import { message } from "@tauri-apps/plugin-dialog";
import { useEffect, useRef, useState } from "react";
import { readFile } from "@tauri-apps/plugin-fs";
import mime from "mime/lite";

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

  const unlistenRef = useRef<(() => void) | null>(null);

  function error(err: string) {
    // If an error occurs then it should go back to upload screen
    setLoading(false);
    setInspectSource(null);

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

      {inspectSource && (
        <Inspect
          onError={error}
          onLoad={() => setLoading(false)}
          source={inspectSource}
        />
      )}

      {loading && <Loader />}
    </div>
  );
}
