export function mergeAppendFeedItems<T extends { videoId: string }>(
  existing: T[],
  incoming: T[],
): { items: T[]; added: string[] } {
  const seen = new Set(existing.map((item) => item.videoId));
  const items = [...existing];
  const added: string[] = [];
  for (const item of incoming) {
    if (!seen.has(item.videoId)) {
      seen.add(item.videoId);
      items.push(item);
      added.push(item.videoId);
    }
  }
  return { items, added };
}
