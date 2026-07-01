import type { FeedItem } from "../types";
import { filterBlockedItems } from "../store/blocklist";
import { isHideShortsEnabled } from "../../preferences";

export function applyFeedFilters(items: FeedItem[]): FeedItem[] {
  let filtered = filterBlockedItems(items);
  if (isHideShortsEnabled()) {
    filtered = filtered.filter((item) => !item.isShort);
  }
  return filtered;
}

export type SearchDurationFilter = "any" | "short" | "medium" | "long";

function parseDurationLabel(label?: string): number | null {
  if (!label) {
    return null;
  }
  const parts = label.split(":").map((p) => Number.parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) {
    return null;
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return null;
}

export function applySearchFilters(
  items: FeedItem[],
  duration: SearchDurationFilter,
): FeedItem[] {
  if (duration === "any") {
    return items;
  }
  return items.filter((item) => {
    const seconds = parseDurationLabel(item.durationLabel);
    if (seconds === null) {
      return true;
    }
    if (duration === "short") {
      return seconds < 240;
    }
    if (duration === "medium") {
      return seconds >= 240 && seconds <= 1200;
    }
    return seconds > 1200;
  });
}
