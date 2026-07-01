import type { FeedTab, SubsFilter } from "../../browse/types";

export function shouldAcceptShortsQueueState(
  source: "shorts" | "subs-shorts" | undefined,
  tab: FeedTab,
  subsFilter: SubsFilter,
): boolean {
  if (source === "shorts") {
    return tab === "shorts";
  }
  if (source === "subs-shorts") {
    return tab === "subscriptions" && subsFilter === "shorts";
  }
  return false;
}

export function resolveShortsQueueSelectionIndex(
  videoId: string | undefined,
  fallbackIndex: number,
  items: Array<{ videoId: string }>,
  currentIndex: number,
): number | null {
  if (fallbackIndex < 0) {
    return null;
  }
  let index =
    typeof videoId === "string"
      ? items.findIndex((item) => item.videoId === videoId)
      : -1;
  if (index < 0) {
    index = fallbackIndex;
  }
  if (index < 0 || index >= items.length || index === currentIndex) {
    return null;
  }
  return index;
}
