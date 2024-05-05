import "c2pa-wc/dist/components/ManifestSummary";
import { open } from "@tauri-apps/plugin-shell";
import { L2ManifestStore, generateVerifyUrl } from "c2pa";
import { ManifestSummary } from "c2pa-wc";
import { useEffect, useRef } from "react";
import { LogicalSize, getCurrent } from "@tauri-apps/api/window";
import { type } from "@tauri-apps/plugin-os";
import "./Inspect.css";

interface UploadProps {
  onError: (err: string) => void;
  manifestStore: L2ManifestStore;
}

export default function Inspect({ onError, manifestStore }: UploadProps) {
  const summaryRef = useRef<ManifestSummary | null>(null);
  const heightRef = useRef<number | null>();

  // Set manifest in component
  useEffect(() => {
    const summaryElement = summaryRef?.current;
    if (summaryElement) {
      summaryElement.manifestStore = manifestStore ?? undefined;
      // TODO: set to URL if manifest is derived from online source
      //       currently there is no way to do this for local files
      summaryElement.viewMoreUrl = generateVerifyUrl("");
    }
  }, [summaryRef.current, manifestStore]);

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
  }, [summaryRef.current, manifestStore, onError]);

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
    summaryRef.current?.addEventListener("click", click);

    return () => {
      summaryRef.current?.removeEventListener("click", click);
    };
  });

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
