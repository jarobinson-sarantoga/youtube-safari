import {
  cancelScheduledRefresh,
  initQualityUI,
  registerFileLoadedRefresh,
} from "./quality-ui";
import { registerChapterHooks } from "./chapters-mpv";
import { openLinkedUrl } from "./youtube-open";
import {
  isYouTubeWatchURL,
} from "./youtube";
import { installBrowse } from "./browse/init";
import {
  isShuttingDown,
} from "./lifecycle";
import { getLastWatchUrl } from "./preferences";
import { registerPlayerPanelShortcut } from "./player-shortcut";
import { appendLog } from "./ytdl";
import { createPlayerMessageHandlers } from "./index/messages";
import { handleLoadCore } from "./index/load";
import { maybeOpenLastWatchOnIdleLaunch } from "./index/idle";

const { core, console, event, global, mpv, preferences } = iina;

async function handleLoad(next?: () => void): Promise<void> {
  try {
    if (isShuttingDown()) {
      appendLog("on_load aborted: player shutting down");
      mpv.set("stream-open-filename", "null://");
      return;
    }
    await handleLoadCore(() => activePlaybackBackground);
  } finally {
    // Unblock mpv even when quit arrives during yt-dlp resolve.
    next?.();
  }
}

const tryFirst = preferences.get("try_ytdl_first") !== false;
const hookName = tryFirst ? "on_load" : "on_load_fail";

// Register load hooks before ANY menu/sidebar init — menu work during init has
// crashed IINA (MenuController.updatePluginMenu) and prevented hook registration.
mpv.addHook(hookName, 15, handleLoad);
mpv.addHook(hookName === "on_load" ? "on_load_fail" : "on_load", 14, handleLoad);
appendLog(`Player plugin loaded (${hookName} @ priority 15)`);
console.log(`YouTube registered ${hookName} @ priority 15`);

registerChapterHooks();

registerFileLoadedRefresh(event);

const bootFilename = mpv.getString("stream-open-filename") || "";
const bootIdle =
  !bootFilename ||
  bootFilename === "-" ||
  bootFilename === "/dev/null" ||
  bootFilename.endsWith("null://");
const managedPlayerLabel =
  typeof global.getLabel === "function" ? global.getLabel() : "";
const isManagedPlayer = managedPlayerLabel.startsWith("youtube-");
let idleBootstrapDone = false;
let activePlaybackBackground = false;

const handlers = createPlayerMessageHandlers({
  bootIdle,
  setIdleBootstrapDone: (done) => {
    idleBootstrapDone = done;
  },
  setActivePlaybackBackground: (background) => {
    activePlaybackBackground = background;
  },
});

global.onMessage("openYouTubeWatch", handlers.openYouTubeWatch);
global.onMessage("suppressIdleBootstrap", handlers.suppressIdleBootstrap);
global.onMessage("retireBackgroundPlayer", handlers.retireBackgroundPlayer);
global.onMessage("closeManagedPlayer", handlers.closeManagedPlayer);
global.onMessage("syncNowPlaying", handlers.syncNowPlaying);
global.onMessage("globalPing", handlers.globalPing);

// Signal global before heavier UI init — createPlayerInstance waits on this message.
global.postMessage("playerReady", {
  idle: bootIdle,
  label: managedPlayerLabel || undefined,
});
appendLog(`Posted playerReady (idle=${bootIdle}, label=${managedPlayerLabel || "default"})`);

initQualityUI();
registerPlayerPanelShortcut();
installBrowse();

event.on("iina.window-loaded", () => {
  maybeOpenLastWatchOnIdleLaunch(
    idleBootstrapDone,
    bootIdle,
    isManagedPlayer,
    (done) => {
      idleBootstrapDone = done;
    },
  );
});