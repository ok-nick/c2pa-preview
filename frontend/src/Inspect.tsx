import { FileResponse } from "@tauri-apps/plugin-dialog";
import "c2pa-wc/dist/components/ManifestSummary";
import { useC2pa } from "@contentauth/react";
import { C2paSourceType, L2ManifestStore, createL2ManifestStore } from "c2pa";
import { readFile } from "@tauri-apps/plugin-fs";
import { ManifestSummary } from "c2pa-wc";
import { useEffect, useRef, useState } from "react";
import mime from "mime/lite";
import { LogicalSize, getCurrent } from "@tauri-apps/api/window";
import { type } from "@tauri-apps/plugin-os";
import "./Inspect.css";

// "string" being a path
export type InspectSourceType = Blob | FileResponse | string;

export class InspectFile {
  public manifest: L2ManifestStore;
  // TODO: use generateVerifyUrl, only works with web urls
  public verifyUrl?: string;

  constructor(manifest: L2ManifestStore, verifyUrl?: string) {
    this.manifest = manifest;
    this.verifyUrl = verifyUrl;
  }

  static async fromSource(source: InspectSourceType): Promise<InspectFile> {
    if (source instanceof Blob) {
      return InspectFile.fromBlob(source);
    } else if (typeof source === "string") {
      return InspectFile.fromPath(source);
    } else {
      return InspectFile.fromFileResponse(source);
    }
  }

  static async fromBlob(blob: Blob): Promise<InspectFile> {
    const result = useC2pa(blob);
    if (result?.manifestStore) {
      // TODO: handle disposal, need to make this class into builder
      return createL2ManifestStore(result.manifestStore).then(
        ({ manifestStore }) => new InspectFile(manifestStore),
      );
    } else {
      return Promise.reject(new Error("Failed read manifest"));
    }
  }

  static async fromFileResponse(
    fileResponse: FileResponse,
  ): Promise<InspectFile> {
    return InspectFile.fromPath(fileResponse.path, fileResponse.mimeType);
  }

  static async fromPath(path: string, mimeType?: string): Promise<InspectFile> {
    const foundMimeType = mime.getType(path);
    if (foundMimeType) {
      mimeType = foundMimeType;
    } else {
      return Promise.reject(new Error(`MIME type not found for "${path}"`));
    }

    return readFile(path).then((data) =>
      InspectFile.fromBlob(new Blob([data], { type: mimeType })),
    );
  }
}

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

interface UploadProps {
  onError: (err: string) => void;
  onLoad: () => void;
  source: InspectSourceType;
}

export function Inspect({ onError, onLoad, source }: UploadProps) {
  const [processedSource, setProcessedSource] =
    useState<C2paSourceType | null>();
  const [manifestStore, setManifestStore] = useState<L2ManifestStore | null>(
    null,
  );

  const summaryRef = useRef<ManifestSummary | null>(null);
  const heightRef = useRef<number | null>();

  // Has to be outside, it internally calls a hook which must be at top-level
  const provenance = useC2pa(processedSource ?? undefined);

  useEffect(() => {
    processSource(source).then(setProcessedSource).catch(onError);
  }, [source, onError]);

  useEffect(() => {
    // If the source isn't processed, then ignore it, as there can't be any manifest
    if (processedSource) {
      if (provenance?.manifestStore?.activeManifest) {
        createL2ManifestStore(provenance.manifestStore)
          .then((result) => {
            setManifestStore(result.manifestStore);
            // Don't need the worker anymore
            result.dispose();
          })
          .catch(onError);
      } else {
        onError(new Error("Manifest not found for file").toString());
      }
    }
  }, [provenance, onError]);

  useEffect(() => {
    const summaryElement = summaryRef?.current;
    if (summaryElement) {
      summaryElement.manifestStore = manifestStore ?? undefined;
      // TODO: set for web URLs, generateVerifyUrl
      summaryElement.viewMoreUrl = " ";

      onLoad();
    }
  }, [summaryRef.current, manifestStore, onLoad]);

  useEffect(() => {
    if (summaryRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        const height = entries[0].target.getBoundingClientRect().height;
        if (height !== heightRef.current) {
          heightRef.current = height;

          // https://github.com/tauri-apps/tauri/issues/6333
          // TODO: should this be cached?
          type()
            .then((type) => {
              if (type === "macos") {
                return height + 28;
              } else {
                return height;
              }
            })
            .then((height) =>
              getCurrent().setSize(new LogicalSize(304, height)),
            )
            .catch(onError);
        }
      });

      resizeObserver.observe(summaryRef.current);

      return () => resizeObserver.disconnect();
    }
  }, [summaryRef.current, manifestStore, onError]);

  // TODO: handle anchors in shadow dom not being followed

  return (
    <>
      {manifestStore && (
        <cai-manifest-summary
          ref={summaryRef}
          slot="content"
          class="cai-manifest-theme"
        ></cai-manifest-summary>
      )}
    </>
  );
}
