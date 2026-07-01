import type { FeedResultMessage } from "../../browse/messages";
import { getYouTubeVideoId } from "../../youtube";
import { postToPlugin } from "../messaging";
import {
  feedCacheKey,
  feedSnapshots,
  feedState,
  loadedTabs,
  requireFeedControllerDeps,
} from "./state";
import { saveFeedSnapshot } from "./snapshots";

export function handleFeedResult(data: FeedResultMessage): void {
  const deps = requireFeedControllerDeps();
  if (typeof data.requestId === "number" && data.requestId !== feedState.feedRequestId) {
    return;
  }
  if (data.tab !== feedState.activeTab) {
    return;
  }
  if (data.tab === "subscriptions" && (data.subsFilter || "all") !== feedState.activeSubsFilter) {
    return;
  }
  if (data.tab === "search" && (data.query ?? "") !== deps.getSearchQuery()) {
    return;
  }

  const append = data.append === true && data.tab === "shorts";
  if (append) {
    feedState.shortsLoadingMore = false;
    feedState.feedLoading = false;
    deps.setFeedRefreshSpinning(false);
    if (data.error) {
      feedState.lastFeedError = data.error;
      deps.renderFeedList();
      return;
    }
    feedState.lastFeedError = "";
    const seen = new Set(feedState.feedItems.map((item) => item.videoId));
    const added: string[] = [];
    for (const item of data.items || []) {
      if (!seen.has(item.videoId)) {
        seen.add(item.videoId);
        feedState.feedItems.push(item);
        added.push(item.videoId);
      }
    }
    feedState.shortsContinuation = data.continuation || "";
    if (added.length) {
      postToPlugin("appendShortsQueue", { videoIds: added });
    }
    deps.setStatus(deps.formatFeedCount(feedState.feedItems.length));
    deps.renderFeedList();
    return;
  }

  feedState.feedLoading = false;
  deps.setFeedRefreshSpinning(false);

  if (data.error) {
    feedState.lastFeedError = data.error;
    feedState.feedItems = [];
    feedState.feedEmptyHint = "";
    const subsFilter = data.subsFilter || "all";
    const searchQuery = data.tab === "search" ? deps.getSearchQuery() : "";
    const key = feedCacheKey(data.tab, subsFilter, searchQuery);
    loadedTabs.delete(key);
    feedSnapshots.delete(key);
    deps.renderFeedList();
    return;
  }

  feedState.lastFeedError = "";
  feedState.feedItems = data.items || [];
  feedState.selectedIndex = feedState.feedItems.length > 0 ? 0 : -1;
  feedState.feedEmptyHint = !feedState.feedItems.length ? data.emptyHint || "" : "";
  if (data.tab === "shorts") {
    feedState.shortsContinuation = data.continuation || "";
    feedState.shortsLoadingMore = false;
  }
  const subsFilter = data.subsFilter || "all";
  const searchQuery = data.tab === "search" ? deps.getSearchQuery() : "";
  loadedTabs.add(feedCacheKey(data.tab, subsFilter, searchQuery));

  if (feedState.feedItems.length) {
    deps.setStatus(deps.formatFeedCount(feedState.feedItems.length));
  } else {
    deps.clearStatus();
  }

  saveFeedSnapshot(data.tab, subsFilter, searchQuery);
  deps.renderFeedList();

  if (data.tab === "related" && feedState.feedItems.length > 0) {
    const videoId = getYouTubeVideoId(deps.getCurrentWatchUrl()) || "";
    loadedTabs.add("related-preview");
    deps.renderRelatedPreview(videoId, feedState.feedItems);
  }
}
