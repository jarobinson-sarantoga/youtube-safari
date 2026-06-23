import { normalizePlayerId } from "../player-id";
import { appendLog } from "../ytdl";
import { postWatchUrl } from "./player-create";
import {
  clearPendingWatchState,
  getPendingBackgroundPlay,
  getPendingWatchUrl,
} from "./state";
import type { PendingWatchRequest, PlayerCoordinator } from "./types";

/** Drain a watch URL queued while the player instance was starting. */
export function drainPendingWatchUrl(
  playerId: number,
  coordinator: PlayerCoordinator,
): void {
  const activeId = normalizePlayerId(coordinator.getActivePlayerId());
  const normalizedTarget = normalizePlayerId(playerId);
  const pendingWatchUrl = getPendingWatchUrl();
  if (!pendingWatchUrl || activeId === null || activeId !== normalizedTarget) {
    return;
  }
  if (!coordinator.isPlayerConfirmedReady()) {
    appendLog(
      `Pending watch not drained (player not confirmed ready, target=${normalizedTarget})`,
    );
    return;
  }
  const url = pendingWatchUrl;
  const background = getPendingBackgroundPlay();
  clearPendingWatchState();
  postWatchUrl(normalizedTarget, url, background);
  appendLog(
    `Drained pending openYouTubeWatch: ${url}${background ? " (background)" : ""}`,
  );
}

/** After browse or watch, prefer watch URL if both were requested. */
export function takePendingWatchRequest(): PendingWatchRequest {
  const request = {
    url: getPendingWatchUrl(),
    background: getPendingBackgroundPlay(),
  };
  clearPendingWatchState();
  return request;
}

/** @deprecated Use takePendingWatchRequest */
export function takePendingWatchUrl(): string | null {
  return takePendingWatchRequest().url;
}

export function hasPendingWatchUrl(): boolean {
  return getPendingWatchUrl() !== null;
}

export function clearPendingWatchUrl(): void {
  clearPendingWatchState();
}
