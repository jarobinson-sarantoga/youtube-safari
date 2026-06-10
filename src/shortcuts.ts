import { revealYouTubePanel } from "./quality-ui";
import { appendLog } from "./ytdl";

const { input } = iina;

/** mpv/IINA format — see https://mpv.io/manual/stable/#key-names */
export const BROWSE_KEY_BINDING = "Shift+y";

let shortcutInstalled = false;

export function openYouTubePanelFromPlayer(): void {
  revealYouTubePanel("player");
  appendLog("Open YouTube panel (player shortcut)");
}

/** Register Shift+Y on the focused player window. */
export function registerBrowseShortcut(): void {
  if (shortcutInstalled) {
    return;
  }
  shortcutInstalled = true;

  input.onKeyDown(
    BROWSE_KEY_BINDING,
    () => {
      openYouTubePanelFromPlayer();
      return true;
    },
    input.PRIORITY_HIGH,
  );

  appendLog(`Browse shortcut registered: ${BROWSE_KEY_BINDING}`);
}