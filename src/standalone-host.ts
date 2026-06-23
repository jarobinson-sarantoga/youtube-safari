import { getSelectedHeight } from "./qualities";
import { defaultPanelPayload } from "./sidebar-state";
import {
  getStandaloneCoordinator,
  installStandaloneBridge,
  isStandaloneShellInitialized,
  isStandaloneWebViewReady,
  markStandaloneShellLoaded,
  onStandaloneSidebarReady,
  postToStandalone,
  setPendingStandaloneFocus,
  takePendingStandaloneFocus,
} from "./standalone-bridge";
import { invalidateBrowseSessionCaches } from "./browse/session-invalidate";
import { primePanelCookiesOnFirstLoad } from "./youtube-refresh";
import { appendLog } from "./ytdl";

const { global, standaloneWindow } = iina;

function requestActivePlayerNowPlayingSync(): void {
  const coordinator = getStandaloneCoordinator();
  const playerId = coordinator?.getActivePlayerId() ?? null;
  if (playerId !== null && coordinator?.isPlayerConfirmedReady()) {
    global.postMessage(playerId, "syncNowPlaying", {});
  }
}

/** Pre-load shell at global startup (same pattern as IINA User Scripts / Cmd+Shift+U). */
export function initStandaloneShell(): void {
  if (isStandaloneShellInitialized()) {
    return;
  }

  standaloneWindow.setProperty({
    title: "YouTube",
    resizable: true,
  });
  standaloneWindow.setFrame(420, 820);
  standaloneWindow.loadFile("sidebar/shell.html");
  installStandaloneBridge();
  markStandaloneShellLoaded();
  appendLog("Standalone shell preloaded at global startup");
}

export function openStandalonePanel(): void {
  appendLog("Open YouTube panel (standalone window)");

  if (!isStandaloneShellInitialized()) {
    initStandaloneShell();
  }

  setPendingStandaloneFocus("browse");
  standaloneWindow.open();

  if (isStandaloneWebViewReady()) {
    postToStandalone("focusBrowse", {});
    takePendingStandaloneFocus();
  }
}

export function forwardPanelRelay(name: string, data: unknown): void {
  if (!isStandaloneShellInitialized() || !isStandaloneWebViewReady()) {
    return;
  }
  postToStandalone(name, data);
}

export function notifyStandaloneFeedsStale(): void {
  if (!isStandaloneShellInitialized() || !isStandaloneWebViewReady()) {
    return;
  }
  postToStandalone("feedsStale", {});
}

onStandaloneSidebarReady(() => {
  void (async () => {
    const refreshed = await primePanelCookiesOnFirstLoad();
    if (refreshed) {
      invalidateBrowseSessionCaches();
      notifyStandaloneFeedsStale();
    }

    postToStandalone("browseReady", {});
    postToStandalone("panel", defaultPanelPayload(getSelectedHeight()));
    requestActivePlayerNowPlayingSync();

    const pending = takePendingStandaloneFocus();
    if (pending === "browse") {
      postToStandalone("focusBrowse", {});
    } else if (pending === "player") {
      postToStandalone("focusPlayer", {});
    }
  })();
});