import { $ } from "../dom";
import {
  getActiveSubsFilter,
  getActiveTab,
  getFeedEmptyHint,
  getFeedItems,
  getLastFeedError,
  getSelectedIndex,
  getShortsContinuation,
  isFeedLoading,
  isShortsLoadingMore,
  refreshCurrentFeed,
  requestLoadMoreShorts,
  setSelectedIndex,
} from "../feed-controller";
import { createErrorWithRetry } from "../dom";
import { createFeedRow } from "../feed-row";
import { createShortsGridCard } from "../feed-row/shorts-grid";
import { playItem } from "./playback";
import { scrollSelectedIntoView, updateFeedSelection } from "./feed-list-selection";
import {
  applyShortsLayoutClass,
  getShortsLayout,
} from "./shorts-layout";
import {
  clearStatus,
  renderSkeleton,
  sectionLabel,
  setFeedBusy,
  setFeedRefreshSpinning,
  setSearchBusy,
} from "./ui";

export { scrollSelectedIntoView, updateFeedSelection };

function usePortraitRows(): boolean {
  const tab = getActiveTab();
  return tab === "shorts" || (tab === "subscriptions" && getActiveSubsFilter() === "shorts");
}

function handleRowPlay(item: import("../../browse/types").FeedItem, index: number, listEl: HTMLElement, background = false): void {
  setSelectedIndex(index);
  updateFeedSelection();
  listEl.focus();
  playItem(item, { background });
}

function syncFeedListTabindex(listEl: HTMLElement, interactive: boolean): void {
  listEl.tabIndex = interactive ? 0 : -1;
}

function appendLoadMoreButton(listEl: HTMLElement): void {
  if (getActiveTab() !== "shorts" || !getShortsContinuation()) {
    return;
  }
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "feed-load-more";
  btn.textContent = isShortsLoadingMore() ? "Loading…" : "Load more Shorts";
  btn.disabled = isShortsLoadingMore();
  btn.addEventListener("click", () => requestLoadMoreShorts());
  listEl.appendChild(btn);
}

export function renderFeedList(): void {
  const listEl = $("feed-list");
  const feedItems = getFeedItems();
  const portrait = usePortraitRows();
  const grid = getActiveTab() === "shorts" && getShortsLayout() === "grid";
  listEl.innerHTML = "";
  applyShortsLayoutClass(listEl, getActiveTab());
  setFeedRefreshSpinning(false);

  if (!feedItems.length) {
    if (isFeedLoading()) {
      renderSkeleton();
      return;
    }

    setFeedBusy(false);
    setSearchBusy(false);
    syncFeedListTabindex(listEl, false);
    const lastFeedError = getLastFeedError();
    if (lastFeedError) {
      clearStatus();
      listEl.appendChild(createErrorWithRetry(lastFeedError, () => refreshCurrentFeed()));
      return;
    }

    clearStatus();
    const empty = document.createElement("div");
    empty.className = "feed-empty";
    empty.textContent = getFeedEmptyHint() || "No videos to show.";
    listEl.appendChild(empty);
    return;
  }

  setFeedBusy(false);
  setSearchBusy(false);
  syncFeedListTabindex(listEl, true);

  const showSectionHeaders = getActiveTab() === "subscriptions" && getActiveSubsFilter() === "all";
  let lastSection = "";
  feedItems.forEach((item, index) => {
    if (showSectionHeaders && item.sectionId && item.sectionId !== lastSection) {
      lastSection = item.sectionId;
      const header = document.createElement("div");
      header.className = "feed-section-header";
      header.textContent = sectionLabel(item.sectionId);
      listEl.appendChild(header);
    }

    if (grid) {
      listEl.appendChild(
        createShortsGridCard({
          item,
          index,
          selected: index === getSelectedIndex(),
          onClick: (clickedItem, clickedIndex) => handleRowPlay(clickedItem, clickedIndex, listEl),
        }),
      );
      return;
    }

    listEl.appendChild(
      createFeedRow({
        item,
        index,
        selected: index === getSelectedIndex(),
        portrait,
        showBackgroundPlay: true,
        onClick: (clickedItem, clickedIndex) => handleRowPlay(clickedItem, clickedIndex, listEl),
        onBackgroundPlay: (clickedItem, clickedIndex) =>
          handleRowPlay(clickedItem, clickedIndex, listEl, true),
      }),
    );
  });

  appendLoadMoreButton(listEl);
  updateFeedSelection();
}
