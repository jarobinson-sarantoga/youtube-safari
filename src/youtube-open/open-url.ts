import {
  getYouTubePlaylistId,
  isYouTubePlaylistURL,
  isYouTubeWatchURL,
  normalizeMediaURL,
  parseYouTubeTimestamp,
} from "../youtube";
import { openYouTubePlaylist } from "../playlist";
import { isShuttingDown } from "../lifecycle";
import { appendLog } from "../ytdl";
import { setPendingSeek } from "./pending-seek";

const { core, mpv, utils } = iina;

export type OpenLinkedUrlOptions = {
  /** Replace current stream in-place (safer when reusing a managed player). */
  replace?: boolean;
};

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
