import { cancelBackgroundSession } from "./background-play";
import { markIntentionalPlayerClose, markPlayerShuttingDown } from "./lifecycle";
import { appendLog } from "./ytdl";

const { global, mpv, utils } = iina;

const MANAGED_PLAYER_LABELS = new Set(["youtube-open"]);

export type CloseManagedPlayerOptions = {
  /** When true, close the player window via mpv quit (safe only if other players remain). */
  allowWindowQuit?: boolean;
};

function isManagedPlayerLabel(label: string): boolean {
  return MANAGED_PLAYER_LABELS.has(label);
}

function systemCloseManagedWindow(): void {
  const script = `tell application "System Events" to tell process "IINA"
    repeat with w in windows
      set n to name of w
      if n does not contain "YouTube" then
        try
          perform action "AXPress" of (first button of w whose subrole is "AXCloseButton")
        end try
      end if
    end repeat
  end tell`;
  void utils.exec("/usr/bin/osascript", ["-e", script]);
}

/** Stop and optionally close a plugin-managed player window. */
export function closeManagedPlayerWindow(options?: CloseManagedPlayerOptions): void {
  const label = typeof global.getLabel === "function" ? global.getLabel() : "";
  if (!isManagedPlayerLabel(label)) {
    appendLog(`closeManagedPlayer ignored (label=${label || "default"})`);
    return;
  }

  cancelBackgroundSession();
  markIntentionalPlayerClose();
  markPlayerShuttingDown();

  try {
    mpv.set("stream-open-filename", "null://");
  } catch (err) {
    appendLog(`closeManagedPlayer unload failed: ${err}`);
  }

  try {
    global.postMessage("playerClosed", {});
  } catch {
    // Best-effort.
  }

  if (!options?.allowWindowQuit) {
    appendLog(`Managed player unloaded (window kept, label=${label})`);
    return;
  }

  // Never mpv quit — it can terminate the whole app (savePlaybackPosition crash).
  appendLog(`Closing managed player window (system, label=${label})`);
  setTimeout(() => {
    systemCloseManagedWindow();
  }, 200);
}