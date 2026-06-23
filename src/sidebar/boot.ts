import { $ } from "./dom";

export type BootView = "browse" | "player";

let booting = true;
let pendingView: BootView = "player";

export function isPanelBooting(): boolean {
  return booting;
}

export function queueBootView(view: BootView): void {
  if (booting) {
    pendingView = view;
  }
}

export function enterPanelBoot(): void {
  booting = true;
  pendingView = "player";
  $("shell-root").classList.add("panel-booting");
}

/** Reveal the panel after the first cookie refresh. Returns the deferred view to show. */
export function completePanelBoot(): BootView | null {
  if (!booting) {
    return null;
  }
  booting = false;
  $("shell-root").classList.remove("panel-booting");
  const view = pendingView;
  pendingView = "player";
  return view;
}