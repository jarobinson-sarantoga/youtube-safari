import type { FeedTab, SubsFilter } from "../../browse/types";
import { refreshCurrentFeed, requestFeed } from "./requests";
import {
  feedCacheKey,
  feedSnapshots,
  feedState,
  loadedTabs,
  requireFeedControllerDeps,
} from "./state";

export function switchSegmentTab(tab: FeedTab): void {
  const cacheKey = feedCacheKey(tab);
  if (
    tab === feedState.activeTab &&
    loadedTabs.has(cacheKey) &&
    feedSnapshots.has(cacheKey)
  ) {
    return;
  }
  requestFeed(tab);
}

export function ensureBrowseFeedLoaded(): void {
  if (feedState.activeTab === "search") {
    return;
  }
  const key = feedCacheKey(feedState.activeTab);
  if (!loadedTabs.has(key)) {
    requestFeed(feedState.activeTab);
  }
}

export function onWatchUrlChanged(): void {
  loadedTabs.delete("related");
  loadedTabs.delete("related-preview");
  feedSnapshots.delete("related");
  if (feedState.activeTab === "related") {
    requestFeed("related");
  }
}

export function onHistoryStale(): void {
  loadedTabs.delete("history");
  feedSnapshots.delete("history");
  if (feedState.activeTab === "history") {
    requestFeed("history");
  }
}

export function onWatchLaterStale(): void {
  loadedTabs.delete("later");
  feedSnapshots.delete("later");
  if (feedState.activeTab === "later") {
    requestFeed("later");
  }
}

export function onQueueStale(): void {
  loadedTabs.delete("queue");
  feedSnapshots.delete("queue");
  if (feedState.activeTab === "queue") {
    requestFeed("queue");
  }
}

export function onBlocklistStale(): void {
  loadedTabs.clear();
  feedSnapshots.clear();
  refreshCurrentFeed();
}

export function onFeedsStale(): void {
  loadedTabs.clear();
  feedSnapshots.clear();
  if (feedState.feedItems.length > 0) {
    if (feedState.activeTab === "search") {
      const query = requireFeedControllerDeps().getSearchQuery();
      if (query) {
        requestFeed("search", query, feedState.activeSubsFilter, true, true);
        return;
      }
    }
    requestFeed(feedState.activeTab, "", feedState.activeSubsFilter, true, true);
    return;
  }
  refreshCurrentFeed();
}

export function onBrowseReady(): void {
  if (!loadedTabs.has(feedCacheKey("home"))) {
    requestFeed("home");
  }
}

export function setActiveTabForSearch(): void {
  feedState.activeTab = "search";
}

export function isSubsFilterLoaded(filter: SubsFilter): boolean {
  return loadedTabs.has(feedCacheKey("subscriptions", filter));
}
