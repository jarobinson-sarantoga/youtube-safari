import type { BrowseRefreshMessage } from "./browse/messages";
import type { PlayerCoordinator } from "./open-url-global";
import { openYouTubeWatchUrl } from "./open-url-global";
import {
  buildRefreshPanelPayload,
  handleBrowseRefresh,
  postRelatedPreview,
  resolvePlayVideoUrl,
  resolveRelatedPreviewWatchUrl,
} from "./panel-handlers";
import { getLastWatchUrl } from "./preferences";
import { appendLog } from "./ytdl";
import { isYouTubeWatchURL } from "./youtube";

const { global, standaloneWindow } = iina;

type StandaloneFocus = "browse" | "player";

let shellLoaded = false;
let webViewReady = false;
let pendingFocus: StandaloneFocus | null = null;
let bridgeInstalled = false;
let coordinator: PlayerCoordinator | null = null;
let sidebarReadyCallback: (() => void) | null = null;

export function setStandaloneCoordinator(next: PlayerCoordinator): void {
  coordinator = next;
}

export function markStandaloneShellLoaded(): void {
  shellLoaded = true;
}

export function isStandaloneShellInitialized(): boolean {
  return shellLoaded;
}

export function isStandaloneWebViewReady(): boolean {
  return webViewReady;
}

export function postToStandalone(name: string, data: unknown = {}): void {
  standaloneWindow.postMessage(name, data);
}

export function setPendingStandaloneFocus(view: StandaloneFocus): void {
  pendingFocus = view;
}

export function takePendingStandaloneFocus(): StandaloneFocus | null {
  const previous = pendingFocus;
  pendingFocus = null;
  return previous;
}

export function onStandaloneSidebarReady(callback: () => void): void {
  sidebarReadyCallback = callback;
}

function proxyToPlayer(action: string, data: unknown): void {
  const playerId = coordinator?.getActivePlayerId() ?? null;
  if (playerId === null || !coordinator?.isPlayerConfirmedReady()) {
    appendLog(`panelProxy skipped (no active player): ${action}`);
    return;
  }
  global.postMessage(playerId, "panelProxy", { action, data });
}

function registerStandaloneInboundHandlers(): void {
  standaloneWindow.onMessage("browseRefresh", (data: BrowseRefreshMessage) => {
    void handleBrowseRefresh(data, postToStandalone);
  });

  standaloneWindow.onMessage("playVideo", (data: {
    videoId?: string;
    url?: string;
    background?: boolean;
  }) => {
    const url = resolvePlayVideoUrl(data);
    if (!url) {
      appendLog("playVideo ignored (no url/videoId)");
      return;
    }
    if (!coordinator) {
      appendLog("playVideo ignored (no player coordinator)");
      return;
    }
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
    const playerId = coordinator?.getActivePlayerId() ?? null;
    if (playerId !== null && coordinator?.isPlayerConfirmedReady()) {
      global.postMessage(playerId, "syncNowPlaying", {});
    }
  });

  standaloneWindow.onMessage("refreshPanel", () => {
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
}

function registerStandaloneReadyHandler(): void {
  standaloneWindow.onMessage("sidebarReady", () => {
    webViewReady = true;
    appendLog("Standalone webview ready");

    sidebarReadyCallback?.();

    const watchUrl = getLastWatchUrl();
    if (isYouTubeWatchURL(watchUrl)) {
      void postRelatedPreview(watchUrl, postToStandalone);
    }
  });
}

export function installStandaloneBridge(): void {
  if (bridgeInstalled) {
    return;
  }
  bridgeInstalled = true;
  registerStandaloneReadyHandler();
  registerStandaloneInboundHandlers();
}