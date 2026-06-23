import { appendLog } from "../ytdl";
import { OFFSCREEN_FRAME } from "./constants";
import { backgroundPlayState } from "./state";

const { core, utils } = iina;

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
  if (
    !options?.force &&
    !backgroundPlayState.hidePending &&
    !backgroundPlayState.backgroundSessionActive
  ) {
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

export function scheduleHide(source: string): void {
  hidePlayerWindow(source);
}
