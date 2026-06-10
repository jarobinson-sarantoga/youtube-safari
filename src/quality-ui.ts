import { logMpvChapterCount, refreshNativeChapterPanel } from "./chapters-mpv";
import type { DescriptionChapter } from "./description-chapters";
import { ensureExternalAudioSelected } from "./audio-track";
import { ensureSubtitlesSelected } from "./subtitles";
import { heightLabel } from "./format";
import { getLastWatchUrl } from "./preferences";
import { getSelectedHeight, listQualities } from "./qualities";
import { DEFAULT_QUALITY_OPTIONS, defaultPanelPayload } from "./sidebar-state";
import { notifyPlayerStateFromFileLoaded } from "./browse/init";
import { suppressNextWatchEnd } from "./browse/store/history";
import { registerBrowseShortcut } from "./shortcuts";
import { setPendingSeek } from "./youtube-open";
import { appendLog } from "./ytdl";
import { isYouTubeWatchURL, normalizeMediaURL } from "./youtube";
import {
  clearListedMetadata,
  enableNativeMenuUpdates,
  isNativeMenuUpdatesEnabled,
  replaceChapterMenu,
  replaceQualityMenu,
  setListedDescription,
  setListedTitle,
  updateListedChapters,
  getListedChapters,
} from "./native-menus";
import { postRelatedPreview, postRelatedPreviewClear, setRelatedPreviewReadyCheck } from "./related-preview-bridge";
import {
  buildPanelPayload,
  ensureSidebarLoaded,
  getLastPanelPayload,
  isSidebarHtmlLoaded,
  postSidebarPanel,
  revealYouTubePanel,
  schedulePanelPush,
  setSidebarHandlers,
} from "./sidebar-host";
import { applyPendingSeek } from "./youtube-open";

const { core, event, global, mpv, preferences, sidebar } = iina;

export { revealYouTubePanel };

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight = false;
let pendingRefresh = false;

export async function refreshQualityUI(): Promise<void> {
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
  } catch (err) {
    appendLog(`refreshQualityUI error: ${err}`);
    const message = err instanceof Error ? err.message : String(err);
    postSidebarPanel(buildPanelPayload(DEFAULT_QUALITY_OPTIONS, selected, false, message));
  } finally {
    refreshInFlight = false;
    if (pendingRefresh) {
      pendingRefresh = false;
      void refreshQualityUI();
    }
  }
}

export function scheduleRefreshQualityUI(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshQualityUI();
  }, 400);
}

export async function switchQuality(height: number): Promise<void> {
  const watchUrl = getLastWatchUrl();

  preferences.set("quality_height", height);
  preferences.sync();
  appendLog(`Quality switched to ${heightLabel(height)} (${height})`);

  if (!watchUrl || !isYouTubeWatchURL(watchUrl)) {
    core.osd(`Default quality: ${heightLabel(height)}`);
    replaceQualityMenu(DEFAULT_QUALITY_OPTIONS, height, (h) => {
      void switchQuality(h);
    });
    postSidebarPanel(defaultPanelPayload(height));
    return;
  }

  const position = mpv.getNumber("time-pos") || 0;
  const duration = mpv.getNumber("duration") || 0;
  const resumeAt =
    duration > 0 ? Math.min(position, Math.max(0, duration - 0.5)) : position;
  if (resumeAt > 0) {
    setPendingSeek(resumeAt);
    appendLog(`Quality reload will resume at ${resumeAt}s`);
  }

  core.osd(`Quality: ${heightLabel(height)}`);
  suppressNextWatchEnd();
  mpv.command("loadfile", [watchUrl, "replace"]);
  scheduleRefreshQualityUI();
}

export function saveWatchUrl(
  rawUrl: string,
  title?: string,
  description?: string,
  ytdlpChapters?: DescriptionChapter[],
): void {
  const url = normalizeMediaURL(rawUrl);
  if (!isYouTubeWatchURL(url)) {
    return;
  }
  const previousWatchUrl = getLastWatchUrl();
  preferences.set("last_watch_url", url);
  preferences.sync();
  if (title) {
    setListedTitle(title);
  }
  if (description) {
    setListedDescription(description);
  }
  if (description || (ytdlpChapters && ytdlpChapters.length > 0)) {
    updateListedChapters(description || "", ytdlpChapters);
    replaceChapterMenu(getListedChapters());
  }

  const selected = getSelectedHeight();
  postSidebarPanel(
    buildPanelPayload(
      getLastPanelPayload()?.items || DEFAULT_QUALITY_OPTIONS,
      selected,
      true,
    ),
  );
  schedulePanelPush();

  if (isSidebarHtmlLoaded() && url !== previousWatchUrl) {
    sidebar.postMessage("watchUrlChanged", { watchUrl: url });
    void postRelatedPreview(url);
  }
}

export function initQualityUI(): void {
  setRelatedPreviewReadyCheck(isSidebarHtmlLoaded);
  setSidebarHandlers({
    onSelectQuality: (height) => {
      void switchQuality(height);
    },
    onRefreshPanel: () => {
      void refreshQualityUI();
    },
  });

  try {
    ensureSidebarLoaded();
  } catch (err) {
    appendLog(`Sidebar eager load failed: ${err}`);
  }

  function enableMenuUpdates(): void {
    if (isNativeMenuUpdatesEnabled()) {
      return;
    }
    enableNativeMenuUpdates();
    scheduleRefreshQualityUI();
  }

  global.onMessage("openYouTubeBrowse", () => {
    revealYouTubePanel("player");
    appendLog("Open YouTube panel triggered");
  });

  event.on("iina.window-loaded", () => {
    enableMenuUpdates();
    try {
      ensureSidebarLoaded();
    } catch (err) {
      appendLog(`Sidebar load on window-loaded failed: ${err}`);
    }
  });

  setTimeout(enableMenuUpdates, 0);

  registerBrowseShortcut();

  postSidebarPanel(defaultPanelPayload(getSelectedHeight()));
}

export function registerFileLoadedRefresh(eventApi: IINA.API.Event): void {
  const onFileLoaded = (): void => {
    ensureExternalAudioSelected();
    ensureSubtitlesSelected();
    applyPendingSeek();
    if (getListedChapters().length > 0) {
      refreshNativeChapterPanel(getListedChapters());
      setTimeout(() => logMpvChapterCount("file-loaded"), 300);
    }

    if (!isSidebarHtmlLoaded()) {
      try {
        ensureSidebarLoaded();
      } catch (err) {
        appendLog(`Sidebar load on file-loaded failed: ${err}`);
      }
    }

    const current = mpv.getString("stream-open-filename") || "";
    const normalized = normalizeMediaURL(current);
    const watchUrl = getLastWatchUrl();
    const isIdleFilename =
      !current ||
      current === "-" ||
      current === "/dev/null" ||
      current.endsWith("null://");
    if (
      !isIdleFilename &&
      !isYouTubeWatchURL(normalized) &&
      !/googlevideo\.com/i.test(normalized) &&
      !isYouTubeWatchURL(watchUrl)
    ) {
      if (watchUrl) {
        preferences.set("last_watch_url", "");
        preferences.sync();
        if (isSidebarHtmlLoaded()) {
          sidebar.postMessage("watchUrlChanged", { watchUrl: "" });
          postRelatedPreviewClear();
        }
      }
      clearListedMetadata();
      replaceChapterMenu([]);
    }
    scheduleRefreshQualityUI();
    notifyPlayerStateFromFileLoaded();
  };

  eventApi.on("iina.file-loaded", onFileLoaded);
}