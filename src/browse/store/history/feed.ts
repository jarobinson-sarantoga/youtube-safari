import type { FeedItem } from "../../types";
import { formatClock } from "../../../format";
import type { HistoryEntry } from "./types";
import { getHistoryData } from "./storage";

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
