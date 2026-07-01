import type { FeedItem } from "../types";
import { applyFeedFilters } from "../filter";

export function postProcessFeedItems(items: FeedItem[]): FeedItem[] {
  return applyFeedFilters(items);
}
