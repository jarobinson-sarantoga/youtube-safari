import {
  getYouTubePlaylistId,
  isYouTubePlaylistURL,
  isYouTubeWatchURL,
  normalizeMediaURL,
  parseYouTubeTimestamp,
} from "./youtube";
import { openYouTubePlaylist } from "./playlist";
import { isShuttingDown } from "./lifecycle";
import { appendLog } from "./ytdl";

const { core, mpv, utils } = iina;

let pendingSeekSeconds: number | null = null;
let seekRetryTimer: ReturnType<typeof setTimeout> | null = null;

export function setPendingSeek(seconds: number | null): void {
  if (typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0) {
    pendingSeekSeconds = seconds;
    return;
  }
  pendingSeekSeconds = null;
}

export function peekPendingSeek(): number | null {
  return pendingSeekSeconds;
}

export function takePendingSeek(): number | null {
  const seconds = pendingSeekSeconds;
  pendingSeekSeconds = null;
  return seconds;
}

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

function isExternalWebURL(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function shouldOpenInBrowser(url: string): boolean {
  const normalized = normalizeMediaURL(url);
  if (/youtube\.com\/results\b/i.test(normalized)) {
    return true;
  }
  if (/youtube\.com\/(?:channel|c|user|@)/i.test(normalized) && !isYouTubeWatchURL(normalized)) {
    return true;
  }
  return !isYouTubeWatchURL(normalized);
}

async function loadYouTubePlaylist(url: string, startSeconds: number | null): Promise<void> {
  try {
    await openYouTubePlaylist(url, startSeconds);
  } catch (err) {
    appendLog(`Playlist load failed: ${err}`);
    core.osd("Playlist load failed — opening video");
    setPendingSeek(startSeconds);
    core.open(url);
  }
}

export type OpenLinkedUrlOptions = {
  /** Replace current stream in-place (safer when reusing a managed player). */
  replace?: boolean;
};

function hasActiveStream(): boolean {
  const current = mpv.getString("stream-open-filename") || "";
  return (
    !!current &&
    current !== "-" &&
    current !== "/dev/null" &&
    !current.endsWith("null://")
  );
}

export function openLinkedUrl(url: string, options?: OpenLinkedUrlOptions): void {
  if (isShuttingDown()) {
    appendLog(`Open URL ignored during shutdown: ${url}`);
    return;
  }
  const normalized = normalizeMediaURL(url);
  if (!isExternalWebURL(normalized)) {
    return;
  }

  if (shouldOpenInBrowser(normalized)) {
    if (utils.open(normalized)) {
      appendLog(`Description open URL: ${normalized}`);
    } else {
      appendLog(`Description open URL failed: ${normalized}`);
    }
    return;
  }

  const startSeconds = parseYouTubeTimestamp(normalized);
  const playlistId = getYouTubePlaylistId(normalized);

  if (playlistId && isYouTubePlaylistURL(normalized)) {
    void loadYouTubePlaylist(normalized, startSeconds);
    return;
  }

  setPendingSeek(startSeconds);
  const replace = !!options?.replace && hasActiveStream();
  if (replace) {
    mpv.command("loadfile", [normalized, "replace"]);
    appendLog(
      `Replace YouTube in player: ${normalized}${startSeconds !== null ? ` @ ${startSeconds}s` : ""}`,
    );
    return;
  }
  core.open(normalized);
  appendLog(
    `Open YouTube in player: ${normalized}${startSeconds !== null ? ` @ ${startSeconds}s` : ""}`,
  );
}