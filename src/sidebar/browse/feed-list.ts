import { $ } from "../dom";
import {
  getActiveSubsFilter,
  getActiveTab,
  getFeedEmptyHint,
  getFeedItems,
  getLastFeedError,
  getSelectedIndex,
  isFeedLoading,
} from "../feed-controller";
import { createErrorWithRetry } from "../dom";
import { createFeedRow } from "../feed-row";
import { createShortsGridCard } from "../feed-row/shorts-grid";
import { scrollSelectedIntoView, updateFeedSelection } from "./feed-list-selection";
import {
  appendLoadMoreButton,
  handleRowPlay,
  syncFeedListRole,
  syncFeedListTabindex,
  usePortraitRows,
} from "./feed-list-helpers";
import { applyShortsLayoutClass, getShortsLayout } from "./shorts-layout";
import {
  clearStatus,
  renderSkeleton,
  sectionLabel,
  setFeedBusy,
  setFeedRefreshSpinning,
  setSearchBusy,
} from "./ui";
import { refreshCurrentFeed } from "../feed-controller";

export { scrollSelectedIntoView, updateFeedSelection };

export function renderFeedList(): void {
  const listEl = $("feed-list");
  const feedItems = getFeedItems();
  const tab = getActiveTab();
  const subsFilter = getActiveSubsFilter();
  const portrait = usePortraitRows(tab, subsFilter);
  const grid = tab === "shorts" && getShortsLayout() === "grid";
  const listbox = tab === "shorts" && !grid;
  listEl.innerHTML = "";
  applyShortsLayoutClass(listEl, tab);
  syncFeedListRole(listEl, grid, listbox);
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

  const showSectionHeaders = tab === "subscriptions" && subsFilter === "all";
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
        listboxOption: listbox,
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
