import type { BrowseRefreshMessage, PlayVideoMessage } from "../browse/messages";
import { openYouTubeWatchUrl } from "../open-url-global";
import {
  buildRefreshPanelPayload,
  handleBrowseRefresh,
  postRelatedPreview,
  resolvePlayVideoUrl,
  resolveRelatedPreviewWatchUrl,
} from "../panel-handlers";
import { getLastWatchUrl } from "../preferences";
import { appendLog } from "../ytdl";
import { isYouTubeWatchURL } from "../youtube";
import {
  getStandaloneCoordinator,
  postToStandalone,
  runStandaloneSidebarReadyCallback,
  setStandaloneWebViewReady,
} from "./state";

const { global, standaloneWindow } = iina;

function proxyToPlayer(action: string, data: unknown): void {
  const coordinator = getStandaloneCoordinator();
  const playerId = coordinator?.getActivePlayerId() ?? null;
  if (playerId === null || !coordinator?.isPlayerConfirmedReady()) {
    appendLog(`panelProxy skipped (no active player): ${action}`);
    return;
  }
  global.postMessage(playerId, "panelProxy", { action, data });
}

export function registerStandaloneInboundHandlers(): void {
  standaloneWindow.onMessage("browseRefresh", (data: BrowseRefreshMessage) => {
    void handleBrowseRefresh(data, postToStandalone);
  });

  standaloneWindow.onMessage("playVideo", (data: PlayVideoMessage) => {
    const url = resolvePlayVideoUrl(data);
    if (!url) {
      appendLog("playVideo ignored (no url/videoId)");
      return;
    }
    const coordinator = getStandaloneCoordinator();
    if (!coordinator) {
      appendLog("playVideo ignored (no player coordinator)");
      return;
    }
    if (data.shortsQueue?.videoIds.length) {
      global.postMessage("closeManagedPlayers", {});
      proxyToPlayer("playVideo", data);
      postToStandalone("watchUrlChanged", { watchUrl: url });
      return;
    }
    global.postMessage("closeManagedPlayers", {});
    openYouTubeWatchUrl(url, coordinator, {
      background: !!data.background,
    });
    postToStandalone("watchUrlChanged", { watchUrl: url });
  });

  standaloneWindow.onMessage("requestRelatedPreview", (data: {
    force?: boolean;
    watchUrl?: string;
  } | undefined) => {
    const watchUrl = resolveRelatedPreviewWatchUrl(data);
    void postRelatedPreview(watchUrl, postToStandalone, !!data?.force);
  });

  standaloneWindow.onMessage("syncNowPlaying", () => {
    const coordinator = getStandaloneCoordinator();
    const playerId = coordinator?.getActivePlayerId() ?? null;
    if (playerId !== null && coordinator?.isPlayerConfirmedReady()) {
      global.postMessage(playerId, "syncNowPlaying", {});
    }
  });

  standaloneWindow.onMessage("refreshPanel", () => {
    const coordinator = getStandaloneCoordinator();
    const playerId = coordinator?.getActivePlayerId() ?? null;
    if (playerId !== null && coordinator?.isPlayerConfirmedReady()) {
      global.postMessage(playerId, "syncNowPlaying", {});
    }
    void (async () => {
      const payload = await buildRefreshPanelPayload();
      postToStandalone("panel", payload);
    })();
  });

  standaloneWindow.onMessage("selectQuality", (data: { height?: number }) => {
    proxyToPlayer("selectQuality", data);
  });

  standaloneWindow.onMessage("descriptionSeek", (data: { seconds?: number | string }) => {
    proxyToPlayer("descriptionSeek", data);
  });

  standaloneWindow.onMessage("seek", (data: { seconds?: number | string }) => {
    proxyToPlayer("seek", data);
  });

  standaloneWindow.onMessage("openUrl", (data: { url?: string }) => {
    proxyToPlayer("openUrl", data);
  });

  standaloneWindow.onMessage("appendShortsQueue", (data: { videoIds?: string[] }) => {
    proxyToPlayer("appendShortsQueue", data);
  });
}

export function registerStandaloneReadyHandler(): void {
  standaloneWindow.onMessage("sidebarReady", () => {
    setStandaloneWebViewReady(true);
    appendLog("Standalone webview ready");

    runStandaloneSidebarReadyCallback();

    const watchUrl = getLastWatchUrl();
    if (isYouTubeWatchURL(watchUrl)) {
      void postRelatedPreview(watchUrl, postToStandalone);
    }
  });
}
