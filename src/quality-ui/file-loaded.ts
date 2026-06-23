import { logMpvChapterCount, refreshNativeChapterPanel } from "../chapters-mpv";
import { ensureExternalAudioSelected } from "../audio-track";
import { ensureSubtitlesSelected } from "../subtitles";
import { getLastWatchUrl } from "../preferences";
import { notifyPlayerStateFromFileLoaded } from "../browse/init";
import {
  clearListedMetadata,
  enableNativeMenuUpdates,
  getListedChapters,
  isNativeMenuUpdatesEnabled,
  replaceChapterMenu,
} from "../native-menus";
import { appendLog } from "../ytdl";
import { isYouTubeWatchURL, normalizeMediaURL } from "../youtube";
import { applyPendingSeek } from "../youtube-open";
import { ensureSidebarLoaded, isSidebarHtmlLoaded } from "../sidebar-host";
import { postSidebarPanelMessage } from "../panel-relay";
import { postRelatedPreviewClear } from "../related-preview-bridge";
import { scheduleRefreshQualityUI } from "./refresh";

const { mpv, preferences } = iina;

export function registerFileLoadedRefresh(eventApi: IINA.API.Event): void {
  const onFileLoaded = (): void => {
    if (!isNativeMenuUpdatesEnabled()) {
      enableNativeMenuUpdates();
    }

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
        postSidebarPanelMessage("watchUrlChanged", { watchUrl: "" });
        postRelatedPreviewClear();
      }
      clearListedMetadata();
      replaceChapterMenu([]);
    }
    scheduleRefreshQualityUI();
    notifyPlayerStateFromFileLoaded();
  };

  eventApi.on("iina.file-loaded", onFileLoaded);
}
