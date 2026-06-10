import type { FeedItem, FeedTab, SubsFilter } from "../browse/types";
import type { FeedResultMessage } from "../browse/messages";
import { getYouTubeVideoId, youtubeThumbnailUrl, youtubeWatchUrl } from "../youtube";
import { $, formatDuration } from "./dom";
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

function feedCacheKey(tab: FeedTab, subsFilter: SubsFilter = activeSubsFilter): string {
  if (tab === "subscriptions") {
    return `subscriptions:${subsFilter}`;
  }
  return tab;
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

function updateSegButtons(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".segmented .seg-btn");
  buttons.forEach((btn) => {
    const tab = btn.dataset.tab as FeedTab | undefined;
    btn.classList.toggle("active", tab === activeTab);
  });
}

function updateSubsFilterUI(): void {
  const bar = $("subs-filter");
  const show = activeTab === "subscriptions";
  bar.classList.toggle("hidden", !show);

  const buttons = bar.querySelectorAll<HTMLButtonElement>(".subs-filter-btn");
  buttons.forEach((btn) => {
    const filter = btn.dataset.subsFilter as SubsFilter | undefined;
    btn.classList.toggle("active", filter === activeSubsFilter);
  });
}

function renderSkeleton(): void {
  const listEl = $("feed-list");
  listEl.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "skeleton-rows";

  for (let i = 0; i < 5; i++) {
    const row = document.createElement("div");
    row.className = "skeleton-row";

    const thumb = document.createElement("div");
    thumb.className = "skeleton-block skeleton-thumb";

    const lines = document.createElement("div");
    lines.className = "skeleton-lines";

    for (const cls of ["wide", "mid", "narrow"]) {
      const line = document.createElement("div");
      line.className = `skeleton-block skeleton-line ${cls}`;
      lines.appendChild(line);
    }

    row.appendChild(thumb);
    row.appendChild(lines);
    wrap.appendChild(row);
  }

  listEl.appendChild(wrap);
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
): void {
  activeTab = tab;
  if (tab === "subscriptions") {
    activeSubsFilter = subsFilter;
  }
  updateSegButtons();
  updateSubsFilterUI();
  setStatus("Loading…");
  feedLoading = true;
  feedEmptyHint = "";
  lastFeedError = "";
  feedItems = [];
  selectedIndex = -1;
  setFeedBusy(true);
  renderSkeleton();

  const refreshBtn = $("feed-refresh");
  refreshBtn.classList.add("spinning");

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

    if (lastFeedError) {
      clearStatus();
      const err = document.createElement("div");
      err.className = "feed-error";
      err.textContent = lastFeedError;

      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "feed-retry";
      retry.textContent = "Try again";
      retry.addEventListener("click", () => refreshCurrentFeed());
      err.appendChild(retry);
      listEl.appendChild(err);
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

    const row = document.createElement("button");
    row.type = "button";
    row.className = `feed-row${index === selectedIndex ? " selected" : ""}`;
    row.setAttribute("aria-label", item.title);
    row.dataset.index = String(index);

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "thumb-wrap";

    const thumb = document.createElement("img");
    thumb.className = "feed-thumb";
    const fallbackThumb = youtubeThumbnailUrl(item.videoId);
    thumb.src = item.thumbnailUrl || fallbackThumb;
    thumb.alt = item.title;
    thumb.loading = "lazy";
    thumb.addEventListener("error", () => {
      if (thumb.src !== fallbackThumb) {
        thumb.src = fallbackThumb;
      }
    });

    thumbWrap.appendChild(thumb);

    if (item.durationLabel) {
      const badge = document.createElement("span");
      badge.className = "duration-badge";
      badge.textContent = item.durationLabel;
      thumbWrap.appendChild(badge);
    }

    if (typeof item.resumeSeconds === "number" && item.resumeSeconds > 0) {
      const resume = document.createElement("span");
      resume.className = "resume-badge";
      resume.textContent = "Resume";
      thumbWrap.appendChild(resume);
    }

    const meta = document.createElement("div");
    meta.className = "feed-meta";

    const title = document.createElement("p");
    title.className = "feed-title";
    title.textContent = item.title;

    const channel = document.createElement("p");
    channel.className = "feed-channel";
    channel.textContent = item.channelTitle;

    const extra = document.createElement("p");
    extra.className = "feed-extra";
    const parts: string[] = [];
    if (typeof item.resumeSeconds === "number" && item.resumeSeconds > 0) {
      parts.push(`Resume at ${formatDuration(item.resumeSeconds)}`);
    }
    if (item.publishedAt) {
      parts.push(item.publishedAt);
    }
    extra.textContent = parts.join(" · ");

    meta.appendChild(title);
    meta.appendChild(channel);
    if (parts.length) {
      meta.appendChild(extra);
    }

    row.appendChild(thumbWrap);
    row.appendChild(meta);

    row.addEventListener("click", () => {
      selectedIndex = index;
      renderFeedList();
      playItem(item);
    });

    listEl.appendChild(row);
  });
}

function handleFeedResult(data: FeedResultMessage): void {
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
  loadedTabs.add(feedCacheKey(data.tab, data.subsFilter || "all"));

  if (feedItems.length) {
    setStatus(`${feedItems.length} video${feedItems.length === 1 ? "" : "s"}`);
  }

  renderFeedList();

  if (data.tab === "related" && feedItems.length > 0) {
    const videoId = getYouTubeVideoId(getCurrentWatchUrl()) || "";
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

function setupTabs(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".segmented .seg-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab as FeedTab | undefined;
      if (!tab) {
        return;
      }
      const cacheKey = feedCacheKey(tab);
      if (tab === activeTab && loadedTabs.has(cacheKey)) {
        return;
      }
      requestFeed(tab);
    });
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
      renderFeedList();
      scrollSelectedIntoView();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex = Math.max(0, selectedIndex <= 0 ? 0 : selectedIndex - 1);
      renderFeedList();
      scrollSelectedIntoView();
    } else if (event.key === "Enter" && selectedIndex >= 0) {
      event.preventDefault();
      playItem(feedItems[selectedIndex]);
    }
  });

  listEl.addEventListener("focus", () => {
    if (selectedIndex < 0 && feedItems.length) {
      selectedIndex = 0;
      renderFeedList();
    }
  });
}

function scrollSelectedIntoView(): void {
  const row = document.querySelector<HTMLElement>(`.feed-row[data-index="${selectedIndex}"]`);
  row?.scrollIntoView({ block: "nearest" });
}

export function initBrowsePanel(): void {
  setupTabs();
  setupSubsFilter();
  setupSearch();
  setupRefresh();
  setupKeyboard();

  onPluginMessage("feedResult", (raw) => {
    handleFeedResult((raw || {}) as FeedResultMessage);
  });

  onPluginMessage("focusBrowse", () => {
    setActiveView("browse");
    ($("search-input") as HTMLInputElement).focus();
  });

  onPluginMessage("focusPlayer", () => {
    setActiveView("player");
  });

  onPluginMessage("watchUrlChanged", () => {
    if (activeTab === "related" || activeTab === "history") {
      requestFeed(activeTab);
    }
  });

  onPluginMessage("feedsStale", () => {
    loadedTabs.clear();
    refreshCurrentFeed();
  });
}