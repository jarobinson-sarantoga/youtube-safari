import type { FeedItem } from "../../browse/types";
import { $ } from "../dom";
import {
  getActiveSubsFilter,
  getActiveTab,
  getFeedEmptyHint,
  getFeedItems,
  getLastFeedError,
  getSelectedIndex,
  isFeedLoading,
  refreshCurrentFeed,
  setSelectedIndex,
} from "../feed-controller";
import { createErrorWithRetry } from "../dom";
import { createFeedRow } from "../feed-row";
import { playItem } from "./playback";
import {
  clearStatus,
  renderSkeleton,
  sectionLabel,
  setFeedBusy,
  setFeedRefreshSpinning,
  setSearchBusy,
} from "./ui";

export function updateFeedSelection(): void {
  const listEl = $("feed-list");
  const selectedIndex = getSelectedIndex();
  let activeId: string | null = null;

  document.querySelectorAll<HTMLElement>(".feed-row[data-index]").forEach((row) => {
    const index = Number.parseInt(row.dataset.index || "", 10);
    const isSelected = index === selectedIndex;
    row.classList.toggle("selected", isSelected);
    row.tabIndex = -1;
    if (isSelected) {
      row.setAttribute("aria-selected", "true");
      activeId = row.id || null;
    } else {
      row.removeAttribute("aria-selected");
    }
  });

  if (activeId) {
    listEl.setAttribute("aria-activedescendant", activeId);
  } else {
    listEl.removeAttribute("aria-activedescendant");
  }
}

export function scrollSelectedIntoView(): void {
  const row = document.querySelector<HTMLElement>(`.feed-row[data-index="${getSelectedIndex()}"]`);
  row?.scrollIntoView({ block: "nearest" });
}

function buildRow(item: FeedItem, index: number, listEl: HTMLElement): HTMLElement {
  return createFeedRow({
    item,
    index,
    selected: index === getSelectedIndex(),
    showBackgroundPlay: true,
    onClick: (clickedItem, clickedIndex) => {
      setSelectedIndex(clickedIndex);
      updateFeedSelection();
      listEl.focus();
      playItem(clickedItem);
    },
    onBackgroundPlay: (clickedItem, clickedIndex) => {
      setSelectedIndex(clickedIndex);
      updateFeedSelection();
      listEl.focus();
      playItem(clickedItem, { background: true });
    },
  });
}

export function renderFeedList(): void {
  const listEl = $("feed-list");
  const feedItems = getFeedItems();
  listEl.innerHTML = "";
  setFeedRefreshSpinning(false);

  if (!feedItems.length) {
    if (isFeedLoading()) {
      renderSkeleton();
      return;
    }

    setFeedBusy(false);
    setSearchBusy(false);
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
    listEl.appendChild(buildRow(item, index, listEl));
  });

  updateFeedSelection();
}
