import type { FeedItem } from "../../browse/types";

export function resolveFeedSelectionIndex(
  items: FeedItem[],
  previousVideoId: string | null,
): number {
  if (!items.length) {
    return -1;
  }
  if (previousVideoId) {
    const index = items.findIndex((item) => item.videoId === previousVideoId);
    if (index >= 0) {
      return index;
    }
  }
  return 0;
}
