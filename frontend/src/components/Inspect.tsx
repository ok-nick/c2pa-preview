import { ProcessedSource } from "./App";
import { EditorPayload } from "./Editor";
import "./Inspect.css";
import { invoke } from "@tauri-apps/api/core";
import { Menu, MenuItem } from "@tauri-apps/api/menu";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize, getCurrent } from "@tauri-apps/api/window";
import { type } from "@tauri-apps/plugin-os";
import { open } from "@tauri-apps/plugin-shell";
import { L2ManifestStore, generateVerifyUrl } from "c2pa";
import { ManifestSummary } from "c2pa-wc";
import "c2pa-wc/dist/components/ManifestSummary";
import { useEffect, useRef } from "react";
import { v4 as uuid } from "uuid";

interface InspectProps {
  onError: (err: string) => void;
  manifestStore: L2ManifestStore;
  source: ProcessedSource;
}

export default function Inspect({
  onError,
  manifestStore,
  source,
}: InspectProps) {
  const summaryRef = useRef<ManifestSummary | null>(null);
  const heightRef = useRef<number | null>();

  function showContextMenu(event: React.MouseEvent) {
    event.preventDefault();

    MenuItem.new({
      text: "View JSON Manifest",
      action: () => {
        const webview = new WebviewWindow(`editor-${uuid()}`, {
          url: "#/editor",
          title: "c2pa-preview editor",
          parent: "main",
        });

        // TODO: are these events auto unlistened when the window is dropped?
        webview
          .listen("request-edit-info", () => {
            source.origin
              .arrayBuffer()
              .then((buffer) => new Uint8Array(buffer))
              ?.then((bytes) => invoke("c2pa_report", bytes))
              .then((bytes) => {
                const decoder = new TextDecoder("utf-8");
                const manifest = JSON.parse(
                  decoder.decode(bytes as ArrayBuffer),
                ) as object;

                const payload: EditorPayload = {
                  readonly: true,
                  manifest,
                };
                return webview.emit("edit-info", payload);
              })
              .catch(onError);
          })
          .catch(onError);
        webview
          .once("tauri://error", (err) => {
            // Tauri source code says the payload will be a string
            onError(err.payload as string);
          })
          .catch(onError);
      },
    })
      .then((items) => {
        return Menu.new({
          items: [items],
        });
      })
      .then((menu) => {
        return menu.popup();
      })
      .catch(onError);
  }

  // Set manifest in component
  useEffect(() => {
    const summaryElement = summaryRef?.current;
    if (summaryElement) {
      summaryElement.manifestStore = manifestStore ?? undefined;
      summaryElement.viewMoreUrl = generateVerifyUrl(source.url ?? "");
    }
  }, [manifestStore, source]);

  // Resize window
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
  }, [manifestStore, onError]);

  // Fixes anchors not redirecting when clicked (presumably because they are in shadow
  // DOMs, probably a Tauri bug?)
  useEffect(() => {
    function click(event: MouseEvent) {
      const path = event.composedPath();
      const anchor = path.find((el) => (el as HTMLElement).tagName === "A") as
        | HTMLAnchorElement
        | undefined;
      if (anchor) {
        open(anchor.href).catch(onError);
      }
    }

    const ref = summaryRef.current;
    if (ref) {
      ref.addEventListener("click", click);

      return () => {
        ref.removeEventListener("click", click);
      };
    }
  });

  return (
    <>
      {manifestStore && (
        <cai-manifest-summary
          ref={summaryRef}
          slot="content"
          class="cai-manifest-theme"
          onContextMenu={showContextMenu}
        ></cai-manifest-summary>
      )}
    </>
  );
}
