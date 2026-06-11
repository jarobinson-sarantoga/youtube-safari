import { notifyCookieHealthIfNeeded } from "./cookie-health";
import {
  drainPendingWatchUrl,
  hasPendingWatchUrl,
  startOpenUrlQueuePoller,
  takePendingWatchUrl,
} from "./open-url-global";
import { getLastWatchUrl } from "./preferences";
import { appendLog, getLogPath } from "./ytdl";
import { isYouTubeWatchURL } from "./youtube";

const { global, menu, preferences, utils, console } = iina;

const DEFAULT_REFRESH_SCRIPT = "~/Projects/youtube-safari/scripts/refresh-cookies.sh";

let activePlayerId: number | null = null;
let pendingBrowse = false;
let playerConfirmedReady = false;
let pendingCookieRefreshNotify = false;

const playerCoordinator = {
  getActivePlayerId: () => activePlayerId,
  setActivePlayerId: (id: number | null) => {
    activePlayerId = id;
  },
  isPlayerConfirmedReady: () => playerConfirmedReady,
  setPlayerConfirmedReady: (ready: boolean) => {
    playerConfirmedReady = ready;
  },
  getPendingBrowse: () => pendingBrowse,
  clearPendingBrowse: () => {
    pendingBrowse = false;
  },
};

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

async function runCookieRefreshScript(script: string): Promise<{
  status: number;
  stdout: string;
  stderr: string;
}> {
  appendLog(`Running cookie refresh: bash ${script}`);
  return utils.exec("/bin/bash", [script]);
}

global.onMessage("playerReady", (data: { idle?: boolean } | undefined, playerId) => {
  if (playerId === null || playerId === undefined) {
    return;
  }
  activePlayerId = playerId;
  playerConfirmedReady = true;
  appendLog(`Player ready: ${playerId}`);

  if (pendingCookieRefreshNotify) {
    global.postMessage(playerId, "cookiesRefreshed", {});
    pendingCookieRefreshNotify = false;
    appendLog("Posted deferred cookiesRefreshed after player ready");
  }

  const watchUrl = takePendingWatchUrl();
  if (watchUrl) {
    global.postMessage(playerId, "openYouTubeWatch", { url: watchUrl });
    appendLog(`Posted pending openYouTubeWatch: ${watchUrl}`);
    pendingBrowse = false;
    return;
  }

  const lastWatch = getLastWatchUrl();
  if (data?.idle && isYouTubeWatchURL(lastWatch)) {
    setTimeout(() => {
      global.postMessage(playerId, "openYouTubeWatch", { url: lastWatch });
      appendLog(`Posted last watch on idle player ready: ${lastWatch}`);
    }, 0);
    return;
  }

  drainPendingWatchUrl(playerId, playerCoordinator);

  if (pendingBrowse && !hasPendingWatchUrl()) {
    global.postMessage(playerId, "openYouTubeBrowse", {});
    pendingBrowse = false;
  }
});

global.onMessage("playerClosed", (_data, playerId) => {
  if (playerId === null || playerId === undefined) {
    return;
  }
  if (activePlayerId === playerId) {
    activePlayerId = null;
    playerConfirmedReady = false;
    appendLog(`Player closed: ${playerId}`);
  }
});

function openYouTubeBrowse(): void {
  appendLog("Open YouTube panel (global menu)");

  if (activePlayerId === null) {
    pendingBrowse = true;
    playerConfirmedReady = false;
    // enablePlugins:false = only this plugin in the new player (IINA global-entry pattern).
    activePlayerId = global.createPlayerInstance({ enablePlugins: false });
    appendLog(`Created player for browse: ${activePlayerId}`);
    return;
  }

  if (!playerConfirmedReady) {
    pendingBrowse = true;
    return;
  }

  global.postMessage(activePlayerId, "openYouTubeBrowse", {});
}

let globalMenuInstalled = false;

function installGlobalMenuItems(): void {
  if (globalMenuInstalled) {
    return;
  }
  globalMenuInstalled = true;

  menu.addItem(
    menu.item("Open YouTube Panel", () => {
      openYouTubeBrowse();
    }),
  );

  menu.addItem(
    menu.item("Refresh Safari Cookies", () => {
      void (async () => {
        appendLog("Refresh Safari Cookies requested");

        const configured = preferences.get("refresh_script") as string | undefined;
        const script = utils.resolvePath(configured || DEFAULT_REFRESH_SCRIPT);
        if (!utils.fileInPath(script)) {
          appendLog(`Missing refresh script: ${script}`);
          return;
        }

        const result = await runCookieRefreshScript(script);
        if (result.status !== 0) {
          const detail = (result.stderr || result.stdout || "unknown error").trim();
          appendLog(`Cookie refresh failed (${result.status}): ${detail}`);
          return;
        }

        const output = (result.stdout || "").trim();
        appendLog(output ? `Cookie refresh OK: ${output}` : "Cookie refresh OK");
        notifyPlayersCookiesRefreshed();
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

  appendLog("Global plugin menu installed");
}

// Defer global menu items — sync menu.addItem during player init crashed/hung IINA (June 2026).
setTimeout(installGlobalMenuItems, 500);

startOpenUrlQueuePoller(playerCoordinator);
notifyCookieHealthIfNeeded();
appendLog("Global entry loaded (open-url queue active)");
console.log("YouTube (Safari Cookies) global entry loaded");