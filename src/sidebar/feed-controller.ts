import type { FeedItem, FeedTab, SubsFilter } from "../browse/types";
import type { FeedResultMessage } from "../browse/messages";
import { getYouTubeVideoId } from "../youtube";

export interface FeedSnapshot {
  items: FeedItem[];
  statusText: string;
  emptyHint: string;
}

export interface FeedControllerDeps {
  setStatus: (text: string, isError?: boolean) => void;
  clearStatus: () => void;
  setFeedBusy: (busy: boolean) => void;
  setSearchBusy: (busy: boolean) => void;
  setFeedRefreshSpinning: (spinning: boolean) => void;
  renderFeedList: () => void;
  renderSkeleton: () => void;
  updateSegButtons: () => void;
  updateSubsFilterUI: () => void;
  getSearchQuery: () => string;
  getCurrentWatchUrl: () => string;
  renderRelatedPreview: (videoId: string, items: FeedItem[]) => void;
  postBrowseRefresh: (payload: {
    tab: FeedTab;
    query?: string;
    subsFilter?: SubsFilter;
    force?: boolean;
    requestId: number;
  }) => void;
  formatFeedCount: (n: number) => string;
}

let deps: FeedControllerDeps | null = null;

let activeTab: FeedTab = "home";
let activeSubsFilter: SubsFilter = "all";
let feedItems: FeedItem[] = [];
let selectedIndex = -1;
let feedRequestId = 0;
let feedLoading = false;
let feedEmptyHint = "";
let lastFeedError = "";
const loadedTabs = new Set<string>();
const feedSnapshots = new Map<string, FeedSnapshot>();

export function initFeedController(controllerDeps: FeedControllerDeps): void {
  deps = controllerDeps;
}

export function getActiveTab(): FeedTab {
  return activeTab;
}

export function getActiveSubsFilter(): SubsFilter {
  return activeSubsFilter;
}

export function getFeedItems(): FeedItem[] {
  return feedItems;
}

export function getSelectedIndex(): number {
  return selectedIndex;
}

export function setSelectedIndex(index: number): void {
  selectedIndex = index;
}

export function isFeedLoading(): boolean {
  return feedLoading;
}

export function getLastFeedError(): string {
  return lastFeedError;
}

export function getFeedEmptyHint(): string {
  return feedEmptyHint;
}

export function feedCacheKey(
  tab: FeedTab,
  subsFilter: SubsFilter = activeSubsFilter,
  query = "",
): string {
  if (tab === "subscriptions") {
    return `subscriptions:${subsFilter}`;
  }
  if (tab === "search") {
    return `search:${query.trim().toLowerCase()}`;
  }
  return tab;
}

function requireDeps(): FeedControllerDeps {
  if (!deps) {
    throw new Error("Feed controller not initialized");
  }
  return deps;
}

function saveFeedSnapshot(tab: FeedTab, subsFilter: SubsFilter, query: string): void {
  const key = feedCacheKey(tab, subsFilter, query);
  const d = requireDeps();
  feedSnapshots.set(key, {
    items: feedItems,
    statusText: feedItems.length > 0 ? d.formatFeedCount(feedItems.length) : "",
    emptyHint: feedEmptyHint,
  });
}

export function refreshCurrentFeed(): void {
  const d = requireDeps();
  if (activeTab === "search") {
    const query = d.getSearchQuery();
    if (query) {
      requestFeed("search", query, activeSubsFilter, true);
    }
    return;
  }
  requestFeed(activeTab, "", activeSubsFilter, true);
}

export function requestFeed(
  tab: FeedTab,
  query = "",
  subsFilter = activeSubsFilter,
  force = false,
  background = false,
): void {
  const d = requireDeps();
  activeTab = tab;
  if (tab === "subscriptions") {
    activeSubsFilter = subsFilter;
  }
  d.updateSegButtons();
  d.updateSubsFilterUI();

  const cacheKey = feedCacheKey(tab, subsFilter, tab === "search" ? query : "");
  const snapshot = !force ? feedSnapshots.get(cacheKey) : undefined;
  const keepVisible = background && feedItems.length > 0;

  if (keepVisible) {
    feedLoading = true;
    lastFeedError = "";
    feedEmptyHint = "";
    d.setStatus("Refreshing…");
    d.setFeedBusy(false);
    d.setSearchBusy(false);
    d.setFeedRefreshSpinning(true);
  } else if (snapshot) {
    feedItems = [...snapshot.items];
    feedEmptyHint = snapshot.emptyHint;
    lastFeedError = "";
    feedLoading = true;
    selectedIndex = feedItems.length > 0 ? 0 : -1;
    d.setStatus(snapshot.statusText || "Refreshing…");
    d.setFeedBusy(false);
    d.setSearchBusy(false);
    d.renderFeedList();
    d.setFeedRefreshSpinning(true);
  } else {
    d.setStatus("Loading…");
    feedLoading = true;
    feedEmptyHint = "";
    lastFeedError = "";
    feedItems = [];
    selectedIndex = -1;
    d.setFeedBusy(true);
    d.setSearchBusy(true);
    d.renderSkeleton();
    d.setFeedRefreshSpinning(true);
  }

  const requestId = ++feedRequestId;
  d.postBrowseRefresh({
    tab,
    query: tab === "search" ? query : undefined,
    subsFilter: tab === "subscriptions" ? activeSubsFilter : undefined,
    force: force || undefined,
    requestId,
  });
}

export function handleFeedResult(data: FeedResultMessage): void {
  const d = requireDeps();
  if (typeof data.requestId === "number" && data.requestId !== feedRequestId) {
    return;
  }
  if (data.tab !== activeTab) {
    return;
  }
  if (
    data.tab === "subscriptions" &&
    (data.subsFilter || "all") !== activeSubsFilter
  ) {
    return;
  }
  if (data.tab === "search") {
    const currentQuery = d.getSearchQuery();
    if ((data.query ?? "") !== currentQuery) {
      return;
    }
  }

  feedLoading = false;
  d.setFeedRefreshSpinning(false);

  if (data.error) {
    lastFeedError = data.error;
    feedItems = [];
    feedEmptyHint = "";
    const subsFilter = data.subsFilter || "all";
    const searchQuery = data.tab === "search" ? d.getSearchQuery() : "";
    const key = feedCacheKey(data.tab, subsFilter, searchQuery);
    loadedTabs.delete(key);
    feedSnapshots.delete(key);
    d.renderFeedList();
    return;
  }

  lastFeedError = "";
  feedItems = data.items || [];
  selectedIndex = feedItems.length > 0 ? 0 : -1;
  feedEmptyHint = !feedItems.length ? data.emptyHint || "" : "";
  const subsFilter = data.subsFilter || "all";
  const searchQuery = data.tab === "search" ? d.getSearchQuery() : "";
  loadedTabs.add(feedCacheKey(data.tab, subsFilter, searchQuery));

  if (feedItems.length) {
    d.setStatus(d.formatFeedCount(feedItems.length));
  } else {
    d.clearStatus();
  }

  saveFeedSnapshot(data.tab, subsFilter, searchQuery);
  d.renderFeedList();

  if (data.tab === "related" && feedItems.length > 0) {
    const videoId = getYouTubeVideoId(d.getCurrentWatchUrl()) || "";
    loadedTabs.add("related-preview");
    d.renderRelatedPreview(videoId, feedItems);
  }
}

export function switchSegmentTab(tab: FeedTab): void {
  const cacheKey = feedCacheKey(tab);
  if (tab === activeTab && loadedTabs.has(cacheKey) && feedSnapshots.has(cacheKey)) {
    return;
  }
  requestFeed(tab);
}

export function ensureBrowseFeedLoaded(): void {
  if (activeTab === "search") {
    return;
  }
  const key = feedCacheKey(activeTab);
  if (!loadedTabs.has(key)) {
    requestFeed(activeTab);
  }
}

export function onWatchUrlChanged(): void {
  loadedTabs.delete("related");
  loadedTabs.delete("related-preview");
  feedSnapshots.delete("related");
  if (activeTab === "related") {
    requestFeed("related");
  }
}

export function onHistoryStale(): void {
  loadedTabs.delete("history");
  feedSnapshots.delete("history");
  if (activeTab === "history") {
    requestFeed("history");
  }
}

export function onFeedsStale(): void {
  loadedTabs.clear();
  feedSnapshots.clear();
  if (feedItems.length > 0) {
    if (activeTab === "search") {
      const query = requireDeps().getSearchQuery();
      if (query) {
        requestFeed("search", query, activeSubsFilter, true, true);
        return;
      }
    }
    requestFeed(activeTab, "", activeSubsFilter, true, true);
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
  activeTab = "search";
}

export function isSubsFilterLoaded(filter: SubsFilter): boolean {
  return loadedTabs.has(feedCacheKey("subscriptions", filter));
}