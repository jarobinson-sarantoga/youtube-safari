import type { FeedItem, FeedTab, SubsFilter } from "../../browse/types";
import { feedState } from "./state";

export function getActiveTab(): FeedTab {
  return feedState.activeTab;
}

export function getActiveSubsFilter(): SubsFilter {
  return feedState.activeSubsFilter;
}

export function getFeedItems(): FeedItem[] {
  return feedState.feedItems;
}

export function getSelectedIndex(): number {
  return feedState.selectedIndex;
}

export function setSelectedIndex(index: number): void {
  feedState.selectedIndex = index;
}

export function isFeedLoading(): boolean {
  return feedState.feedLoading;
}

export function getLastFeedError(): string {
  return feedState.lastFeedError;
}

export function getFeedEmptyHint(): string {
  return feedState.feedEmptyHint;
}

export function getShortsContinuation(): string {
  return feedState.shortsContinuation;
}

export function isShortsLoadingMore(): boolean {
  return feedState.shortsLoadingMore;
}
