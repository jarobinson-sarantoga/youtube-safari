import { registerBrowseSidebarHandlers } from "./bridge";
import { invalidateBrowseSessionCaches } from "./session-invalidate";
import { flushPendingCache } from "./store/cache";

import {
  flushPendingHistory,
  markWatchEnded,
  recordWatchStart,
  updateWatchProgress,
} from "./store/history";
import {
  getYouTubeVideoId,
  isYouTubeWatchURL,
  normalizeMediaURL,
  youtubeThumbnailUrl,
} from "../youtube";
import { notifyCookieHealthIfNeeded } from "../cookie-health";
import { isBackgroundHidePending } from "../background-play";
import { isIntentionalPlayerClose, markPlayerShuttingDown } from "../lifecycle";
import { cancelSeekRetries } from "../youtube-open";
import { getLastWatchUrl } from "../preferences";
import { postPanelMessage, postSidebarPanelMessage } from "../panel-relay";
import { appendLog } from "../ytdl";
import type { PlayerStateMessage } from "./messages";

const { core, event, global, mpv } = iina;

let browseInstalled = false;
let playerStateTimer: ReturnType<typeof setInterval> | null = null;
let watchProgressTimer: ReturnType<typeof setInterval> | null = null;

function buildPlayerState(): PlayerStateMessage {
  const watchUrl = getLastWatchUrl();
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

export function postPlayerState(): void {
  postSidebarPanelMessage("playerState", buildPlayerState());
}

function startPlayerStatePolling(): void {
  if (playerStateTimer) {
    return;
  }
  playerStateTimer = setInterval(() => {
    postPlayerState();
  }, 1000);
}

function stopPlayerStatePolling(): void {
  if (playerStateTimer) {
    clearInterval(playerStateTimer);
    playerStateTimer = null;
  }
}

function onYouTubeFileLoaded(): void {
  const watchUrl = getLastWatchUrl();
  if (isYouTubeWatchURL(watchUrl)) {
    const title =
      mpv.getString("file-local-options/force-media-title") ||
      mpv.getString("media-title") ||
      core.status.title ||
      "Untitled";
    const videoId = getYouTubeVideoId(watchUrl) || "";
    const thumb = videoId ? youtubeThumbnailUrl(videoId) : "";
    recordWatchStart(watchUrl, title, "", thumb);
    postSidebarPanelMessage("historyStale", {});
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

  watchProgressTimer = setInterval(() => {
    const watchUrl = getLastWatchUrl();
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

function stopWatchProgressPolling(): void {
  if (watchProgressTimer) {
    clearInterval(watchProgressTimer);
    watchProgressTimer = null;
  }
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
    if (isBackgroundHidePending() && !isIntentionalPlayerClose()) {
      appendLog("window-will-close skipped (background hide)");
      return;
    }
    const label =
      typeof global.getLabel === "function" ? global.getLabel() : "";
    if (label === "youtube-open" && !isIntentionalPlayerClose()) {
      appendLog("window-will-close skipped (managed youtube-open)");
      return;
    }
    markPlayerShuttingDown();
    stopPlayerStatePolling();
    stopWatchProgressPolling();
    cancelSeekRetries();
    flushPendingCache();
    flushPendingHistory();
    global.postMessage("playerClosed", {});
  });

  global.onMessage("cookiesRefreshed", () => {
    notifyCookiesRefreshed();
  });

  notifyCookieHealthIfNeeded({ osd: true });
  appendLog("Browse module installed");
}

export function notifyCookiesRefreshed(): void {
  invalidateBrowseSessionCaches();
  postPanelMessage("feedsStale", {});
}

/** Re-register browse handlers after sidebar.loadFile (IINA clears listeners). */
export function registerBrowseHandlers(): void {
  registerBrowseSidebarHandlers();
}

export function notifyPlayerStateFromFileLoaded(): void {
  const current = mpv.getString("stream-open-filename") || "";
  const normalized = normalizeMediaURL(current);
  const watchUrl = getLastWatchUrl();

  if (isYouTubeWatchURL(watchUrl) || /googlevideo\.com/i.test(normalized)) {
    postPlayerState();
    startPlayerStatePolling();
  }
}

/** Push full Now Playing metadata and live playback state to the panel. */
export function syncNowPlayingToPanel(): void {
  postPlayerState();
  startPlayerStatePolling();
}