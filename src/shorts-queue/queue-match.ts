import type { ShortsQueueSource } from "./types";

export function sameQueueOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function shouldSeekExistingQueue(
  active: { source: ShortsQueueSource; videoIds: string[] } | null,
  videoIds: string[],
  source: ShortsQueueSource,
): boolean {
  return !!active && active.source === source && sameQueueOrder(active.videoIds, videoIds);
}
