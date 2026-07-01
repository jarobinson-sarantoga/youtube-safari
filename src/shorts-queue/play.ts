import { clampQueueStartIndex } from "./clamp-index";
import { dedupeVideoIds } from "./dedupe";
import { openShortsQueue } from "./open";
import { shouldSeekExistingQueue } from "./queue-match";
import { seekShortsQueueIndex } from "./seek";
import { getActiveShortsQueue } from "./state";
import type { ShortsQueueSource } from "./types";

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
  const index = clampQueueStartIndex(startIndex, ids.length);
  const active = getActiveShortsQueue();
  if (shouldSeekExistingQueue(active, ids, source)) {
    return seekShortsQueueIndex(index);
  }
  return openShortsQueue(ids, index, source, titles);
}
