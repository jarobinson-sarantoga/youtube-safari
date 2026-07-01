import type { FeedItem } from "../../browse/types";

export type SearchDurationFilter = "any" | "short" | "medium" | "long";

let activeFilter: SearchDurationFilter = "any";

export function getSearchDurationFilter(): SearchDurationFilter {
  return activeFilter;
}

export function setSearchDurationFilter(filter: SearchDurationFilter): void {
  activeFilter = filter;
}

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

export function applySearchDurationFilter(items: FeedItem[]): FeedItem[] {
  if (activeFilter === "any") {
    return items;
  }
  return items.filter((item) => {
    const seconds = parseDurationLabel(item.durationLabel);
    if (seconds === null) {
      return true;
    }
    if (activeFilter === "short") {
      return seconds < 240;
    }
    if (activeFilter === "medium") {
      return seconds >= 240 && seconds <= 1200;
    }
    return seconds > 1200;
  });
}
