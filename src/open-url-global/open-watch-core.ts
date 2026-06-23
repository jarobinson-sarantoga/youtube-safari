import { normalizePlayerId } from "../player-id";
import { isYouTubeWatchURL, normalizeMediaURL } from "../youtube";
import { appendLog } from "../ytdl";
import {
  closeOrphanManagedPlayers,
  queueRetireManagedPlayers,
  retireAllBackgroundPlayersNow,
} from "./managed-players";
import { bumpPlayGeneration, createManagedPlayer, postWatchUrl } from "./player-create";
import {
  managedPlayerBackground,
  managedPlayerIds,
  setPendingWatch,
} from "./state";
import type { OpenYouTubeWatchOptions, PlayerCoordinator } from "./types";
import { drainPendingWatchUrl } from "./pending-watch";

const { global } = iina;

/** Open a YouTube watch URL in a plugin-enabled player window. */
export function openYouTubeWatchUrlCore(
  url: string,
  coordinator: PlayerCoordinator,
  options?: OpenYouTubeWatchOptions,
): void {
  const background = !!options?.background;
  const normalized = normalizeMediaURL(url);
  if (!isYouTubeWatchURL(normalized)) {
    appendLog(`Open URL rejected (not YouTube watch): ${url}`);
    return;
  }

  appendLog(
    `Open YouTube URL: ${normalized}${background ? " (background)" : ""}`,
  );

  try {
    global.postMessage(null, "suppressIdleBootstrap", {});
  } catch {
    // Best-effort — player may not be loaded yet.
  }

  const activeId = normalizePlayerId(coordinator.getActivePlayerId());
  const reusingActiveBackgroundPlayer =
    !background &&
    activeId !== null &&
    coordinator.isPlayerConfirmedReady() &&
    managedPlayerIds.has(activeId) &&
    !!managedPlayerBackground.get(activeId);

  if (!background) {
    if (reusingActiveBackgroundPlayer) {
      managedPlayerBackground.set(activeId!, false);
      appendLog(`Foreground play: reusing background listener ${activeId}`);
    } else {
      retireAllBackgroundPlayersNow(coordinator);
    }
  }

  const generation = bumpPlayGeneration();
  if (
    activeId !== null &&
    coordinator.isPlayerConfirmedReady() &&
    managedPlayerIds.has(activeId)
  ) {
    closeOrphanManagedPlayers(activeId, coordinator);
    managedPlayerBackground.set(activeId, background);
    appendLog(`Reusing managed player: ${activeId}`);
    postWatchUrl(activeId, normalized, background, generation);
    return;
  }

  if (activeId !== null && coordinator.isPlayerConfirmedReady()) {
    coordinator.setActivePlayerId(null);
    coordinator.setPlayerConfirmedReady(false);
  }

  const stalePlayers = [...managedPlayerIds];

  setPendingWatch(normalized, background);
  coordinator.setPlayerConfirmedReady(false);

  const playerId = createManagedPlayer(coordinator, background);
  if (playerId === null) {
    appendLog(`Create player failed for URL: ${normalized}`);
    return;
  }

  appendLog(`Created player for URL: ${playerId} (pending ${normalized})`);
  drainPendingWatchUrl(playerId, coordinator);
  queueRetireManagedPlayers(stalePlayers, coordinator, playerId, { deferFlush: true });
}
