import type { FeedItem } from "../types";
import { formatClock } from "../../format";
import { getLastWatchUrl } from "../../preferences";
import { appendLog } from "../../ytdl";
import {
  getYouTubeVideoId,
  isYouTubeWatchURL,
  normalizeMediaURL,
  youtubeThumbnailUrl,
} from "../../youtube";

const { file } = iina;

const HISTORY_PATH = "@data/watch-history.json";
const MAX_ENTRIES = 200;
const DISK_FLUSH_MS = 250;

let skipNextWatchEnd = false;
let lastWrittenPosition = -1;
let lastWriteTime = 0;
let progressWriteTimer: ReturnType<typeof setTimeout> | null = null;
let activeVideoId = "";
let pendingProgress: { videoId: string; position: number; duration: number } | null =
  null;

let historyData: HistoryFile | null = null;
let historyHydrated = false;
let historyDirty = false;
let historyFlushTimer: ReturnType<typeof setTimeout> | null = null;

/** Skip the next end-file history update (e.g. quality reload on the same video). */
export function suppressNextWatchEnd(): void {
  skipNextWatchEnd = true;
}

export interface HistoryEntry {
  videoId: string;
  watchUrl: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  watchedAt: number;
  positionSeconds?: number;
  durationSeconds?: number;
}

interface HistoryFile {
  entries: HistoryEntry[];
}

function readHistoryFromDisk(): HistoryFile {
  if (!file.exists(HISTORY_PATH)) {
    return { entries: [] };
  }
  try {
    const raw = file.read(HISTORY_PATH);
    if (!raw) {
      return { entries: [] };
    }
    const parsed = JSON.parse(raw) as HistoryFile;
    if (Array.isArray(parsed.entries)) {
      return parsed;
    }
  } catch (err) {
    appendLog(`history read error: ${err}`);
  }
  return { entries: [] };
}

function writeHistoryToDisk(data: HistoryFile): void {
  try {
    file.write(HISTORY_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    appendLog(`history write error: ${err}`);
  }
}

function hydrateHistory(): void {
  if (historyHydrated) {
    return;
  }
  historyHydrated = true;
  historyData = readHistoryFromDisk();
}

function getHistoryData(): HistoryFile {
  hydrateHistory();
  return historyData!;
}

function scheduleHistoryFlush(): void {
  historyDirty = true;
  if (historyFlushTimer !== null) {
    return;
  }
  historyFlushTimer = setTimeout(() => {
    historyFlushTimer = null;
    flushHistoryToDisk();
  }, DISK_FLUSH_MS);
}

function flushHistoryToDisk(): void {
  if (!historyDirty || !historyData) {
    return;
  }
  historyDirty = false;
  writeHistoryToDisk(historyData);
}

function writeHistory(data: HistoryFile): void {
  historyData = data;
  historyHydrated = true;
  scheduleHistoryFlush();
}

function resumeSecondsForEntry(entry: HistoryEntry): number | undefined {
  const pos = entry.positionSeconds;
  const dur = entry.durationSeconds;
  if (typeof pos !== "number" || pos < 30) {
    return undefined;
  }
  if (typeof dur === "number" && dur > 0 && pos >= dur - 15) {
    return undefined;
  }
  return Math.floor(pos);
}

export function getHistoryItems(limit = 50): FeedItem[] {
  const { entries } = getHistoryData();
  return entries.slice(0, limit).map((entry) => ({
    videoId: entry.videoId,
    title: entry.title,
    channelTitle: entry.channelTitle,
    thumbnailUrl: entry.thumbnailUrl,
    publishedAt: formatRelativeTime(entry.watchedAt),
    durationLabel: entry.durationSeconds
      ? formatClock(entry.durationSeconds)
      : undefined,
    resumeSeconds: resumeSecondsForEntry(entry),
  }));
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) {
    return `${Math.max(1, minutes)}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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

  if (pendingProgress && pendingProgress.videoId !== videoId) {
    flushPendingProgress();
  } else {
    resetProgressDebounce();
  }
  activeVideoId = videoId;

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

function resetProgressDebounce(): void {
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

function flushPendingProgress(): void {
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

export function updateWatchProgress(
  positionSeconds: number,
  durationSeconds: number,
): void {
  const watchUrl = getLastWatchUrl();
  const videoId = getYouTubeVideoId(watchUrl);
  if (!videoId) {
    return;
  }

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

export function markWatchEnded(): void {
  const endingVideoId = pendingProgress?.videoId || activeVideoId;
  flushPendingProgress();

  if (skipNextWatchEnd) {
    skipNextWatchEnd = false;
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