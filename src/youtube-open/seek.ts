import { isShuttingDown } from "../lifecycle";
import { appendLog } from "../ytdl";
import { takePendingSeek } from "./pending-seek";

const { core, mpv } = iina;

let seekRetryTimer: ReturnType<typeof setTimeout> | null = null;

function formatChapterTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function performSeek(seconds: number): void {
  try {
    mpv.set("time-pos", seconds);
  } catch {
    // time-pos may be unavailable before the demuxer is ready
  }
  mpv.command("seek", [String(seconds), "absolute"]);
}

export function cancelSeekRetries(): void {
  if (!seekRetryTimer) {
    return;
  }
  clearTimeout(seekRetryTimer);
  seekRetryTimer = null;
}

/** Seek via mpv with retries while the DASH stream becomes seekable. */
export function seekPlayback(seconds: number, label = "playback"): void {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return;
  }

  cancelSeekRetries();
  const maxAttempts = label === "pending" ? 16 : 8;
  const attemptSeek = (tryNum: number): void => {
    if (isShuttingDown()) {
      return;
    }
    performSeek(seconds);

    const duration = mpv.getNumber("duration") || 0;
    const position = mpv.getNumber("time-pos") || 0;
    appendLog(
      `Seek ${label} try=${tryNum} target=${seconds}s duration=${duration} pos=${position}`,
    );

    if (Math.abs(position - seconds) <= 2 || tryNum >= maxAttempts) {
      core.osd(`Chapter: ${formatChapterTime(seconds)}`);
      return;
    }

    seekRetryTimer = setTimeout(() => {
      seekRetryTimer = null;
      attemptSeek(tryNum + 1);
    }, 200);
  };

  attemptSeek(0);
}

export function applyPendingSeek(): void {
  const seconds = takePendingSeek();
  if (seconds === null) {
    return;
  }
  seekPlayback(seconds, "pending");
}
