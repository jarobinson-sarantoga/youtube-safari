import { BROWSE_KEY_BINDING } from "./keybindings";
import { revealYouTubePanel } from "./sidebar-host";
import { appendLog } from "./ytdl";

const { input } = iina;

let shortcutInstalled = false;

/** Register Cmd+Shift+Y on the focused player (pairs with input_conf Meta+Shift+Y ignore). */
export function registerPlayerPanelShortcut(): void {
  if (shortcutInstalled) {
    return;
  }
  shortcutInstalled = true;

  input.onKeyDown(
    BROWSE_KEY_BINDING,
    () => {
      appendLog(`Open YouTube panel (${BROWSE_KEY_BINDING} player shortcut)`);
      revealYouTubePanel("player");
      return true;
    },
    input.PRIORITY_HIGH,
  );

  appendLog(`Player panel shortcut registered: ${BROWSE_KEY_BINDING}`);
}