import { getLastWatchUrl } from "../../../preferences";
import {
  getYouTubeVideoId,
  isYouTubeWatchURL,
  normalizeMediaURL,
  youtubeThumbnailUrl,
} from "../../../youtube";
import {
  MAX_ENTRIES,
  setSkipNextWatchEnd,
  skipNextWatchEnd,
  type HistoryEntry,
} from "./types";
import { getHistoryData, writeHistory } from "./storage";
import {
  flushPendingProgress,
  getActiveVideoId,
  getPendingProgressVideoId,
  resetProgressDebounce,
  setActiveVideoId,
  updateWatchProgressDebounced,
} from "./progress";

/** Skip the next end-file history update (e.g. quality reload on the same video). */
export function suppressNextWatchEnd(): void {
  setSkipNextWatchEnd(true);
}

export function recordWatchStart(
  rawUrl: string,
  title: string,
  channelTitle = "",
  thumbnailUrl = "",
): void {
  const url = normalizeMediaURL(rawUrl);
  if (!isYouTubeWatchURL(url)) {
    return;
  }
  const videoId = getYouTubeVideoId(url);
  if (!videoId) {
    return;
  }

  const pendingVideoId = getPendingProgressVideoId();
  if (pendingVideoId && pendingVideoId !== videoId) {
    flushPendingProgress();
  } else {
    resetProgressDebounce();
  }
  setActiveVideoId(videoId);

  const data = getHistoryData();
  const existing = data.entries.findIndex((e) => e.videoId === videoId);
  const entry: HistoryEntry = {
    videoId,
    watchUrl: url,
    title: title || "Untitled",
    channelTitle,
    thumbnailUrl: thumbnailUrl || youtubeThumbnailUrl(videoId),
    watchedAt: Date.now(),
  };

  if (existing >= 0) {
    const prev = data.entries[existing];
    entry.positionSeconds = prev.positionSeconds;
    entry.durationSeconds = prev.durationSeconds;
    data.entries.splice(existing, 1);
  }

  data.entries.unshift(entry);
  if (data.entries.length > MAX_ENTRIES) {
    data.entries.length = MAX_ENTRIES;
  }
  writeHistory(data);
}

export function updateWatchProgress(
  positionSeconds: number,
  durationSeconds: number,
): void {
  const watchUrl = getLastWatchUrl();
  const videoId = getYouTubeVideoId(watchUrl);
  if (!videoId) {
    return;
  }

  updateWatchProgressDebounced(positionSeconds, durationSeconds, videoId);
}

export function markWatchEnded(): void {
  const endingVideoId = getPendingProgressVideoId() || getActiveVideoId();
  flushPendingProgress();

  if (skipNextWatchEnd) {
    setSkipNextWatchEnd(false);
    return;
  }

  const videoId = endingVideoId;
  if (!videoId) {
    return;
  }

  const data = getHistoryData();
  const entry = data.entries.find((e) => e.videoId === videoId);
  if (entry) {
    if (entry.durationSeconds && entry.durationSeconds > 0) {
      entry.positionSeconds = entry.durationSeconds;
    }
    entry.watchedAt = Date.now();
    writeHistory(data);
  }
}
