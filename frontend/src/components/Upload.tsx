import { InspectSource } from "./App";
import "./Upload.css";
import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";

interface UploadProps {
  onError: (err: string) => void;
  onInspect: (file: InspectSource) => void;
}

export default function Upload({ onError, onInspect }: UploadProps) {
  const [dragging, setDragging] = useState(false);

  function selectFile() {
    open({
      // TODO: multiple: true,
      filters: [
        {
          name: "Image",
          extensions: [
            "avif",
            "c2pa",
            "dng",
            "gif",
            "heic",
            "heif",
            "jpg",
            "jpeg",
            "png",
            "svg",
            "tif",
            "tiff",
            "webp",
          ],
        },
        { name: "Video", extensions: ["avi", "mp4", "mov"] },
        { name: "Audio", extensions: ["m4a", "mp3", "wav"] },
        { name: "Document", extensions: ["pdf"] },
      ],
    })
      .then((file) => {
        if (file) {
          return onInspect({ origin: file });
        }
      })
      .catch(onError);
  }

  return (
    <div className="container">
      <div
        className={`visual-container ${dragging ? "dragging" : ""}`}
        onClick={selectFile}
        onDragOver={() => setDragging(true)}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
      >
        <img className="upload-icon" src="/upload.png" />

        <div className="upload-instructions">
          Drag & Drop or <span className="hyperlink-style">Choose file</span> to
          upload
        </div>

        <div className="supported-formats">
          Supported formats: AVI, AVIF, C2PA, DNG, GIF, HEIC, HEIF, JPG, JPEG,
          M4A, MP3, MP4, MOV, PDF, PNG, SVG, TIF, TIFF, WAV, WEBP
        </div>
      </div>
    </div>
  );
}
