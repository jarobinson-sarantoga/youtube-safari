import type { PlayerCoordinator } from "../open-url-global";

let activePlayerId: number | null = null;
let playerConfirmedReady = false;
let pendingCookieRefreshNotify = false;
let livePlayerCount = 0;

export const playerCoordinator: PlayerCoordinator = {
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

export function incrementLivePlayerCount(): void {
  livePlayerCount += 1;
}

export function decrementLivePlayerCount(): void {
  livePlayerCount = Math.max(0, livePlayerCount - 1);
}

export function isPendingCookieRefreshNotify(): boolean {
  return pendingCookieRefreshNotify;
}

export function setPendingCookieRefreshNotify(value: boolean): void {
  pendingCookieRefreshNotify = value;
}

export function clearActivePlayer(): void {
  activePlayerId = null;
  playerConfirmedReady = false;
}
