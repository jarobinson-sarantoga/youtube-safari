import type { FeedItem, FeedTab, SubsFilter } from "../../browse/types";

export interface FeedSnapshot {
  items: FeedItem[];
  statusText: string;
  emptyHint: string;
  shortsContinuation?: string;
  selectedIndex?: number;
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
    continuation?: string;
    append?: boolean;
  }) => void;
  formatFeedCount: (n: number) => string;
}

export interface FeedControllerState {
  activeTab: FeedTab;
  activeSubsFilter: SubsFilter;
  feedItems: FeedItem[];
  selectedIndex: number;
  feedRequestId: number;
  feedLoading: boolean;
  feedEmptyHint: string;
  lastFeedError: string;
  shortsContinuation: string;
  shortsLoadingMore: boolean;
}

export const feedState: FeedControllerState = {
  activeTab: "home",
  activeSubsFilter: "all",
  feedItems: [],
  selectedIndex: -1,
  feedRequestId: 0,
  feedLoading: false,
  feedEmptyHint: "",
  lastFeedError: "",
  shortsContinuation: "",
  shortsLoadingMore: false,
};

export const loadedTabs = new Set<string>();
export const feedSnapshots = new Map<string, FeedSnapshot>();

let controllerDeps: FeedControllerDeps | null = null;

export function setFeedControllerDeps(deps: FeedControllerDeps): void {
  controllerDeps = deps;
}

export function requireFeedControllerDeps(): FeedControllerDeps {
  if (!controllerDeps) {
    throw new Error("Feed controller not initialized");
  }
  return controllerDeps;
}

export function feedCacheKey(
  tab: FeedTab,
  subsFilter: SubsFilter = feedState.activeSubsFilter,
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
