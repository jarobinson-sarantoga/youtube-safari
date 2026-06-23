export { bumpPlayGeneration, getPlayGeneration } from "./play-generation";
export type {
  OpenYouTubeWatchOptions,
  PendingWatchRequest,
  PlayerCoordinator,
} from "./types";

export {
  closeManagedPlayersForNewPlayback,
  flushPendingRetirePlayers,
  registerManagedPlayer,
  unregisterManagedPlayer,
} from "./managed-players";

export {
  clearPendingWatchUrl,
  drainPendingWatchUrl,
  hasPendingWatchUrl,
  takePendingWatchRequest,
  takePendingWatchUrl,
} from "./pending-watch";

export { startOpenUrlQueuePoller, stopOpenUrlQueuePoller } from "./queue-poller";

import type { OpenYouTubeWatchOptions, PlayerCoordinator } from "./types";
import { openYouTubeWatchUrlCore } from "./open-watch-core";
import { startOpenUrlQueuePoller } from "./queue-poller";

/** Open a YouTube watch URL in a plugin-enabled player window. */
export function openYouTubeWatchUrl(
  url: string,
  coordinator: PlayerCoordinator,
  options?: OpenYouTubeWatchOptions,
): void {
  startOpenUrlQueuePoller(coordinator);
  openYouTubeWatchUrlCore(url, coordinator, options);
}
