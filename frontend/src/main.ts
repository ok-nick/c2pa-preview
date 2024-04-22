import { getMatches } from "@tauri-apps/api/cli";
import { open as openURL } from "@tauri-apps/api/shell";
import mime from "mime/lite";
import { readBinaryFile } from "@tauri-apps/api/fs";
import { open } from "@tauri-apps/api/dialog";
import { emit, listen } from "@tauri-apps/api/event";
import { appWindow, LogicalSize } from "@tauri-apps/api/window";
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

  await appWindow.setSize(new LogicalSize(320, 242));
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

  await appWindow.setSize(new LogicalSize(320, 242));
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

async function display(path: string, manifest: L2ManifestStore, usn: number) {
  // Ignore this request, another file is being displayed
  if (usn != globalUSN) {
    return;
  }

  const manifestSummary = document.querySelector("cai-manifest-summary") as any; // TODO: type
  manifestSummary.manifestStore = manifest;
  manifestSummary.viewMoreUrl = generateVerifyUrl(path);

  requestAnimationFrame(async () => {
    const loaderContainer = document.querySelector(
      ".loader-container",
    ) as HTMLElement;
    loaderContainer.style.display = "none";
    manifestSummary.style.display = "block";

    const rect = manifestSummary.getBoundingClientRect();
    // TODO: not sure why it's always 28 pixels short
    await appWindow.setSize(new LogicalSize(320, rect.height + 28));
  });
}

async function displayWithPath(path: string, usn: number) {
  await displayLoading();

  try {
    const manifest = await manifestFromPath(path);
    display(path, manifest, usn);
  } catch (err) {
    await displayError(`Error reading manifest for "${path}": ${err}`, usn);
  }
}

async function manifestFromPath(path: string) {
  const mimeType = mime.getType(path);
  if (!mimeType) {
    return Promise.reject(new Error(`MIME type not found for "${path}"`));
  }

  const data = await readBinaryFile(path);
  const blob = new Blob([data], { type: mimeType });

  // TODO: cache this?
  const c2pa = await createC2pa({
    wasmSrc,
    workerSrc,
  });

  const { manifestStore } = await c2pa.read(blob);
  if (!manifestStore) {
    return Promise.reject(
      new Error(`Failed to read manifest store for ${path}`),
    );
  }

  return (await createL2ManifestStore(manifestStore)).manifestStore;
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

    let path;
    try {
      path = await open({
        filters: [
          { name: "Videos", extensions: ["avi", "mp4"] },
          {
            name: "Images",
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
          { name: "Audio", extensions: ["m4a", "mp3", "wav"] },
          { name: "Documents", extensions: ["pdf"] },
        ],
      });
    } catch (err) {
      await displayError(`Failed to select file: ${err}`, usn);
    }

    if (path) {
      // Error is handled inside of this function, nothing to catch
      await displayWithPath(path as string, usn);
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

  // TODO: display screen when file hover (not possible in tauri 1.0 iirc)
  // Files drag and dropped
  listen("tauri://file-drop", async (event) => {
    const payload = event.payload as string[];
    await displayWithPath(payload[0], incrementUSN());
  });

  // TODO: the "View More" sends to content credentials website, but it only accepts
  // files on the internet, not sure if it can do local ones?
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
