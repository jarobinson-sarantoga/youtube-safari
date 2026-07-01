import type { FeedItem } from "../../types";
import { getWatchLaterData, writeWatchLater } from "./storage";
import type { WatchLaterEntry } from "./types";
import { MAX_WATCH_LATER } from "./types";

export { flushWatchLater } from "./storage";

export function isInWatchLater(videoId: string): boolean {
  return getWatchLaterData().entries.some((e) => e.videoId === videoId);
}

export function addToWatchLater(item: FeedItem): boolean {
  const data = getWatchLaterData();
  if (data.entries.some((e) => e.videoId === item.videoId)) {
    return false;
  }
  const entry: WatchLaterEntry = {
    videoId: item.videoId,
    title: item.title,
    channelTitle: item.channelTitle,
    channelId: item.channelId,
    thumbnailUrl: item.thumbnailUrl,
    addedAt: Date.now(),
    durationLabel: item.durationLabel,
  };
  data.entries.unshift(entry);
  if (data.entries.length > MAX_WATCH_LATER) {
    data.entries.length = MAX_WATCH_LATER;
  }
  writeWatchLater(data);
  return true;
}

export function removeFromWatchLater(videoId: string): boolean {
  const data = getWatchLaterData();
  const before = data.entries.length;
  data.entries = data.entries.filter((e) => e.videoId !== videoId);
  if (data.entries.length === before) {
    return false;
  }
  writeWatchLater(data);
  return true;
}

export function toggleWatchLater(item: FeedItem): boolean {
  if (isInWatchLater(item.videoId)) {
    removeFromWatchLater(item.videoId);
    return false;
  }
  addToWatchLater(item);
  return true;
}

export function getWatchLaterItems(): FeedItem[] {
  return getWatchLaterData().entries.map((entry) => ({
    videoId: entry.videoId,
    title: entry.title,
    channelTitle: entry.channelTitle,
    channelId: entry.channelId,
    thumbnailUrl: entry.thumbnailUrl,
    durationLabel: entry.durationLabel,
    publishedAt: "Saved",
  }));
}
