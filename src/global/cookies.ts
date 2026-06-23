import { appendLog } from "../ytdl";
import { playerCoordinator, setPendingCookieRefreshNotify } from "./coordinator";

const { global } = iina;

export function notifyPlayersCookiesRefreshed(): void {
  const activeId = playerCoordinator.getActivePlayerId();
  if (activeId !== null && playerCoordinator.isPlayerConfirmedReady()) {
    global.postMessage(activeId, "cookiesRefreshed", {});
    setPendingCookieRefreshNotify(false);
    appendLog("Posted cookiesRefreshed to active player");
    return;
  }
  setPendingCookieRefreshNotify(true);
  appendLog("Cookie refresh complete — will notify player on next ready");
}

export function postDeferredCookiesRefreshed(playerId: number): void {
  global.postMessage(playerId, "cookiesRefreshed", {});
  setPendingCookieRefreshNotify(false);
  appendLog("Posted deferred cookiesRefreshed after player ready");
}
