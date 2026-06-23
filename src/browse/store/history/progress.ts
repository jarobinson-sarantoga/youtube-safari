import { getHistoryData, writeHistory } from "./storage";

let lastWrittenPosition = -1;
let lastWriteTime = 0;
let progressWriteTimer: ReturnType<typeof setTimeout> | null = null;
let activeVideoId = "";
let pendingProgress: { videoId: string; position: number; duration: number } | null =
  null;

export function getActiveVideoId(): string {
  return activeVideoId;
}

export function getPendingProgressVideoId(): string | undefined {
  return pendingProgress?.videoId;
}

export function setActiveVideoId(videoId: string): void {
  activeVideoId = videoId;
}

export function resetProgressDebounce(): void {
  if (progressWriteTimer) {
    clearTimeout(progressWriteTimer);
    progressWriteTimer = null;
  }
  pendingProgress = null;
  lastWrittenPosition = -1;
  lastWriteTime = 0;
}

function shouldPersistProgress(positionSeconds: number): boolean {
  if (lastWrittenPosition < 0) {
    return true;
  }
  if (Math.abs(positionSeconds - lastWrittenPosition) > 5) {
    return true;
  }
  return Date.now() - lastWriteTime >= 30000;
}

function flushWatchProgress(
  positionSeconds: number,
  durationSeconds: number,
  videoId: string,
): void {
  if (!videoId) {
    return;
  }

  const data = getHistoryData();
  const entry = data.entries.find((e) => e.videoId === videoId);
  if (!entry) {
    return;
  }

  entry.positionSeconds = positionSeconds;
  entry.durationSeconds = durationSeconds;
  entry.watchedAt = Date.now();
  writeHistory(data);
  lastWrittenPosition = positionSeconds;
  lastWriteTime = Date.now();
}

export function flushPendingProgress(): void {
  if (!pendingProgress) {
    return;
  }
  flushWatchProgress(
    pendingProgress.position,
    pendingProgress.duration,
    pendingProgress.videoId,
  );
  pendingProgress = null;
  if (progressWriteTimer) {
    clearTimeout(progressWriteTimer);
    progressWriteTimer = null;
  }
}

export function updateWatchProgressDebounced(
  positionSeconds: number,
  durationSeconds: number,
  videoId: string,
): void {
  activeVideoId = videoId;
  pendingProgress = {
    videoId,
    position: positionSeconds,
    duration: durationSeconds,
  };

  if (shouldPersistProgress(positionSeconds)) {
    if (progressWriteTimer) {
      clearTimeout(progressWriteTimer);
      progressWriteTimer = null;
    }
    flushWatchProgress(positionSeconds, durationSeconds, videoId);
    pendingProgress = null;
    return;
  }

  if (progressWriteTimer) {
    return;
  }

  progressWriteTimer = setTimeout(() => {
    progressWriteTimer = null;
    flushPendingProgress();
  }, 30000);
}

export function clearProgressWriteTimer(): void {
  if (progressWriteTimer) {
    clearTimeout(progressWriteTimer);
    progressWriteTimer = null;
  }
}
