import {
  getActiveSubsFilter,
  getActiveTab,
  getFeedItems,
  getSelectedIndex,
  setSelectedIndex,
} from "../feed-controller";
import {
  resolveShortsQueueSelectionIndex,
  shouldAcceptShortsQueueState,
} from "./shorts-queue-resolve";
import { scrollSelectedIntoView, updateFeedSelection } from "./feed-list";

export function handleShortsQueueState(raw: unknown): void {
  const data = raw as {
    videoId?: string;
    index?: number;
    source?: "shorts" | "subs-shorts";
  } | null;
  if (!data || typeof data.index !== "number") {
    return;
  }

  if (!shouldAcceptShortsQueueState(data.source, getActiveTab(), getActiveSubsFilter())) {
    return;
  }

  const nextIndex = resolveShortsQueueSelectionIndex(
    data.videoId,
    data.index,
    getFeedItems(),
    getSelectedIndex(),
  );
  if (nextIndex === null) {
    return;
  }

  setSelectedIndex(nextIndex);
  updateFeedSelection();
  scrollSelectedIntoView();
}
