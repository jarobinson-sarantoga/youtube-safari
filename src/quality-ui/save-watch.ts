import type { DescriptionChapter } from "../description-chapters";
import { getLastWatchUrl } from "../preferences";
import { getSelectedHeight } from "../qualities";
import { DEFAULT_QUALITY_OPTIONS } from "../sidebar-state";
import { syncNowPlayingToPanel } from "../browse/init";
import {
  getListedChapters,
  replaceChapterMenu,
  setListedDescription,
  setListedTitle,
  updateListedChapters,
} from "../native-menus";
import { postSidebarPanelMessage } from "../panel-relay";
import { postRelatedPreview } from "../related-preview-bridge";
import { isShortsQueueActive } from "../shorts-queue";
import { buildPanelPayload, getLastPanelPayload, postSidebarPanel, schedulePanelPush } from "../sidebar-host";
import { isYouTubeWatchURL, normalizeMediaURL } from "../youtube";

const { preferences } = iina;

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
  const panelLoading = !title;
  postSidebarPanel(
    buildPanelPayload(
      getLastPanelPayload()?.items || DEFAULT_QUALITY_OPTIONS,
      selected,
      panelLoading,
    ),
  );
  schedulePanelPush();
  syncNowPlayingToPanel();

  if (url !== previousWatchUrl && !isShortsQueueActive()) {
    postSidebarPanelMessage("watchUrlChanged", { watchUrl: url });
    void postRelatedPreview(url);
  }
}
