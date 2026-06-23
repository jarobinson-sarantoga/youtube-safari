import { normalizePlayerId } from "../player-id";
import { appendLog } from "../ytdl";
import { registerManagedPlayer } from "./managed-players";
import { bumpPlayGeneration, getPlayGeneration } from "./play-generation";
import { managedPlayerBackground } from "./state";
import type { PlayerCoordinator } from "./types";

const { global } = iina;

export function postWatchUrl(
  playerId: number,
  url: string,
  background = false,
  generation = getPlayGeneration(),
): void {
  global.postMessage(playerId, "openYouTubeWatch", {
    url,
    background,
    playGeneration: generation,
  });
  appendLog(
    `Posted openYouTubeWatch: ${url}${background ? " (background)" : ""}`,
  );
}

export function createManagedPlayer(
  coordinator: PlayerCoordinator,
  background: boolean,
): number | null {
  const playerId = normalizePlayerId(
    global.createPlayerInstance({
      enablePlugins: false,
      disableWindowAnimation: background,
      disableUI: background,
      label: "youtube-open",
    }),
  );
  if (playerId === null) {
    return null;
  }

  coordinator.setActivePlayerId(playerId);
  coordinator.setPlayerConfirmedReady(true);
  registerManagedPlayer(playerId);
  managedPlayerBackground.set(playerId, background);
  return playerId;
}

export { bumpPlayGeneration };
