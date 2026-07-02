import {
  clearPendingWatchUrl,
  closeManagedPlayersForNewPlayback,
  drainPendingWatchUrl,
  flushPendingRetirePlayers,
  hasPendingWatchUrl,
  openYouTubeWatchUrl,
  registerManagedPlayer,
  retireAllBackgroundPlayersNow,
  startOpenUrlQueuePoller,
  unregisterManagedPlayer,
} from "../open-url-global";
import { normalizePlayerId } from "../player-id";
import { forwardPanelRelay } from "../standalone-host";
import { openYouTubePanelSmart } from "../open-panel-router";
import { appendLog } from "../ytdl";
import { exitShortsQueue, takePendingShortsPlayVideo } from "../shorts-queue";
import {
  clearActivePlayer,
  decrementLivePlayerCount,
  incrementLivePlayerCount,
  isPendingCookieRefreshNotify,
  playerCoordinator,
} from "./coordinator";
import { installGlobalMenuItems } from "./menu";
import { postDeferredCookiesRefreshed } from "./cookies";

const { global } = iina;

export function registerGlobalMessageHandlers(): void {
  global.onMessage("openStandalonePanel", () => {
    appendLog("Open YouTube panel (global shortcut message)");
    openYouTubePanelSmart("browse");
  });

  global.onMessage("playerReady", (data: { idle?: boolean; label?: string } | undefined, playerId) => {
    const normalizedId = normalizePlayerId(playerId);
    if (normalizedId === null) {
      appendLog(`Player ready ignored (missing player id, raw=${String(playerId)})`);
      return;
    }

    const expectedId = playerCoordinator.getActivePlayerId();
    if (
      hasPendingWatchUrl() &&
      expectedId !== null &&
      !playerCoordinator.isPlayerConfirmedReady() &&
      normalizePlayerId(expectedId) !== normalizedId
    ) {
      appendLog(`Player ready ignored (expected ${expectedId}, got ${normalizedId})`);
      return;
    }

    incrementLivePlayerCount();
    installGlobalMenuItems();
    startOpenUrlQueuePoller(playerCoordinator);
    playerCoordinator.setActivePlayerId(normalizedId);
    playerCoordinator.setPlayerConfirmedReady(true);
    if (data?.label === "youtube-open") {
      registerManagedPlayer(normalizedId);
    }
    appendLog(`Player ready: ${normalizedId}`);
    flushPendingRetirePlayers(playerCoordinator);

    if (isPendingCookieRefreshNotify()) {
      postDeferredCookiesRefreshed(normalizedId);
    }

    drainPendingWatchUrl(normalizedId, playerCoordinator);

    const pendingPlay = takePendingShortsPlayVideo();
    if (pendingPlay?.shortsQueue?.videoIds.length) {
      global.postMessage(normalizedId, "panelProxy", {
        action: "playVideo",
        data: pendingPlay,
      });
      appendLog("Drained pending Shorts queue play");
    }
  });

  global.onMessage("playerClosed", (_data, playerId) => {
    const normalizedId = normalizePlayerId(playerId);
    if (normalizedId === null) {
      return;
    }
    decrementLivePlayerCount();
    unregisterManagedPlayer(normalizedId);
    appendLog(`Player closed: ${normalizedId}`);
    if (playerCoordinator.getActivePlayerId() === normalizedId) {
      clearPendingWatchUrl();
      clearActivePlayer();
    }
    // Keep the open-url poller running — stopping here drops queued panel plays
    // while the replacement player is still starting.
  });

  global.onMessage("panelRelay", (payload: { name?: string; data?: unknown }) => {
    const name = payload?.name;
    if (typeof name !== "string") {
      return;
    }
    forwardPanelRelay(name, payload.data ?? {});
  });

  global.onMessage("closeManagedPlayers", () => {
    closeManagedPlayersForNewPlayback(playerCoordinator);
  });

  global.onMessage("retireBackgroundPlayers", () => {
    retireAllBackgroundPlayersNow(playerCoordinator);
  });

  global.onMessage("panelPlayVideo", (data: {
    url?: string;
    background?: boolean;
  }) => {
    const url = data?.url;
    if (typeof url !== "string" || !url.trim()) {
      return;
    }
    const trimmed = url.trim();
    exitShortsQueue();
    openYouTubeWatchUrl(trimmed, playerCoordinator, {
      background: !!data.background,
    });
    forwardPanelRelay("watchUrlChanged", { watchUrl: trimmed });
  });
}
