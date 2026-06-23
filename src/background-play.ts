import { appendLog } from "./ytdl";

const { core, event, utils } = iina;

const HIDE_RETRY_DELAYS_MS = [
  250, 500, 800, 1200, 1800, 2500, 3500, 5000, 7000, 10000, 15000,
];

const OFFSCREEN_FRAME = { x: -12000, y: -12000, width: 320, height: 180 };
const MAINTENANCE_INTERVAL_MS = 2000;
const MAINTENANCE_DURATION_MS = 120000;

let hidePending = false;
let backgroundSessionActive = false;
let windowLoadedToken: string | null = null;
let fileLoadedToken: string | null = null;
let deminiaturizedToken: string | null = null;
let movedToken: string | null = null;
let retryTimers: ReturnType<typeof setTimeout>[] = [];
let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
let maintenanceTimer: ReturnType<typeof setInterval> | null = null;
let maintenanceStopTimer: ReturnType<typeof setTimeout> | null = null;

function clearHideListeners(): void {
  if (windowLoadedToken) {
    event.off("iina.window-loaded", windowLoadedToken);
    windowLoadedToken = null;
  }
  if (fileLoadedToken) {
    event.off("iina.file-loaded", fileLoadedToken);
    fileLoadedToken = null;
  }
  if (deminiaturizedToken) {
    event.off("iina.window-deminiaturized", deminiaturizedToken);
    deminiaturizedToken = null;
  }
  if (movedToken) {
    event.off("iina.window-moved", movedToken);
    movedToken = null;
  }
  for (const timer of retryTimers) {
    clearTimeout(timer);
  }
  retryTimers = [];
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
}

export function cancelBackgroundSession(): void {
  hidePending = false;
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

function stopBackgroundMaintenance(): void {
  backgroundSessionActive = false;
  if (maintenanceTimer) {
    clearInterval(maintenanceTimer);
    maintenanceTimer = null;
  }
  if (maintenanceStopTimer) {
    clearTimeout(maintenanceStopTimer);
    maintenanceStopTimer = null;
  }
}

function systemMiniaturizePlayerWindows(): void {
  const script = `tell application "System Events" to tell process "IINA"
    repeat with w in windows
      set n to name of w
      if n does not contain "YouTube" then
        try
          set value of attribute "AXMinimized" of w to true
        end try
      end if
    end repeat
  end tell`;
  void utils.exec("/usr/bin/osascript", ["-e", script]);
}

/** Hide or move the player window off-screen so only audio continues. */
export function hidePlayerWindow(source: string, options?: { force?: boolean }): boolean {
  if (!options?.force && !hidePending && !backgroundSessionActive) {
    return false;
  }
  if (!core.window.loaded) {
    return false;
  }

  let strategy = "none";

  try {
    core.window.sidebar = null;
    core.window.fullscreen = false;
    core.window.pip = false;
    core.window.ontop = false;
    core.window.miniaturized = true;

    if (core.window.miniaturized) {
      strategy = "minimized";
    } else {
      core.window.frame = OFFSCREEN_FRAME;
      strategy = "off-screen";
    }
  } catch (err) {
    appendLog(`Background play hide failed (${source}): ${err}`);
    strategy = "failed";
  }

  systemMiniaturizePlayerWindows();

  if (strategy !== "none" && strategy !== "failed") {
    appendLog(`Background play: player window hidden (${strategy}, ${source})`);
    return true;
  }
  if (strategy === "failed") {
    return false;
  }
  appendLog(`Background play: system minimize fallback (${source})`);
  return true;
}

function scheduleHide(source: string): void {
  hidePlayerWindow(source);
}

function startBackgroundMaintenance(): void {
  stopBackgroundMaintenance();
  backgroundSessionActive = true;

  deminiaturizedToken = event.on("iina.window-deminiaturized", () => {
    hidePlayerWindow("deminiaturized-maintain", { force: true });
  });
  movedToken = event.on("iina.window-moved", () => {
    hidePlayerWindow("moved-maintain", { force: true });
  });

  maintenanceTimer = setInterval(() => {
    hidePlayerWindow("maintenance", { force: true });
  }, MAINTENANCE_INTERVAL_MS);

  maintenanceStopTimer = setTimeout(() => {
    stopBackgroundMaintenance();
    appendLog("Background play: hide maintenance ended");
  }, MAINTENANCE_DURATION_MS);
}

function completeHide(source: string): void {
  if (!hidePending) {
    return;
  }
  hidePlayerWindow(source);
  hidePending = false;
  clearHideListeners();
  startBackgroundMaintenance();
  appendLog(`Background play: hide complete (${source})`);
}

export function isBackgroundHidePending(): boolean {
  return hidePending || backgroundSessionActive;
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
  hidePending = true;
  clearHideListeners();
  appendLog("Background play: scheduling hide");

  windowLoadedToken = event.on("iina.window-loaded", () => {
    scheduleHide("window-loaded");
  });

  fileLoadedToken = event.on("iina.file-loaded", () => {
    completeHide("file-loaded");
  });

  deminiaturizedToken = event.on("iina.window-deminiaturized", () => {
    scheduleHide("deminiaturized");
  });

  for (const delay of HIDE_RETRY_DELAYS_MS) {
    retryTimers.push(
      setTimeout(() => {
        scheduleHide(`delay-${delay}`);
      }, delay),
    );
  }

  watchdogTimer = setTimeout(() => {
    if (!hidePending) {
      return;
    }
    appendLog("Background play: hide watchdog timeout");
    completeHide("watchdog");
  }, 30000);
}