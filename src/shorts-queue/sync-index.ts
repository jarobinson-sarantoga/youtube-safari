/** Resolve queue index by videoId only — never fall back to playlist position. */
export function resolveQueueIndexByVideoId(videoId: string, queueIds: string[]): number {
  if (!videoId) {
    return -1;
  }
  return queueIds.indexOf(videoId);
}
