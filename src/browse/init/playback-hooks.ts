import {
  getYouTubeVideoId,
  isYouTubeWatchURL,
  youtubeThumbnailUrl,
} from "../../youtube";
import { getLastWatchUrl } from "../../preferences";
import { postSidebarPanelMessage } from "../../panel-relay";
import {
  markWatchEnded,
  recordWatchStart,
  updateWatchProgress,
} from "../store/history";
import {
  postPlayerState,
  startPlayerStatePolling,
  stopPlayerStatePolling,
} from "./player-state";

const { core, event, mpv } = iina;

let watchProgressTimer: ReturnType<typeof setInterval> | null = null;

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

export function registerPlaybackHooks(): void {
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

export function stopWatchProgressPolling(): void {
  if (watchProgressTimer) {
    clearInterval(watchProgressTimer);
    watchProgressTimer = null;
  }
}
