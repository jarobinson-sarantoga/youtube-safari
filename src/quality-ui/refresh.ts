import { getLastWatchUrl } from "../preferences";
import { getSelectedHeight, listQualities } from "../qualities";
import { DEFAULT_QUALITY_OPTIONS, defaultPanelPayload } from "../sidebar-state";
import { isShuttingDown } from "../lifecycle";
import { syncNowPlayingToPanel } from "../browse/init";
import {
  clearListedMetadata,
  getListedChapters,
  replaceChapterMenu,
  replaceQualityMenu,
  setListedDescription,
  setListedTitle,
  updateListedChapters,
} from "../native-menus";
import { refreshNativeChapterPanel } from "../chapters-mpv";
import { appendLog } from "../ytdl";
import { isYouTubeWatchURL } from "../youtube";
import { isShortsQueueActive } from "../shorts-queue";
import {
  buildPanelPayload,
  getLastPanelPayload,
  postSidebarPanel,
  schedulePanelPush,
} from "../sidebar-host";
import { switchQuality } from "./switch-quality";

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight = false;
let pendingRefresh = false;

export async function refreshQualityUI(): Promise<void> {
  if (isShuttingDown()) {
    return;
  }
  if (refreshInFlight) {
    pendingRefresh = true;
    return;
  }

  const watchUrl = getLastWatchUrl();
  const selected = getSelectedHeight();

  if (!watchUrl || !isYouTubeWatchURL(watchUrl)) {
    clearListedMetadata();
    replaceQualityMenu(DEFAULT_QUALITY_OPTIONS, selected, (height) => {
      void switchQuality(height);
    });
    replaceChapterMenu([]);
    postSidebarPanel(defaultPanelPayload(selected));
    return;
  }

  refreshInFlight = true;
  postSidebarPanel(
    buildPanelPayload(
      getLastPanelPayload()?.items || DEFAULT_QUALITY_OPTIONS,
      selected,
      true,
    ),
  );

  try {
    const listed = await listQualities(watchUrl);
    if (listed.title) {
      setListedTitle(listed.title);
    }
    if (listed.description) {
      setListedDescription(listed.description);
    }
    if (listed.description || listed.chapters.length) {
      updateListedChapters(listed.description, listed.chapters);
    }
    replaceQualityMenu(listed.items, selected, (height) => {
      void switchQuality(height);
    });
    replaceChapterMenu(getListedChapters());
    refreshNativeChapterPanel(getListedChapters());
    postSidebarPanel(buildPanelPayload(listed.items, selected, false, listed.error));
    schedulePanelPush();
    syncNowPlayingToPanel();
  } catch (err) {
    appendLog(`refreshQualityUI error: ${err}`);
    const message = err instanceof Error ? err.message : String(err);
    postSidebarPanel(buildPanelPayload(DEFAULT_QUALITY_OPTIONS, selected, false, message));
    syncNowPlayingToPanel();
  } finally {
    refreshInFlight = false;
    if (pendingRefresh) {
      pendingRefresh = false;
      void refreshQualityUI();
    }
  }
}

export function scheduleRefreshQualityUI(): void {
  if (isShortsQueueActive()) {
    return;
  }
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshQualityUI();
  }, 400);
}

export function cancelScheduledRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  pendingRefresh = false;
}

/** Refresh panel metadata and push live playback state (panel requests this). */
export function pushNowPlayingUpdate(): void {
  scheduleRefreshQualityUI();
  syncNowPlayingToPanel();
}
