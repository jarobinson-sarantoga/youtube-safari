import { completePanelBoot, isPanelBooting, queueBootView } from "../boot";
import {
  handleFeedResult,
  initFeedController,
  onBrowseReady,
  onFeedsStale,
  onHistoryStale,
  onWatchLaterStale,
  onQueueStale,
  onBlocklistStale,
  onWatchUrlChanged,
  setSelectedIndex,
  getActiveTab,
  getFeedItems,
} from "../feed-controller";
import { $ } from "../dom";
import { onPluginMessage, postToPlugin } from "../messaging";
import { parseFeedResult } from "../parse";
import { getCurrentWatchUrl, renderRelatedPreview } from "../player";
import { setActiveView } from "../views";
import { renderFeedList, scrollSelectedIntoView, updateFeedSelection } from "./feed-list";
import { setupBrowseKeyboard } from "./keyboard";
import { setupShortsLayoutToggle } from "./shorts-layout";
import { setupSearchFilters, syncSearchFilterVisibility } from "./search-filters";
import { setupRefresh, setupSearch, setupSubsFilter, setupTabs, syncBrowseControls } from "./setup-controls";
import {
  clearStatus,
  formatFeedCount,
  renderSkeleton,
  setFeedBusy,
  setFeedRefreshSpinning,
  setSearchBusy,
  setStatus,
} from "./ui";

function focusSearch(): void {
  ($("search-input") as HTMLInputElement).focus();
}

function setupHistoryExport(): void {
  const toolbar = document.querySelector(".toolbar");
  if (!toolbar) {
    return;
  }
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "icon-btn export-history-btn hidden";
  btn.id = "export-history";
  btn.title = "Export watch history";
  btn.setAttribute("aria-label", "Export watch history");
  btn.textContent = "⤓";
  btn.addEventListener("click", () => {
    postToPlugin("libraryAction", { action: "exportHistory" });
  });
  toolbar.appendChild(btn);

  onPluginMessage("historyExport", (raw) => {
    const json = (raw as { json?: string } | undefined)?.json;
    if (!json) {
      return;
    }
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `youtube-watch-history-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });
}

export function initBrowsePanel(): void {
  initFeedController({
    setStatus,
    clearStatus,
    setFeedBusy,
    setSearchBusy,
    setFeedRefreshSpinning,
    renderFeedList,
    renderSkeleton,
    updateSegButtons: () => syncBrowseControls(),
    updateSubsFilterUI: () => syncBrowseControls(),
    getSearchQuery: () => ($("search-input") as HTMLInputElement).value.trim(),
    getCurrentWatchUrl,
    renderRelatedPreview,
    postBrowseRefresh: (payload) => postToPlugin("browseRefresh", payload),
    formatFeedCount,
  });

  syncBrowseControls();
  setupTabs();
  setupSubsFilter();
  setupShortsLayoutToggle(() => renderFeedList());
  setupSearchFilters(() => renderFeedList());
  setupSearch();
  setupRefresh();
  setupBrowseKeyboard();
  setupHistoryExport();

  onPluginMessage("feedResult", (raw) => {
    const data = parseFeedResult(raw);
    if (data) {
      handleFeedResult(data);
      syncSearchFilterVisibility();
      const exportBtn = document.getElementById("export-history");
      exportBtn?.classList.toggle("hidden", getActiveTab() !== "history");
    }
  });

  onPluginMessage("focusBrowse", () => {
    if (isPanelBooting()) {
      queueBootView("browse");
      return;
    }
    setActiveView("browse");
    focusSearch();
  });

  onPluginMessage("watchUrlChanged", onWatchUrlChanged);
  onPluginMessage("historyStale", onHistoryStale);
  onPluginMessage("watchLaterStale", onWatchLaterStale);
  onPluginMessage("queueStale", onQueueStale);
  onPluginMessage("blocklistStale", onBlocklistStale);
  onPluginMessage("feedsStale", onFeedsStale);
  onPluginMessage("libraryState", () => {
    renderFeedList();
  });
  onPluginMessage("shortsQueueState", (raw) => {
    const data = raw as { videoId?: string; index?: number } | null;
    if (!data || typeof data.index !== "number" || data.index < 0) {
      return;
    }
    setSelectedIndex(data.index);
    updateFeedSelection();
    scrollSelectedIntoView();
  });
  onPluginMessage("browseReady", () => {
    const view = completePanelBoot();
    if (view) {
      setActiveView(view);
      if (view === "browse") {
        focusSearch();
      }
    }
    onBrowseReady();
    syncBrowseControls();
    syncSearchFilterVisibility();
  });
}
