import { notifyCookieHealthIfNeeded } from "./cookie-health";
import {
  clearPendingWatchUrl,
  closeManagedPlayersForNewPlayback,
  drainPendingWatchUrl,
  flushPendingRetirePlayers,
  hasPendingWatchUrl,
  openYouTubeWatchUrl,
  registerManagedPlayer,
  startOpenUrlQueuePoller,
  unregisterManagedPlayer,
} from "./open-url-global";
import { normalizePlayerId } from "./player-id";
import { startOpenPanelQueuePoller } from "./open-panel-global";
import { BROWSE_KEY_BINDING } from "./keybindings";
import {
  forwardPanelRelay,
  initStandaloneShell,
  notifyStandaloneFeedsStale,
  openStandalonePanel,
} from "./standalone-host";
import { setStandaloneCoordinator } from "./standalone-bridge";
import { invalidateBrowseSessionCaches } from "./browse/session-invalidate";
import { refreshYouTubeCookies } from "./youtube-refresh";
import { appendLog, getLogPath } from "./ytdl";

const { global, menu, utils, console } = iina;

let activePlayerId: number | null = null;
let playerConfirmedReady = false;
let pendingCookieRefreshNotify = false;
let livePlayerCount = 0;

const playerCoordinator = {
  getActivePlayerId: () => activePlayerId,
  setActivePlayerId: (id: number | null) => {
    activePlayerId = id;
  },
  isPlayerConfirmedReady: () => playerConfirmedReady,
  setPlayerConfirmedReady: (ready: boolean) => {
    playerConfirmedReady = ready;
  },
  getLivePlayerCount: () => livePlayerCount,
};

const globalMenuState = { installed: false };

function notifyPlayersCookiesRefreshed(): void {
  if (activePlayerId !== null && playerConfirmedReady) {
    global.postMessage(activePlayerId, "cookiesRefreshed", {});
    pendingCookieRefreshNotify = false;
    appendLog("Posted cookiesRefreshed to active player");
    return;
  }
  pendingCookieRefreshNotify = true;
  appendLog("Cookie refresh complete — will notify player on next ready");
}

function installGlobalMenuItems(): boolean {
  if (globalMenuState.installed) {
    return true;
  }

  try {
    menu.addItem(
      menu.item(
        "Open YouTube Panel",
        () => {
          appendLog(`Open YouTube panel (${BROWSE_KEY_BINDING} menu action)`);
          openStandalonePanel();
        },
        { keyBinding: BROWSE_KEY_BINDING },
      ),
    );

    menu.addItem(
      menu.item("Refresh YouTube", () => {
        void (async () => {
          appendLog("Refresh YouTube requested");
          const ok = await refreshYouTubeCookies();
          if (!ok) {
            return;
          }
          invalidateBrowseSessionCaches();
          notifyPlayersCookiesRefreshed();
          notifyStandaloneFeedsStale();
        })();
      }),
    );

    menu.addItem(
      menu.item("View Log", () => {
        void (async () => {
          const logPath = getLogPath();
          appendLog("View Log opened");
          const result = await utils.exec("/usr/bin/open", ["-t", logPath]);
          if (result.status !== 0) {
            appendLog(`open -t failed: ${result.stderr}`);
          }
        })();
      }),
    );

    globalMenuState.installed = true;
    appendLog(`Global plugin menu installed (${BROWSE_KEY_BINDING})`);
    return true;
  } catch (err) {
    appendLog(`Global plugin menu install failed: ${err}`);
    return false;
  }
}

function registerGlobalMessageHandlers(): void {
  global.onMessage("openStandalonePanel", () => {
    appendLog("Open YouTube panel (global shortcut message)");
    openStandalonePanel();
  });

  global.onMessage("playerReady", (data: { idle?: boolean; label?: string } | undefined, playerId) => {
    const normalizedId = normalizePlayerId(playerId);
    if (normalizedId === null) {
      appendLog(`Player ready ignored (missing player id, raw=${String(playerId)})`);
      return;
    }

    const expectedId = activePlayerId;
    if (
      hasPendingWatchUrl() &&
      expectedId !== null &&
      !playerConfirmedReady &&
      normalizePlayerId(expectedId) !== normalizedId
    ) {
      appendLog(`Player ready ignored (expected ${expectedId}, got ${normalizedId})`);
      return;
    }

    livePlayerCount += 1;
    installGlobalMenuItems();
    startOpenUrlQueuePoller(playerCoordinator);
    activePlayerId = normalizedId;
    playerConfirmedReady = true;
    if (data?.label === "youtube-open") {
      registerManagedPlayer(normalizedId);
    }
    appendLog(`Player ready: ${normalizedId}`);
    flushPendingRetirePlayers(playerCoordinator);

    if (pendingCookieRefreshNotify) {
      global.postMessage(normalizedId, "cookiesRefreshed", {});
      pendingCookieRefreshNotify = false;
      appendLog("Posted deferred cookiesRefreshed after player ready");
    }

    drainPendingWatchUrl(normalizedId, playerCoordinator);
  });

  global.onMessage("playerClosed", (_data, playerId) => {
    const normalizedId = normalizePlayerId(playerId);
    if (normalizedId === null) {
      return;
    }
    livePlayerCount = Math.max(0, livePlayerCount - 1);
    unregisterManagedPlayer(normalizedId);
    appendLog(`Player closed: ${normalizedId}`);
    if (activePlayerId === normalizedId) {
      clearPendingWatchUrl();
      activePlayerId = null;
      playerConfirmedReady = false;
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

  global.onMessage("panelPlayVideo", (data: {
    url?: string;
    background?: boolean;
  }) => {
    const url = data?.url;
    if (typeof url !== "string" || !url.trim()) {
      return;
    }
    const trimmed = url.trim();
    openYouTubeWatchUrl(trimmed, playerCoordinator, {
      background: !!data.background,
    });
    forwardPanelRelay("watchUrlChanged", { watchUrl: trimmed });
  });
}

function pingExistingPlayers(): void {
  try {
    global.postMessage(null, "globalPing", {});
    appendLog("Pinged existing players for playerReady sync");
  } catch (err) {
    appendLog(`globalPing failed: ${err}`);
  }
}

function bootstrapGlobalEntry(): void {
  setStandaloneCoordinator(playerCoordinator);

  // User Scripts order: preload standalone shell, then register Plugin menu + keyBinding.
  initStandaloneShell();
  installGlobalMenuItems();
  startOpenPanelQueuePoller();
  startOpenUrlQueuePoller(playerCoordinator);
  registerGlobalMessageHandlers();
  pingExistingPlayers();

  // Rebuild Plugin menu after IINA finishes loading keybindings (large global.js can load late).
  setTimeout(() => {
    try {
      menu.forceUpdate();
      appendLog("Global plugin menu forceUpdate");
    } catch (err) {
      appendLog(`menu.forceUpdate failed: ${err}`);
    }
  }, 400);

  notifyCookieHealthIfNeeded();
  appendLog("Global entry loaded");
  console.log("YouTube global entry loaded");
}

bootstrapGlobalEntry();