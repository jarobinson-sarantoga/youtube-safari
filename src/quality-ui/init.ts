import { appendLog } from "../ytdl";
import {
  enableNativeMenuUpdates,
  installPlayerMenuSeparator,
  isNativeMenuUpdatesEnabled,
} from "../native-menus";
import {
  ensureSidebarLoaded,
  isSidebarHtmlLoaded,
  postSidebarPanel,
  revealYouTubePanel,
  setSidebarHandlers,
} from "../sidebar-host";
import { getSelectedHeight } from "../qualities";
import { defaultPanelPayload } from "../sidebar-state";
import { setRelatedPreviewReadyCheck } from "../related-preview-bridge";
import { openLinkedUrl, seekPlayback } from "../youtube-open";
import type { PlayVideoMessage } from "../browse/messages";
import { resolvePlayVideoUrl } from "../panel-handlers";
import { openShortsQueue, appendShortsToQueue } from "../shorts-queue";
import { refreshQualityUI, scheduleRefreshQualityUI, cancelScheduledRefresh } from "./refresh";
import { switchQuality } from "./switch-quality";

const { event, global } = iina;

export { revealYouTubePanel };

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

  global.onMessage("panelProxy", (payload: { action?: string; data?: unknown }) => {
    const action = payload?.action;
    const data = payload?.data;
    switch (action) {
      case "selectQuality": {
        const height = (data as { height?: number } | undefined)?.height;
        if (typeof height === "number") {
          void switchQuality(height);
        }
        break;
      }
      case "descriptionSeek":
      case "seek": {
        let seconds = (data as { seconds?: number | string } | undefined)?.seconds;
        if (typeof seconds === "string") {
          seconds = Number.parseFloat(seconds);
        }
        if (typeof seconds === "number" && seconds >= 0 && Number.isFinite(seconds)) {
          seekPlayback(seconds, "description");
        }
        break;
      }
      case "openUrl": {
        const url = (data as { url?: string } | undefined)?.url;
        if (typeof url === "string") {
          openLinkedUrl(url);
        }
        break;
      }
      case "playVideo": {
        const msg = data as PlayVideoMessage;
        const url = resolvePlayVideoUrl(msg);
        if (!url) {
          break;
        }
        if (msg.shortsQueue?.videoIds.length) {
          openShortsQueue(
            msg.shortsQueue.videoIds,
            msg.shortsQueue.startIndex,
            msg.shortsQueue.source,
          );
          break;
        }
        openLinkedUrl(url);
        break;
      }
      case "appendShortsQueue": {
        const ids = (data as { videoIds?: string[] } | undefined)?.videoIds;
        if (Array.isArray(ids) && ids.length) {
          appendShortsToQueue(ids);
        }
        break;
      }
      default:
        appendLog(`panelProxy ignored: ${action ?? "?"}`);
    }
  });

  event.on("iina.window-loaded", () => {
    installPlayerMenuSeparator();
    enableMenuUpdates();
    try {
      ensureSidebarLoaded();
    } catch (err) {
      appendLog(`Sidebar load on window-loaded failed: ${err}`);
    }
  });

  event.on("iina.window-will-close", () => {
    cancelScheduledRefresh();
  });

  postSidebarPanel(defaultPanelPayload(getSelectedHeight()));
}
