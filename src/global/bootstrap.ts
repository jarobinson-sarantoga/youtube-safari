import { notifyCookieHealthIfNeeded } from "../cookie-health";
import { startOpenUrlQueuePoller } from "../open-url-global";
import { startOpenPanelQueuePoller } from "../open-panel-global";
import { initStandaloneShell } from "../standalone-host";
import { setStandaloneCoordinator } from "../standalone-bridge";
import { appendLog } from "../ytdl";
import { playerCoordinator } from "./coordinator";
import { installGlobalMenuItems } from "./menu";
import { registerGlobalMessageHandlers } from "./messages";

const { global, menu, console } = iina;

function pingExistingPlayers(): void {
  try {
    global.postMessage(null, "globalPing", {});
    appendLog("Pinged existing players for playerReady sync");
  } catch (err) {
    appendLog(`globalPing failed: ${err}`);
  }
}

export function bootstrapGlobalEntry(): void {
  setStandaloneCoordinator(playerCoordinator);

  // User Scripts order: preload standalone shell, then register Plugin menu + keyBinding.
  initStandaloneShell();
  installGlobalMenuItems();
  startOpenPanelQueuePoller();
  startOpenUrlQueuePoller(playerCoordinator);
  registerGlobalMessageHandlers();
  pingExistingPlayers();

  // Rebuild Plugin menu after IINA finishes loading keybindings (large global.js can load late).
  setTimeout(() => {
    try {
      menu.forceUpdate();
      appendLog("Global plugin menu forceUpdate");
    } catch (err) {
      appendLog(`menu.forceUpdate failed: ${err}`);
    }
  }, 400);

  notifyCookieHealthIfNeeded();
  appendLog("Global entry loaded");
  console.log("YouTube global entry loaded");
}
