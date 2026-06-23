import type { FeedTab, SubsFilter } from "../../browse/types";
import {
  feedCacheKey,
  feedSnapshots,
  feedState,
  requireFeedControllerDeps,
} from "./state";

export function saveFeedSnapshot(tab: FeedTab, subsFilter: SubsFilter, query: string): void {
  const key = feedCacheKey(tab, subsFilter, query);
  const deps = requireFeedControllerDeps();
  feedSnapshots.set(key, {
    items: feedState.feedItems,
    statusText: feedState.feedItems.length > 0 ? deps.formatFeedCount(feedState.feedItems.length) : "",
    emptyHint: feedState.feedEmptyHint,
  });
}
