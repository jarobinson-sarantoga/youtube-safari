import type { FeedItem } from "../types";
import { appendLog } from "../../ytdl";
import { getYouTubeVideoId, isYouTubeWatchURL, normalizeMediaURL } from "../../youtube";

const { file, preferences } = iina;

const HISTORY_PATH = "@data/watch-history.json";
const MAX_ENTRIES = 200;

let skipNextWatchEnd = false;

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

function readHistory(): HistoryFile {
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

function writeHistory(data: HistoryFile): void {
  try {
    file.write(HISTORY_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    appendLog(`history write error: ${err}`);
  }
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
  const { entries } = readHistory();
  return entries.slice(0, limit).map((entry) => ({
    videoId: entry.videoId,
    title: entry.title,
    channelTitle: entry.channelTitle,
    thumbnailUrl: entry.thumbnailUrl,
    publishedAt: formatRelativeTime(entry.watchedAt),
    durationLabel: entry.durationSeconds
      ? formatDuration(entry.durationSeconds)
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

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
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

  const data = readHistory();
  const existing = data.entries.findIndex((e) => e.videoId === videoId);
  const entry: HistoryEntry = {
    videoId,
    watchUrl: url,
    title: title || "Untitled",
    channelTitle,
    thumbnailUrl: thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
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
  const watchUrl = (preferences.get("last_watch_url") as string | undefined) || "";
  const videoId = getYouTubeVideoId(watchUrl);
  if (!videoId) {
    return;
  }

  const data = readHistory();
  const entry = data.entries.find((e) => e.videoId === videoId);
  if (!entry) {
    return;
  }

  entry.positionSeconds = positionSeconds;
  entry.durationSeconds = durationSeconds;
  entry.watchedAt = Date.now();
  writeHistory(data);
}

export function markWatchEnded(): void {
  if (skipNextWatchEnd) {
    skipNextWatchEnd = false;
    return;
  }

  const watchUrl = (preferences.get("last_watch_url") as string | undefined) || "";
  const videoId = getYouTubeVideoId(watchUrl);
  if (!videoId) {
    return;
  }

  const data = readHistory();
  const entry = data.entries.find((e) => e.videoId === videoId);
  if (entry) {
    if (entry.durationSeconds && entry.durationSeconds > 0) {
      entry.positionSeconds = entry.durationSeconds;
    }
    entry.watchedAt = Date.now();
    writeHistory(data);
  }
}