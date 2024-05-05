import { InspectSourceType } from "./App";
import "./Upload.css";
import { open } from "@tauri-apps/plugin-dialog";
import React, { useState } from "react";

interface UploadProps {
  onError: (err: string) => void;
  onInspect: (file: InspectSourceType) => void;
}

export default function Upload({ onError, onInspect }: UploadProps) {
  const [dragging, setDragging] = useState(false);

  function selectFile() {
    open({
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
    })
      .then((file) => {
        if (file) {
          return onInspect(file);
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
          Supported formats: AVI, AVIF, DNG, HEIC, HEIF, JPEG, M4A, MP3, MP4,
          PDF, PNG, SVG, TIFF, WAV, WebP
        </div>
      </div>
    </div>
  );
}
