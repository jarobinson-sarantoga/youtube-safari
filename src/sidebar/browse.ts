import type { FeedItem, FeedTab, SubsFilter } from "../browse/types";
import { parseFeedResult } from "./parse";
import { youtubeWatchUrl } from "../youtube";
import { $, createErrorWithRetry } from "./dom";
import { createFeedRow, createSkeletonRows } from "./feed-row";
import { onPluginMessage, postToPlugin } from "./messaging";
import { getCurrentWatchUrl, renderRelatedPreview } from "./player";
import { setActiveView } from "./views";
import {
  ensureBrowseFeedLoaded,
  getActiveSubsFilter,
  getActiveTab,
  getFeedEmptyHint,
  getFeedItems,
  getLastFeedError,
  getSelectedIndex,
  handleFeedResult,
  initFeedController,
  isFeedLoading,
  isSubsFilterLoaded,
  onBrowseReady,
  onFeedsStale,
  onHistoryStale,
  onWatchUrlChanged,
  refreshCurrentFeed,
  requestFeed,
  setActiveTabForSearch,
  setSelectedIndex,
  switchSegmentTab,
} from "./feed-controller";

const SECTION_LABELS: Record<string, string> = {
  relevant: "Most relevant",
  shorts: "Shorts",
  uploads: "All uploads",
};

function formatFeedCount(n: number): string {
  return `${n} video${n === 1 ? "" : "s"}`;
}

function setFeedRefreshSpinning(spinning: boolean): void {
  const btn = $("feed-refresh");
  btn.classList.toggle("spinning", spinning);
  if (spinning) {
    btn.setAttribute("aria-busy", "true");
  } else {
    btn.removeAttribute("aria-busy");
  }
}

function setStatus(text: string, isError = false): void {
  const el = $("feed-status");
  el.textContent = text;
  el.classList.toggle("error", isError);
}

function clearStatus(): void {
  setStatus("");
}

function setFeedBusy(busy: boolean): void {
  const listEl = $("feed-list");
  if (busy) {
    listEl.setAttribute("aria-busy", "true");
  } else {
    listEl.removeAttribute("aria-busy");
  }
}

function setSearchBusy(busy: boolean): void {
  const searchRow = document.querySelector(".search-row");
  const searchBtn = $("search-btn") as HTMLButtonElement;
  if (busy) {
    searchRow?.setAttribute("aria-busy", "true");
    searchBtn.disabled = true;
  } else {
    searchRow?.removeAttribute("aria-busy");
    searchBtn.disabled = false;
  }
}

function updateSegButtons(): void {
  const activeTab = getActiveTab();
  const buttons = document.querySelectorAll<HTMLButtonElement>(".segmented .seg-btn");
  buttons.forEach((btn) => {
    const tab = btn.dataset.tab as FeedTab | undefined;
    const isActive = tab === activeTab;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function updateSubsFilterUI(): void {
  const activeTab = getActiveTab();
  const activeSubsFilter = getActiveSubsFilter();
  const bar = $("subs-filter");
  const show = activeTab === "subscriptions";
  bar.classList.toggle("hidden", !show);

  const buttons = bar.querySelectorAll<HTMLButtonElement>(".subs-filter-btn");
  buttons.forEach((btn) => {
    const filter = btn.dataset.subsFilter as SubsFilter | undefined;
    const isActive = filter === activeSubsFilter;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function renderSkeleton(): void {
  const listEl = $("feed-list");
  listEl.innerHTML = "";
  listEl.appendChild(createSkeletonRows(5));
}

function playItem(item: FeedItem): void {
  let url = youtubeWatchUrl(item.videoId);
  if (typeof item.resumeSeconds === "number" && item.resumeSeconds > 0) {
    url += `&t=${item.resumeSeconds}`;
  }
  postToPlugin("playVideo", {
    videoId: item.videoId,
    url,
  });
  setActiveView("player");
}

function updateFeedSelection(): void {
  const selectedIndex = getSelectedIndex();
  let selectedRow: HTMLElement | null = null;

  document.querySelectorAll<HTMLElement>(".feed-row[data-index]").forEach((row) => {
    const index = Number.parseInt(row.dataset.index || "", 10);
    const isSelected = index === selectedIndex;
    row.classList.toggle("selected", isSelected);
    if (isSelected) {
      row.setAttribute("aria-current", "true");
      selectedRow = row;
    } else {
      row.removeAttribute("aria-current");
    }
  });

  selectedRow?.focus();
}

function renderFeedList(): void {
  const feedItems = getFeedItems();
  const feedLoading = isFeedLoading();
  const lastFeedError = getLastFeedError();
  const feedEmptyHint = getFeedEmptyHint();
  const activeTab = getActiveTab();
  const activeSubsFilter = getActiveSubsFilter();
  const selectedIndex = getSelectedIndex();

  const listEl = $("feed-list");
  listEl.innerHTML = "";
  setFeedRefreshSpinning(false);

  if (!feedItems.length) {
    if (feedLoading) {
      renderSkeleton();
      return;
    }

    setFeedBusy(false);
    setSearchBusy(false);

    if (lastFeedError) {
      clearStatus();
      listEl.appendChild(
        createErrorWithRetry(lastFeedError, () => refreshCurrentFeed()),
      );
      return;
    }

    clearStatus();
    const empty = document.createElement("div");
    empty.className = "feed-empty";
    empty.textContent = feedEmptyHint || "No videos to show.";
    listEl.appendChild(empty);
    return;
  }

  setFeedBusy(false);
  setSearchBusy(false);

  let lastSection = "";
  const showSectionHeaders =
    activeTab === "subscriptions" && activeSubsFilter === "all";

  feedItems.forEach((item, index) => {
    if (showSectionHeaders && item.sectionId && item.sectionId !== lastSection) {
      lastSection = item.sectionId;
      const header = document.createElement("div");
      header.className = "feed-section-header";
      header.textContent = SECTION_LABELS[item.sectionId] || item.sectionId;
      listEl.appendChild(header);
    }

    const row = createFeedRow({
      item,
      index,
      selected: index === selectedIndex,
      onClick: (clickedItem, clickedIndex) => {
        setSelectedIndex(clickedIndex);
        updateFeedSelection();
        playItem(clickedItem);
      },
    });

    listEl.appendChild(row);
  });
}

function runSearch(): void {
  const input = $("search-input") as HTMLInputElement;
  const query = input.value.trim();
  if (!query) {
    setStatus("Enter a search query", true);
    return;
  }
  setActiveTabForSearch();
  updateSegButtons();
  updateSubsFilterUI();
  requestFeed("search", query);
}

function setupTabs(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".segmented .seg-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab as FeedTab | undefined;
      if (!tab) {
        return;
      }
      switchSegmentTab(tab);
    });
  });

  const segmented = document.querySelector<HTMLElement>(".segmented");
  segmented?.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    const tabs = [...document.querySelectorAll<HTMLButtonElement>(".segmented .seg-btn")];
    const currentIndex = tabs.findIndex((btn) => btn.classList.contains("active"));
    if (currentIndex < 0) {
      return;
    }

    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = currentIndex + delta;
    if (nextIndex < 0 || nextIndex >= tabs.length) {
      return;
    }

    const tab = tabs[nextIndex].dataset.tab as FeedTab | undefined;
    if (!tab) {
      return;
    }

    switchSegmentTab(tab);
    tabs[nextIndex].focus();
  });
}

function setupSubsFilter(): void {
  const bar = $("subs-filter");
  const buttons = bar.querySelectorAll<HTMLButtonElement>(".subs-filter-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.subsFilter as SubsFilter | undefined;
      if (!filter || getActiveTab() !== "subscriptions") {
        return;
      }
      if (filter === getActiveSubsFilter() && isSubsFilterLoaded(filter)) {
        return;
      }
      requestFeed("subscriptions", "", filter);
    });
  });

  bar.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    if (getActiveTab() !== "subscriptions") {
      return;
    }

    const tabs = [...bar.querySelectorAll<HTMLButtonElement>(".subs-filter-btn")];
    const currentIndex = tabs.findIndex((btn) => btn.classList.contains("active"));
    if (currentIndex < 0) {
      return;
    }

    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = currentIndex + delta;
    if (nextIndex < 0 || nextIndex >= tabs.length) {
      return;
    }

    const filter = tabs[nextIndex].dataset.subsFilter as SubsFilter | undefined;
    if (!filter) {
      return;
    }

    if (filter === getActiveSubsFilter() && isSubsFilterLoaded(filter)) {
      tabs[nextIndex].focus();
      return;
    }

    requestFeed("subscriptions", "", filter);
    tabs[nextIndex].focus();
  });
}

function setupSearch(): void {
  const input = $("search-input") as HTMLInputElement;
  const btn = $("search-btn");

  btn.addEventListener("click", () => runSearch());
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      input.blur();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      runSearch();
    }
  });
}

function setupRefresh(): void {
  $("feed-refresh").addEventListener("click", () => refreshCurrentFeed());
}

function setupKeyboard(): void {
  const listEl = $("feed-list");

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== $("search-input")) {
      event.preventDefault();
      ($("search-input") as HTMLInputElement).focus();
      return;
    }

    if (document.activeElement === $("search-input")) {
      return;
    }

    const feedItems = getFeedItems();
    if (!feedItems.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex(Math.min(feedItems.length - 1, getSelectedIndex() + 1));
      updateFeedSelection();
      scrollSelectedIntoView();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex(Math.max(0, getSelectedIndex() - 1));
      updateFeedSelection();
      scrollSelectedIntoView();
    } else if (event.key === "Home") {
      event.preventDefault();
      setSelectedIndex(0);
      updateFeedSelection();
      scrollSelectedIntoView();
    } else if (event.key === "End") {
      event.preventDefault();
      setSelectedIndex(feedItems.length - 1);
      updateFeedSelection();
      scrollSelectedIntoView();
    } else if (event.key === "Enter" && getSelectedIndex() >= 0) {
      event.preventDefault();
      playItem(feedItems[getSelectedIndex()]);
    }
  });

  listEl.addEventListener("focus", () => {
    const feedItems = getFeedItems();
    if (getSelectedIndex() < 0 && feedItems.length) {
      setSelectedIndex(0);
      updateFeedSelection();
    }
  });
}

function scrollSelectedIntoView(): void {
  const row = document.querySelector<HTMLElement>(
    `.feed-row[data-index="${getSelectedIndex()}"]`,
  );
  row?.scrollIntoView({ block: "nearest" });
}

export { ensureBrowseFeedLoaded };

export function initBrowsePanel(): void {
  initFeedController({
    setStatus,
    clearStatus,
    setFeedBusy,
    setSearchBusy,
    setFeedRefreshSpinning,
    renderFeedList,
    renderSkeleton,
    updateSegButtons,
    updateSubsFilterUI,
    getSearchQuery: () => ($("search-input") as HTMLInputElement).value.trim(),
    getCurrentWatchUrl,
    renderRelatedPreview,
    postBrowseRefresh: (payload) => postToPlugin("browseRefresh", payload),
    formatFeedCount,
  });

  setupTabs();
  setupSubsFilter();
  setupSearch();
  setupRefresh();
  setupKeyboard();

  onPluginMessage("feedResult", (raw) => {
    const data = parseFeedResult(raw);
    if (data) {
      handleFeedResult(data);
    }
  });

  onPluginMessage("focusBrowse", () => {
    setActiveView("browse");
    ($("search-input") as HTMLInputElement).focus();
  });

  onPluginMessage("watchUrlChanged", onWatchUrlChanged);
  onPluginMessage("historyStale", onHistoryStale);
  onPluginMessage("feedsStale", onFeedsStale);
  onPluginMessage("browseReady", onBrowseReady);
}