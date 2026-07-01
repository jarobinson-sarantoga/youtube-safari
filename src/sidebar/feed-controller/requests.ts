import type { FeedTab, SubsFilter } from "../../browse/types";
import { feedCacheKey, feedSnapshots, feedState, requireFeedControllerDeps } from "./state";

export function refreshCurrentFeed(): void {
  const deps = requireFeedControllerDeps();
  if (feedState.activeTab === "search") {
    const query = deps.getSearchQuery();
    if (query) {
      requestFeed("search", query, feedState.activeSubsFilter, true);
    }
    return;
  }
  requestFeed(feedState.activeTab, "", feedState.activeSubsFilter, true);
}

export function requestFeed(
  tab: FeedTab,
  query = "",
  subsFilter: SubsFilter = feedState.activeSubsFilter,
  force = false,
  background = false,
  options?: { continuation?: string; append?: boolean },
): void {
  const deps = requireFeedControllerDeps();
  feedState.activeTab = tab;
  if (tab === "subscriptions") {
    feedState.activeSubsFilter = subsFilter;
  }
  deps.updateSegButtons();
  deps.updateSubsFilterUI();

  const append = !!options?.append;
  const continuation = options?.continuation || "";

  if (tab === "shorts" && !append && !continuation) {
    feedState.shortsContinuation = "";
  }

  const cacheKey = feedCacheKey(tab, subsFilter, tab === "search" ? query : "");
  const snapshot = !force && !append && !continuation ? feedSnapshots.get(cacheKey) : undefined;
  const keepVisible = background && feedState.feedItems.length > 0;

  if (keepVisible) {
    feedState.feedLoading = true;
    feedState.lastFeedError = "";
    feedState.feedEmptyHint = "";
    deps.setStatus("Refreshing…");
    deps.setFeedBusy(false);
    deps.setSearchBusy(false);
    deps.setFeedRefreshSpinning(true);
  } else if (snapshot) {
    feedState.feedItems = [...snapshot.items];
    feedState.feedEmptyHint = snapshot.emptyHint;
    feedState.lastFeedError = "";
    feedState.feedLoading = true;
    feedState.selectedIndex = feedState.feedItems.length > 0 ? 0 : -1;
    deps.setStatus(snapshot.statusText || "Refreshing…");
    deps.setFeedBusy(false);
    deps.setSearchBusy(false);
    deps.renderFeedList();
    deps.setFeedRefreshSpinning(true);
  } else if (append) {
    feedState.shortsLoadingMore = true;
    deps.setStatus("Loading more…");
  } else {
    deps.setStatus("Loading…");
    feedState.feedLoading = true;
    feedState.feedEmptyHint = "";
    feedState.lastFeedError = "";
    feedState.feedItems = [];
    feedState.selectedIndex = -1;
    deps.setFeedBusy(true);
    deps.setSearchBusy(true);
    deps.renderSkeleton();
    deps.setFeedRefreshSpinning(true);
  }

  const requestId = ++feedState.feedRequestId;
  deps.postBrowseRefresh({
    tab,
    query: tab === "search" ? query : undefined,
    subsFilter: tab === "subscriptions" ? feedState.activeSubsFilter : undefined,
    force: force || undefined,
    requestId,
    continuation: continuation || undefined,
    append: append || undefined,
  });
}

export function requestLoadMoreShorts(): void {
  if (feedState.activeTab !== "shorts" || !feedState.shortsContinuation) {
    return;
  }
  requestFeed("shorts", "", feedState.activeSubsFilter, false, false, {
    continuation: feedState.shortsContinuation,
    append: true,
  });
}
