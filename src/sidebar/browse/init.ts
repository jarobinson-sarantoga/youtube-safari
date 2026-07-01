import { completePanelBoot, isPanelBooting, queueBootView } from "../boot";
import { initFeedController } from "../feed-controller";
import {
  handleFeedResult,
  onBrowseReady,
  onFeedsStale,
  onHistoryStale,
  onWatchUrlChanged,
  setSelectedIndex,
} from "../feed-controller";
import { $ } from "../dom";
import { onPluginMessage, postToPlugin } from "../messaging";
import { parseFeedResult } from "../parse";
import { getCurrentWatchUrl, renderRelatedPreview } from "../player";
import { setActiveView } from "../views";
import { renderFeedList, scrollSelectedIntoView, updateFeedSelection } from "./feed-list";
import { setupBrowseKeyboard } from "./keyboard";
import { setupShortsLayoutToggle } from "./shorts-layout";
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
  setupSearch();
  setupRefresh();
  setupBrowseKeyboard();

  onPluginMessage("feedResult", (raw) => {
    const data = parseFeedResult(raw);
    if (data) {
      handleFeedResult(data);
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
  onPluginMessage("feedsStale", onFeedsStale);
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
  });
}
