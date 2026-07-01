import type { FeedItem } from "../../types";
import { getQueueData, writeQueue } from "./storage";
import type { QueueEntry } from "./types";
import { MAX_QUEUE } from "./types";

export { flushQueue } from "./storage";

export function isInQueue(videoId: string): boolean {
  return getQueueData().entries.some((e) => e.videoId === videoId);
}

export function addToQueue(item: FeedItem): boolean {
  const data = getQueueData();
  if (data.entries.some((e) => e.videoId === item.videoId)) {
    return false;
  }
  const entry: QueueEntry = {
    videoId: item.videoId,
    title: item.title,
    channelTitle: item.channelTitle,
    channelId: item.channelId,
    thumbnailUrl: item.thumbnailUrl,
    addedAt: Date.now(),
    durationLabel: item.durationLabel,
  };
  data.entries.push(entry);
  if (data.entries.length > MAX_QUEUE) {
    data.entries.length = MAX_QUEUE;
  }
  writeQueue(data);
  return true;
}

export function removeFromQueue(videoId: string): boolean {
  const data = getQueueData();
  const before = data.entries.length;
  data.entries = data.entries.filter((e) => e.videoId !== videoId);
  if (data.entries.length === before) {
    return false;
  }
  writeQueue(data);
  return true;
}

export function shiftQueue(): FeedItem | null {
  const data = getQueueData();
  const next = data.entries.shift();
  if (!next) {
    return null;
  }
  writeQueue(data);
  return {
    videoId: next.videoId,
    title: next.title,
    channelTitle: next.channelTitle,
    channelId: next.channelId,
    thumbnailUrl: next.thumbnailUrl,
    durationLabel: next.durationLabel,
  };
}

export function clearQueue(): void {
  writeQueue({ entries: [] });
}

export function getQueueItems(): FeedItem[] {
  return getQueueData().entries.map((entry, index) => ({
    videoId: entry.videoId,
    title: entry.title,
    channelTitle: entry.channelTitle,
    channelId: entry.channelId,
    thumbnailUrl: entry.thumbnailUrl,
    durationLabel: entry.durationLabel,
    publishedAt: index === 0 ? "Up next" : `+#${index}`,
  }));
}
