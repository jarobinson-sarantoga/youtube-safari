import {
  getYouTubeVideoId,
  isYouTubeWatchURL,
  youtubeThumbnailUrl,
} from "../../youtube";
import { getLastWatchUrl } from "../../preferences";
import { postSidebarPanelMessage } from "../../panel-relay";
import {
  postShortsQueueStateFromPlayer,
} from "../../shorts-queue";
import {
  markWatchEnded,
  recordWatchStart,
  updateWatchProgress,
} from "../store/history";
import { fetchSponsorSegments, startSponsorBlockMonitor, stopSponsorBlockMonitor } from "../../sponsorblock";
import { setPlaybackSpeed } from "../../playback-speed";
import { getDefaultPlaybackSpeed } from "../../preferences";
import { playNextInQueue } from "../../queue/auto-play";
import {
  postPlayerState,
  startPlayerStatePolling,
  stopPlayerStatePolling,
} from "./player-state";

const { core, event, mpv } = iina;

let watchProgressTimer: ReturnType<typeof setInterval> | null = null;

async function onYouTubeFileLoaded(): Promise<void> {
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
    setPlaybackSpeed(getDefaultPlaybackSpeed());
    const segments = await fetchSponsorSegments(videoId);
    startSponsorBlockMonitor(segments);
  }
  postPlayerState();
  postShortsQueueStateFromPlayer(watchUrl);
  startPlayerStatePolling();
}

export function registerPlaybackHooks(): void {
  event.on("iina.file-loaded", () => {
    void onYouTubeFileLoaded();
  });

  event.on("mpv.end-file", () => {
    stopSponsorBlockMonitor();
    markWatchEnded();
    postPlayerState();
    if (core.status.idle) {
      stopPlayerStatePolling();
      return;
    }
    if (playNextInQueue()) {
      postSidebarPanelMessage("queueStale", {});
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
  stopSponsorBlockMonitor();
}
