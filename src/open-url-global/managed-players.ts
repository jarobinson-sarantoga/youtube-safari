import { normalizePlayerId } from "../player-id";
import { appendLog } from "../ytdl";
import { getPlayGeneration } from "./play-generation";
import {
  clearPendingWatchState,
  getRetireCoordinator,
  hasPendingRetirePlayerIds,
  managedPlayerBackground,
  managedPlayerIds,
  pushPendingRetirePlayerId,
  setRetireCoordinator,
  takePendingRetirePlayerIds,
} from "./state";
import type { PlayerCoordinator } from "./types";

const { global } = iina;

function requestCloseManagedPlayer(
  playerId: number,
  coordinator?: PlayerCoordinator,
  options?: { allowWindowQuit?: boolean },
): void {
  const managedRemaining = [...managedPlayerIds].filter((id) => id !== playerId).length;
  const liveCount = coordinator?.getLivePlayerCount?.() ?? managedPlayerIds.size;
  const allowWindowQuit =
    options?.allowWindowQuit ??
    (managedRemaining > 0 || liveCount > 1);

  try {
    global.postMessage(playerId, "closeManagedPlayer", {
      allowWindowQuit,
      playGeneration: getPlayGeneration(),
    });
    appendLog(
      `Posted closeManagedPlayer: ${playerId}${allowWindowQuit ? " (quit)" : " (unload)"}`,
    );
  } catch {
    // Player may already be gone.
  }
}

export function queueRetireManagedPlayers(
  playerIds: readonly number[],
  coordinator: PlayerCoordinator,
  keepPlayerId: number | null = null,
  options?: { deferFlush?: boolean },
): void {
  for (const playerId of playerIds) {
    if (keepPlayerId !== null && playerId === keepPlayerId) {
      continue;
    }
    if (!managedPlayerIds.has(playerId)) {
      continue;
    }
    pushPendingRetirePlayerId(playerId);
  }
  setRetireCoordinator(coordinator);
  if (!options?.deferFlush) {
    flushPendingRetirePlayers();
  }
}

/** Retire queued player windows after a replacement player is ready. */
export function flushPendingRetirePlayers(coordinator?: PlayerCoordinator): void {
  const targetCoordinator = coordinator ?? getRetireCoordinator();
  if (!targetCoordinator || !hasPendingRetirePlayerIds()) {
    return;
  }

  const retiring = takePendingRetirePlayerIds();

  for (const playerId of retiring) {
    if (!managedPlayerIds.has(playerId)) {
      continue;
    }
    requestCloseManagedPlayer(playerId, targetCoordinator, { allowWindowQuit: true });
    managedPlayerIds.delete(playerId);
    managedPlayerBackground.delete(playerId);
  }
}

export function registerManagedPlayer(playerId: number): void {
  const normalized = normalizePlayerId(playerId);
  if (normalized !== null) {
    managedPlayerIds.add(normalized);
  }
}

export function unregisterManagedPlayer(playerId: number): void {
  const normalized = normalizePlayerId(playerId);
  if (normalized !== null) {
    managedPlayerIds.delete(normalized);
    managedPlayerBackground.delete(normalized);
  }
}

function closeOrphanManagedPlayers(
  keepPlayerId: number | null,
  coordinator: PlayerCoordinator,
): void {
  queueRetireManagedPlayers([...managedPlayerIds], coordinator, keepPlayerId);
}

/** Stop playback and close a managed player window immediately. */
function retireManagedPlayerNow(
  playerId: number,
  coordinator: PlayerCoordinator,
): void {
  if (!managedPlayerIds.has(playerId)) {
    return;
  }
  requestCloseManagedPlayer(playerId, coordinator, { allowWindowQuit: true });
  managedPlayerIds.delete(playerId);
  managedPlayerBackground.delete(playerId);
  if (normalizePlayerId(coordinator.getActivePlayerId()) === playerId) {
    coordinator.setActivePlayerId(null);
    coordinator.setPlayerConfirmedReady(false);
  }
}

/** Foreground play must not leave Listen windows playing in the background. */
export function retireAllBackgroundPlayersNow(coordinator: PlayerCoordinator): void {
  for (const playerId of [...managedPlayerIds]) {
    if (managedPlayerBackground.get(playerId)) {
      retireManagedPlayerNow(playerId, coordinator);
    }
  }
}

/** Stop plugin-managed players (e.g. background listeners while playing in another window). */
export function closeManagedPlayersForNewPlayback(
  coordinator: PlayerCoordinator,
): void {
  const closing = [...managedPlayerIds];
  managedPlayerIds.clear();
  managedPlayerBackground.clear();
  coordinator.setActivePlayerId(null);
  coordinator.setPlayerConfirmedReady(false);
  clearPendingWatchState();
  queueRetireManagedPlayers(closing, coordinator);
}

export { closeOrphanManagedPlayers };
