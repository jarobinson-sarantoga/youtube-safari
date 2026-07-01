import { dedupeVideoIds } from "./dedupe";
import { openShortsQueue } from "./open";
import { seekShortsQueueIndex } from "./seek";
import { getActiveShortsQueue } from "./state";
import type { ShortsQueueSource } from "./types";

function sameQueueOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function playShortsQueue(
  videoIds: string[],
  startIndex: number,
  source: ShortsQueueSource,
  titles?: string[],
): boolean {
  const ids = dedupeVideoIds(videoIds);
  if (!ids.length) {
    return false;
  }
  const index = Math.min(Math.max(startIndex, 0), ids.length - 1);
  const active = getActiveShortsQueue();
  if (active && active.source === source && sameQueueOrder(active.videoIds, ids)) {
    return seekShortsQueueIndex(index);
  }
  return openShortsQueue(ids, index, source, titles);
}
