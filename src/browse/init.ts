import { registerBrowseSidebarHandlers } from "./bridge";
import { invalidateCookieCache } from "./cookies";
import { clearRelatedMemoryCache } from "./feeds/related";
import { clearBrowseCache } from "./store/cache";

import { markWatchEnded, recordWatchStart, updateWatchProgress } from "./store/history";
import { isYouTubeWatchURL, normalizeMediaURL } from "../youtube";
import { notifyCookieHealthIfNeeded } from "../cookie-health";
import { appendLog } from "../ytdl";
import type { PlayerStateMessage } from "./messages";

const { core, event, global, mpv, preferences, sidebar } = iina;

let browseInstalled = false;
let playerStateTimer: ReturnType<typeof setInterval> | null = null;

function buildPlayerState(): PlayerStateMessage {
  const watchUrl = (preferences.get("last_watch_url") as string | undefined) || "";
  const position = mpv.getNumber("time-pos") || 0;
  const duration = mpv.getNumber("duration") || 0;
  const paused = mpv.getFlag("pause");

  let title = "";
  try {
    title =
      mpv.getString("file-local-options/force-media-title") ||
      mpv.getString("media-title") ||
      core.status.title ||
      "";
  } catch {
    title = core.status.title || "";
  }

  return {
    watchUrl,
    title,
    position,
    duration,
    paused,
  };
}

function postPlayerState(): void {
  sidebar.postMessage("playerState", buildPlayerState());
}

function startPlayerStatePolling(): void {
  if (playerStateTimer) {
    return;
  }
  playerStateTimer = setInterval(() => {
    postPlayerState();
  }, 2000);
}

function stopPlayerStatePolling(): void {
  if (playerStateTimer) {
    clearInterval(playerStateTimer);
    playerStateTimer = null;
  }
}

function onYouTubeFileLoaded(): void {
  const watchUrl = (preferences.get("last_watch_url") as string | undefined) || "";
  if (isYouTubeWatchURL(watchUrl)) {
    const title =
      mpv.getString("file-local-options/force-media-title") ||
      mpv.getString("media-title") ||
      core.status.title ||
      "Untitled";
    const videoId = watchUrl.match(/[?&]v=([\w-]+)/)?.[1] || "";
    const thumb = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";
    recordWatchStart(watchUrl, title, "", thumb);
  }
  postPlayerState();
  startPlayerStatePolling();
}

function registerPlaybackHooks(): void {
  event.on("iina.file-loaded", onYouTubeFileLoaded);

  event.on("mpv.end-file", () => {
    markWatchEnded();
    postPlayerState();
    if (core.status.idle) {
      stopPlayerStatePolling();
    }
  });

  setInterval(() => {
    const watchUrl = (preferences.get("last_watch_url") as string | undefined) || "";
    if (!isYouTubeWatchURL(watchUrl)) {
      return;
    }
    const pos = mpv.getNumber("time-pos") || 0;
    const dur = mpv.getNumber("duration") || 0;
    if (dur > 0) {
      updateWatchProgress(pos, dur);
    }
  }, 15000);
}

/** Wire browse bridge, playback hooks, and global shortcut listener. */
export function installBrowse(): void {
  if (browseInstalled) {
    return;
  }
  browseInstalled = true;

  registerBrowseSidebarHandlers();
  registerPlaybackHooks();

  event.on("iina.window-will-close", () => {
    global.postMessage("playerClosed", {});
  });

  global.onMessage("cookiesRefreshed", () => {
    invalidateCookieCache();
    clearBrowseCache();
    clearRelatedMemoryCache();
    appendLog("Cookie and browse caches invalidated after refresh");
    sidebar.postMessage("feedsStale", {});
  });

  global.postMessage("playerReady", {});
  notifyCookieHealthIfNeeded({ osd: true });
  appendLog("Browse module installed");
}

/** Re-register browse handlers after sidebar.loadFile (IINA clears listeners). */
export function registerBrowseHandlers(): void {
  registerBrowseSidebarHandlers();
}

export function notifyPlayerStateFromFileLoaded(): void {
  const current = mpv.getString("stream-open-filename") || "";
  const normalized = normalizeMediaURL(current);
  const watchUrl = (preferences.get("last_watch_url") as string | undefined) || "";

  if (isYouTubeWatchURL(watchUrl) || /googlevideo\.com/i.test(normalized)) {
    postPlayerState();
    startPlayerStatePolling();
  }
}