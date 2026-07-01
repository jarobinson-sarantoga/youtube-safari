import type { PlayerStateMessage } from "../../browse/messages";
import type { FeedItem } from "../../browse/types";
import { DEFAULT_QUALITY_OPTIONS } from "../../sidebar-state";
import { onPluginMessage, postToPlugin } from "../messaging";
import { parsePanelPayload } from "../parse";
import { setupChapterSelect } from "./chapters";
import {
  renderBookmarks,
  renderTranscript,
  setupBookmarksPanel,
  setupTranscriptPanel,
  updateSleepStatus,
  updateSpeedSelect,
} from "./extras";
import { mountPlayerExtras } from "./extras-mount";
import { applyWatchUrlToNowPlaying } from "./hero";
import { handlePlayerState, renderPanel } from "./panel";
import { setupQualitySelect } from "./quality";
import { setupRelatedKeyboard } from "./related-keyboard";
import { renderRelatedPreview } from "./related-render";
import { requestRelatedPreviewForCurrentWatch } from "./related-request";
import { playerState, resetRelatedPreviewCache } from "./state";

export function initPlayerPanel(): void {
  mountPlayerExtras();
  setupQualitySelect();
  setupChapterSelect();
  setupRelatedKeyboard();
  setupTranscriptPanel();
  setupBookmarksPanel();

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
      const videoId = watchUrl.match(/[?&]v=([^&]+)/)?.[1] || "";
      if (videoId) {
        postToPlugin("requestBookmarks", { videoId });
      }
    } else {
      playerState.relatedLoadVideoId = "";
      resetRelatedPreviewCache();
    }
  });

  onPluginMessage("transcript", (raw) => {
    const data = (raw || {}) as {
      videoId?: string;
      cues?: { start: number; end: number; text: string }[];
      error?: string;
      loading?: boolean;
    };
    renderTranscript(data.videoId || "", data.cues || [], data.error, data.loading);
  });

  onPluginMessage("bookmarks", (raw) => {
    const data = (raw || {}) as {
      videoId?: string;
      items?: { id: string; seconds: number; label: string }[];
    };
    renderBookmarks(data.videoId || "", data.items || []);
  });

  onPluginMessage("playbackSpeed", (raw) => {
    const speed = (raw as { speed?: number } | undefined)?.speed;
    if (typeof speed === "number") {
      updateSpeedSelect(speed);
    }
  });

  onPluginMessage("sleepTimer", (raw) => {
    const endsAt = (raw as { endsAt?: number } | undefined)?.endsAt || 0;
    updateSleepStatus(endsAt);
  });

  onPluginMessage("panelPrefs", (raw) => {
    const hideRelated = !!(raw as { hideRelated?: boolean } | undefined)?.hideRelated;
    document.getElementById("related-preview-section")?.classList.toggle("hidden", hideRelated);
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
