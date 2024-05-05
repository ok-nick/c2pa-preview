import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// TODO: update to use tauri env vars (like template)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // prevent vite from obscuring rust errors
  clearScreen: false,
  // tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
  },

  build: {
    // Tauri supports es2021
    target: ["es2021", "chrome100", "safari13"],
    // don't minify for debug builds
    minify: false,
    // produce sourcemaps for debug builds
    sourcemap: true,
  },
});
