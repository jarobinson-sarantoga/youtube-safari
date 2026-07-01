import { refreshCurrentFeed, getLastFeedError, isFeedLoading, getFeedEmptyHint } from "../feed-controller";
import { createErrorWithRetry } from "../dom";
import { clearStatus, renderSkeleton } from "./ui";
import { syncFeedListTabindex } from "./feed-list-helpers";

export function renderFeedListEmpty(listEl: HTMLElement): boolean {
  if (isFeedLoading()) {
    renderSkeleton();
    return true;
  }

  syncFeedListTabindex(listEl, false);
  const lastFeedError = getLastFeedError();
  if (lastFeedError) {
    clearStatus();
    listEl.appendChild(createErrorWithRetry(lastFeedError, () => refreshCurrentFeed()));
    return true;
  }

  clearStatus();
  const empty = document.createElement("div");
  empty.className = "feed-empty";
  empty.textContent = getFeedEmptyHint() || "No videos to show.";
  listEl.appendChild(empty);
  return true;
}
