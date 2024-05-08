import { message } from "@tauri-apps/plugin-dialog";

export function reportError(err: string) {
  console.error(err);
  // If this fails, whataya gonna do
  void message(err, {
    kind: "error",
  });
}
