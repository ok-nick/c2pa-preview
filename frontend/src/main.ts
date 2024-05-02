import { getMatches } from "@tauri-apps/plugin-cli";
import { open as openURL } from "@tauri-apps/plugin-shell";
import mime from "mime/lite";
import { readFile } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import { emit, listen } from "@tauri-apps/api/event";
import { type } from "@tauri-apps/plugin-os";
import { getCurrent, LogicalSize } from "@tauri-apps/api/window";
import {
  createC2pa,
  createL2ManifestStore,
  generateVerifyUrl,
  L2ManifestStore,
} from "c2pa";
import "c2pa-wc";
// @ts-ignore
import wasmSrc from "c2pa/dist/assets/wasm/toolkit_bg.wasm?url";
// @ts-ignore
import workerSrc from "c2pa/dist/c2pa.worker.js?url";

// Update Sequence Number
let globalUSN = 0;

function incrementUSN() {
  globalUSN += 1;
  return globalUSN;
}

async function manifestFromBlob(blob: Blob) {
  // TODO: cache this?
  const c2pa = await createC2pa({
    wasmSrc,
    workerSrc,
  });

  const { manifestStore } = await c2pa.read(blob);
  if (!manifestStore) {
    return Promise.reject(new Error(`Failed to read manifest store`));
  }

  return (await createL2ManifestStore(manifestStore)).manifestStore;
}

async function displayLoading() {
  const loaderContainer = document.querySelector(
    ".loader-container",
  ) as HTMLElement;
  const manifestSummary = document.querySelector(
    "cai-manifest-summary",
  ) as HTMLElement;
  const homeContainer = document.querySelector(
    ".home-container",
  ) as HTMLElement;

  manifestSummary.style.display = "none";
  homeContainer.style.display = "none";
  loaderContainer.style.display = "flex";

  await getCurrent().setSize(new LogicalSize(304, 242));
}

async function displayHome() {
  const loaderContainer = document.querySelector(
    ".loader-container",
  ) as HTMLElement;
  const manifestSummary = document.querySelector(
    "cai-manifest-summary",
  ) as HTMLElement;
  const homeContainer = document.querySelector(
    ".home-container",
  ) as HTMLElement;

  manifestSummary.style.display = "none";
  loaderContainer.style.display = "none";
  homeContainer.style.display = "block";

  await getCurrent().setSize(new LogicalSize(304, 242));
}

async function displayError(error: string, usn: number) {
  console.error(error);

  // If the USN is outdated, don't clog the screen, but still console.error it for debugging
  if (usn != globalUSN) {
    return;
  }

  var errorMessage = document.querySelector(".error-message") as HTMLElement;
  errorMessage.innerText = error;

  const errorScreen = document.getElementById("error-screen") as HTMLElement;
  errorScreen.style.display = "flex";

  await displayHome();
}

async function display(manifest: L2ManifestStore, usn: number) {
  // Ignore this request, another file is being displayed
  if (usn != globalUSN) {
    return;
  }

  const manifestSummary = document.querySelector("cai-manifest-summary") as any; // TODO: type
  manifestSummary.manifestStore = manifest;
  // TODO: currently not possible to pass file without uploading to server first
  manifestSummary.viewMoreUrl = generateVerifyUrl("");

  requestAnimationFrame(async () => {
    const loaderContainer = document.querySelector(
      ".loader-container",
    ) as HTMLElement;
    loaderContainer.style.display = "none";
    manifestSummary.style.display = "block";

    const rect = manifestSummary.getBoundingClientRect();
    // https://github.com/tauri-apps/tauri/issues/6333
    if ((await type()) == "macos") {
      rect.height += 28;
    }

    await getCurrent().setSize(new LogicalSize(304, rect.height));
  });
}

async function displayWithBlob(blob: Blob, usn: number) {
  await displayLoading();

  try {
    const manifest = await manifestFromBlob(blob);
    display(manifest, usn);
  } catch (err) {
    await displayError(`Error reading manifest": ${err}`, usn);
  }
}

async function displayWithPath(path: string, usn: number, mimeType?: string) {
  if (!mimeType) {
    const foundMimeType = mime.getType(path);
    if (foundMimeType) {
      mimeType = foundMimeType;
    } else {
      return Promise.reject(new Error(`MIME type not found for "${path}"`));
    }
  }

  const data = await readFile(path);
  return displayWithBlob(new Blob([data], { type: mimeType }), usn);
}

async function main() {
  // Accept file passed as arg in CLI
  getMatches().then(async (matches) => {
    const path = matches.args.path?.value;
    if (typeof path === "string") {
      await displayWithPath(path, incrementUSN());
    }
  });

  // Files passed from file extension
  await listen("inspect", async (event) => {
    await displayWithPath(event.payload as string, incrementUSN());
  });

  // Files manually selected
  const home = document.querySelector(".home") as HTMLElement;
  home.addEventListener("click", async function () {
    const usn = incrementUSN();

    let file;
    try {
      file = await open({
        filters: [
          {
            name: "Image",
            extensions: [
              "jpeg",
              "jpg",
              "png",
              "svg",
              "webp",
              "avi",
              "dng",
              "heic",
              "heif",
              "tiff",
            ],
          },
          { name: "Video", extensions: ["avi", "mp4"] },
          { name: "Audio", extensions: ["m4a", "mp3", "wav"] },
          { name: "Document", extensions: ["pdf"] },
        ],
      });
    } catch (err) {
      await displayError(`Failed to select file: ${err}`, usn);
    }

    if (file) {
      // Error is handled inside of this function, nothing to catch
      await displayWithPath(file.path, usn, file.mimeType);
    }
  });

  home.addEventListener("dragover", () => {
    home.classList.add("dragging");
  });

  home.addEventListener("dragenter", () => {
    home.classList.add("dragging");
  });

  home.addEventListener("dragleave", () => {
    home.classList.remove("dragging");
  });

  // TODO: display screen when file hover

  document.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  document.addEventListener("drop", async (event) => {
    event.preventDefault();

    const files = event.dataTransfer?.files;
    if (files && files.length >= 1) {
      const file = files[0];

      const reader = new FileReader();
      reader.addEventListener(
        "load",
        (e) => {
          const data = e.target?.result;
          if (data instanceof ArrayBuffer) {
            displayWithBlob(
              new Blob([data], { type: file.type }),
              incrementUSN(),
            );
          }
        },
        false,
      );

      reader.readAsArrayBuffer(file);
    }
  });

  // This fixes anchors not redirecting when clicked (presumably because they are in shadow
  // DOMs, probably a bug?)
  document.addEventListener("click", async (event: MouseEvent) => {
    const path = event.composedPath();
    const anchor = path.find((el) => (el as HTMLElement).tagName === "A") as
      | HTMLAnchorElement
      | undefined;
    if (anchor) {
      await openURL(anchor.href);
    }
  });

  const errorScreen = document.getElementById("error-screen");
  errorScreen?.addEventListener("click", function () {
    errorScreen.style.display = "none";
  });

  await listen("error", async (event) => {
    // Avoid incrementing USN so we don't possibly affect an inspection in process
    await displayError(event.payload as string, globalUSN);
  });

  // Tell the backend that the frontend is ready for inspect requests
  await emit("ready");
}

if (document.readyState == "interactive" || document.readyState == "complete") {
  await main();
} else {
  document.addEventListener("DOMContentLoaded", async function () {
    await main();
  });
}
