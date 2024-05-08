import { message } from "@tauri-apps/plugin-dialog";

export function logError(err: string) {
  console.error(err);
  // If this fails, whataya gonna do
  message(err, {
    kind: "error",
  }).catch((err) => {
    console.error(err);
  });
}
