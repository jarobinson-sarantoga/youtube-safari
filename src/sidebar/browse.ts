import type { FeedItem, FeedTab, SubsFilter } from "../browse/types";
import { parseFeedResult } from "./parse";
import { getYouTubeVideoId, youtubeWatchUrl } from "../youtube";
import { $, createErrorWithRetry } from "./dom";
import { createFeedRow, createSkeletonRows } from "./feed-row";
import { onPluginMessage, postToPlugin } from "./messaging";
import { getCurrentWatchUrl, renderRelatedPreview } from "./player";
import { setActiveView } from "./views";

const SECTION_LABELS: Record<string, string> = {
  relevant: "Most relevant",
  shorts: "Shorts",
  uploads: "All uploads",
};

let activeTab: FeedTab = "home";
let activeSubsFilter: SubsFilter = "all";
let feedItems: FeedItem[] = [];
let selectedIndex = -1;
let feedRequestId = 0;
let feedLoading = false;
let feedEmptyHint = "";
let lastFeedError = "";
const loadedTabs = new Set<string>();

interface FeedSnapshot {
  items: FeedItem[];
  statusText: string;
  emptyHint: string;
}

const feedSnapshots = new Map<string, FeedSnapshot>();

function feedCacheKey(
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

function saveFeedSnapshot(tab: FeedTab, subsFilter: SubsFilter, query: string): void {
  const key = feedCacheKey(tab, subsFilter, query);
  feedSnapshots.set(key, {
    items: feedItems,
    statusText:
      feedItems.length > 0
        ? `${feedItems.length} video${feedItems.length === 1 ? "" : "s"}`
        : "",
    emptyHint: feedEmptyHint,
  });
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
  const buttons = document.querySelectorAll<HTMLButtonElement>(".segmented .seg-btn");
  buttons.forEach((btn) => {
    const tab = btn.dataset.tab as FeedTab | undefined;
    const isActive = tab === activeTab;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function updateSubsFilterUI(): void {
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

function refreshCurrentFeed(): void {
  if (activeTab === "search") {
    const query = ($("search-input") as HTMLInputElement).value.trim();
    if (query) {
      requestFeed("search", query, activeSubsFilter, true);
    }
    return;
  }
  requestFeed(activeTab, "", activeSubsFilter, true);
}

function requestFeed(
  tab: FeedTab,
  query = "",
  subsFilter = activeSubsFilter,
  force = false,
  background = false,
): void {
  activeTab = tab;
  if (tab === "subscriptions") {
    activeSubsFilter = subsFilter;
  }
  updateSegButtons();
  updateSubsFilterUI();

  const cacheKey = feedCacheKey(tab, subsFilter, tab === "search" ? query : "");
  const snapshot = !force ? feedSnapshots.get(cacheKey) : undefined;
  const keepVisible = background && feedItems.length > 0;

  if (keepVisible) {
    feedLoading = true;
    lastFeedError = "";
    feedEmptyHint = "";
    setStatus("Refreshing…");
    setFeedBusy(false);
    setSearchBusy(false);
    $("feed-refresh").classList.add("spinning");
  } else if (snapshot) {
    feedItems = [...snapshot.items];
    feedEmptyHint = snapshot.emptyHint;
    lastFeedError = "";
    feedLoading = true;
    selectedIndex = feedItems.length > 0 ? 0 : -1;
    setStatus(snapshot.statusText || "Refreshing…");
    setFeedBusy(false);
    setSearchBusy(false);
    renderFeedList();
    $("feed-refresh").classList.add("spinning");
  } else {
    setStatus("Loading…");
    feedLoading = true;
    feedEmptyHint = "";
    lastFeedError = "";
    feedItems = [];
    selectedIndex = -1;
    setFeedBusy(true);
    setSearchBusy(true);
    renderSkeleton();
    $("feed-refresh").classList.add("spinning");
  }

  const requestId = ++feedRequestId;
  postToPlugin("browseRefresh", {
    tab,
    query: tab === "search" ? query : undefined,
    subsFilter: tab === "subscriptions" ? activeSubsFilter : undefined,
    force: force || undefined,
    requestId,
  });
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
  document.querySelectorAll<HTMLElement>(".feed-row[data-index]").forEach((row) => {
    const index = Number.parseInt(row.dataset.index || "", 10);
    row.classList.toggle("selected", index === selectedIndex);
  });
}

function renderFeedList(): void {
  const listEl = $("feed-list");
  listEl.innerHTML = "";
  $("feed-refresh").classList.remove("spinning");

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
        selectedIndex = clickedIndex;
        updateFeedSelection();
        playItem(clickedItem);
      },
    });

    listEl.appendChild(row);
  });
}

function handleFeedResult(data: NonNullable<ReturnType<typeof parseFeedResult>>): void {
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
    const currentQuery = ($("search-input") as HTMLInputElement).value.trim();
    if ((data.query ?? "") !== currentQuery) {
      return;
    }
  }

  feedLoading = false;
  $("feed-refresh").classList.remove("spinning");

  if (data.error) {
    lastFeedError = data.error;
    feedItems = [];
    feedEmptyHint = "";
    renderFeedList();
    return;
  }

  lastFeedError = "";
  feedItems = data.items || [];
  selectedIndex = feedItems.length > 0 ? 0 : -1;
  feedEmptyHint = !feedItems.length ? data.emptyHint || "" : "";
  const subsFilter = data.subsFilter || "all";
  const searchQuery =
    data.tab === "search" ? ($("search-input") as HTMLInputElement).value.trim() : "";
  loadedTabs.add(feedCacheKey(data.tab, subsFilter, searchQuery));

  if (feedItems.length) {
    setStatus(`${feedItems.length} video${feedItems.length === 1 ? "" : "s"}`);
  } else {
    clearStatus();
  }

  saveFeedSnapshot(data.tab, subsFilter, searchQuery);
  renderFeedList();

  if (data.tab === "related" && feedItems.length > 0) {
    const videoId = getYouTubeVideoId(getCurrentWatchUrl()) || "";
    loadedTabs.add("related-preview");
    renderRelatedPreview(videoId, feedItems);
  }
}

function runSearch(): void {
  const input = $("search-input") as HTMLInputElement;
  const query = input.value.trim();
  if (!query) {
    setStatus("Enter a search query", true);
    return;
  }
  activeTab = "search";
  updateSegButtons();
  updateSubsFilterUI();
  requestFeed("search", query);
}

function switchSegmentTab(tab: FeedTab): void {
  const cacheKey = feedCacheKey(tab);
  if (tab === activeTab && loadedTabs.has(cacheKey) && feedSnapshots.has(cacheKey)) {
    return;
  }
  requestFeed(tab);
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
  const buttons = $("subs-filter").querySelectorAll<HTMLButtonElement>(".subs-filter-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.subsFilter as SubsFilter | undefined;
      if (!filter || activeTab !== "subscriptions") {
        return;
      }
      if (filter === activeSubsFilter && loadedTabs.has(feedCacheKey("subscriptions", filter))) {
        return;
      }
      requestFeed("subscriptions", "", filter);
    });
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

    if (!feedItems.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedIndex = Math.min(feedItems.length - 1, selectedIndex + 1);
      updateFeedSelection();
      scrollSelectedIntoView();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex = Math.max(0, selectedIndex - 1);
      updateFeedSelection();
      scrollSelectedIntoView();
    } else if (event.key === "Home") {
      event.preventDefault();
      selectedIndex = 0;
      updateFeedSelection();
      scrollSelectedIntoView();
    } else if (event.key === "End") {
      event.preventDefault();
      selectedIndex = feedItems.length - 1;
      updateFeedSelection();
      scrollSelectedIntoView();
    } else if (event.key === "Enter" && selectedIndex >= 0) {
      event.preventDefault();
      playItem(feedItems[selectedIndex]);
    }
  });

  listEl.addEventListener("focus", () => {
    if (selectedIndex < 0 && feedItems.length) {
      selectedIndex = 0;
      updateFeedSelection();
    }
  });
}

function scrollSelectedIntoView(): void {
  const row = document.querySelector<HTMLElement>(`.feed-row[data-index="${selectedIndex}"]`);
  row?.scrollIntoView({ block: "nearest" });
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

export function initBrowsePanel(): void {
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

  onPluginMessage("watchUrlChanged", () => {
    loadedTabs.delete("related");
    loadedTabs.delete("related-preview");
    feedSnapshots.delete("related");
    if (activeTab === "related") {
      requestFeed("related");
    }
  });

  onPluginMessage("historyStale", () => {
    loadedTabs.delete("history");
    feedSnapshots.delete("history");
    if (activeTab === "history") {
      requestFeed("history");
    }
  });

  onPluginMessage("feedsStale", () => {
    loadedTabs.clear();
    if (feedItems.length > 0) {
      if (activeTab === "search") {
        const query = ($("search-input") as HTMLInputElement).value.trim();
        if (query) {
          requestFeed("search", query, activeSubsFilter, true, true);
          return;
        }
      }
      requestFeed(activeTab, "", activeSubsFilter, true, true);
      return;
    }
    refreshCurrentFeed();
  });

  onPluginMessage("browseReady", () => {
    if (!loadedTabs.has(feedCacheKey("home"))) {
      requestFeed("home");
    }
  });
}