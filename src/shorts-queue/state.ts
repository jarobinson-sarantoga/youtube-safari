import type { ShortsQueueSource } from "./types";

let activeQueue: {
  source: ShortsQueueSource;
  videoIds: string[];
} | null = null;

export function setActiveShortsQueue(
  source: ShortsQueueSource,
  videoIds: string[],
): void {
  activeQueue = { source, videoIds: [...videoIds] };
}

export function clearActiveShortsQueue(): void {
  activeQueue = null;
}

export function getActiveShortsQueue(): {
  source: ShortsQueueSource;
  videoIds: string[];
} | null {
  return activeQueue;
}

export function findShortsQueueIndex(videoId: string): number {
  if (!activeQueue || !videoId) {
    return -1;
  }
  return activeQueue.videoIds.indexOf(videoId);
}
