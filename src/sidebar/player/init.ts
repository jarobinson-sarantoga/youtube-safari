import type { PlayerStateMessage } from "../../browse/messages";
import type { FeedItem } from "../../browse/types";
import { DEFAULT_QUALITY_OPTIONS } from "../../sidebar-state";
import { onPluginMessage } from "../messaging";
import { parsePanelPayload } from "../parse";
import { setupChapterSelect } from "./chapters";
import { applyWatchUrlToNowPlaying } from "./hero";
import { handlePlayerState, renderPanel } from "./panel";
import { setupQualitySelect } from "./quality";
import { setupRelatedKeyboard } from "./related-keyboard";
import { renderRelatedPreview } from "./related-render";
import { requestRelatedPreviewForCurrentWatch } from "./related-request";
import { playerState, resetRelatedPreviewCache } from "./state";

export function initPlayerPanel(): void {
  setupQualitySelect();
  setupChapterSelect();
  setupRelatedKeyboard();

  onPluginMessage("panel", (raw) => {
    const data = parsePanelPayload(raw);
    if (data) {
      renderPanel(data);
    }
  });

  onPluginMessage("playerState", (raw) => {
    handlePlayerState((raw || {}) as PlayerStateMessage);
  });

  onPluginMessage("relatedPreview", (raw) => {
    const data = (raw || {}) as {
      videoId?: string;
      items?: FeedItem[];
      error?: string;
      relatedRequestId?: number;
    };
    renderRelatedPreview(data.videoId || "", data.items || [], data.error, data.relatedRequestId);
  });

  onPluginMessage("feedsStale", () => {
    resetRelatedPreviewCache();
    requestRelatedPreviewForCurrentWatch(true);
  });

  onPluginMessage("watchUrlChanged", (raw) => {
    const watchUrl = (raw as { watchUrl?: string } | undefined)?.watchUrl || "";
    if (watchUrl) {
      applyWatchUrlToNowPlaying(watchUrl);
      requestRelatedPreviewForCurrentWatch();
    } else {
      playerState.relatedLoadVideoId = "";
      resetRelatedPreviewCache();
    }
  });

  renderPanel({
    items: DEFAULT_QUALITY_OPTIONS,
    selected: 0,
    title: "",
    description: "",
    chapters: [],
    loading: false,
  });
}
