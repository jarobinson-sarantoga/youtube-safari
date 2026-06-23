import { appendLog } from "../ytdl";
import { HIDE_RETRY_DELAYS_MS } from "./constants";
import { clearHideListeners } from "./listeners";
import { hidePlayerWindow, scheduleHide } from "./hide";
import { startBackgroundMaintenance, stopBackgroundMaintenance } from "./maintenance";
import { backgroundPlayState } from "./state";

const { core, event } = iina;

export function cancelBackgroundSession(): void {
  backgroundPlayState.hidePending = false;
  clearHideListeners();
  stopBackgroundMaintenance();
}

/** Restore a visible player window after background (Listen) playback. */
export function restoreForegroundPlayerWindow(): void {
  cancelBackgroundSession();
  if (!core.window.loaded) {
    return;
  }
  try {
    core.window.miniaturized = false;
    core.window.ontop = false;
    core.window.fullscreen = false;
    core.window.pip = false;
  } catch (err) {
    appendLog(`Foreground restore failed: ${err}`);
  }
}

function completeHide(source: string): void {
  if (!backgroundPlayState.hidePending) {
    return;
  }
  hidePlayerWindow(source);
  backgroundPlayState.hidePending = false;
  clearHideListeners();
  startBackgroundMaintenance();
  appendLog(`Background play: hide complete (${source})`);
}

export function isBackgroundHidePending(): boolean {
  return backgroundPlayState.hidePending || backgroundPlayState.backgroundSessionActive;
}

export function rehideBackgroundPlayer(source: string): void {
  scheduleHide(source);
}

/** Retire a previous youtube-open listener window before starting a new one. */
export function retireBackgroundPlayerWindow(): void {
  hidePlayerWindow("retire", { force: true });
}

/** Hide the player window after background playback starts (audio keeps playing). */
export function requestBackgroundPlayerWindow(): void {
  backgroundPlayState.hidePending = true;
  clearHideListeners();
  appendLog("Background play: scheduling hide");

  backgroundPlayState.windowLoadedToken = event.on("iina.window-loaded", () => {
    scheduleHide("window-loaded");
  });

  backgroundPlayState.fileLoadedToken = event.on("iina.file-loaded", () => {
    completeHide("file-loaded");
  });

  backgroundPlayState.deminiaturizedToken = event.on("iina.window-deminiaturized", () => {
    scheduleHide("deminiaturized");
  });

  for (const delay of HIDE_RETRY_DELAYS_MS) {
    backgroundPlayState.retryTimers.push(
      setTimeout(() => {
        scheduleHide(`delay-${delay}`);
      }, delay),
    );
  }

  backgroundPlayState.watchdogTimer = setTimeout(() => {
    if (!backgroundPlayState.hidePending) {
      return;
    }
    appendLog("Background play: hide watchdog timeout");
    completeHide("watchdog");
  }, 30000);
}
