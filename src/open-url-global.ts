import { isYouTubeWatchURL, normalizeMediaURL } from "./youtube";
import { appendLog } from "./ytdl";

const { file, global, utils } = iina;

const OPEN_URL_QUEUE = "@data/open-url.pending";

export type PlayerCoordinator = {
  getActivePlayerId: () => number | null;
  setActivePlayerId: (id: number | null) => void;
  isPlayerConfirmedReady: () => boolean;
  setPlayerConfirmedReady: (ready: boolean) => void;
  getPendingBrowse: () => boolean;
  clearPendingBrowse: () => void;
};

let pendingWatchUrl: string | null = null;

function postWatchUrl(playerId: number, url: string): void {
  global.postMessage(playerId, "openYouTubeWatch", { url });
  appendLog(`Posted openYouTubeWatch: ${url}`);
}

/** Open a YouTube watch URL in a plugin-enabled player window. */
export function openYouTubeWatchUrl(
  url: string,
  coordinator: PlayerCoordinator,
): void {
  const normalized = normalizeMediaURL(url);
  if (!isYouTubeWatchURL(normalized)) {
    appendLog(`Open URL rejected (not YouTube watch): ${url}`);
    return;
  }

  appendLog(`Open YouTube URL: ${normalized}`);
  const activeId = coordinator.getActivePlayerId();

  if (activeId === null) {
    pendingWatchUrl = normalized;
    coordinator.setPlayerConfirmedReady(false);
    // Do not pass url here — wait for playerReady so mpv.addHook is registered first.
    const playerId = global.createPlayerInstance();
    coordinator.setActivePlayerId(playerId);
    appendLog(`Created player for URL: ${playerId} (pending ${normalized})`);
    return;
  }

  if (!coordinator.isPlayerConfirmedReady()) {
    pendingWatchUrl = normalized;
    return;
  }

  postWatchUrl(activeId, normalized);
}

/** Drain a watch URL queued while the player instance was starting. */
export function drainPendingWatchUrl(
  playerId: number,
  coordinator: PlayerCoordinator,
): void {
  if (!pendingWatchUrl || coordinator.getActivePlayerId() !== playerId) {
    return;
  }
  if (!coordinator.isPlayerConfirmedReady()) {
    return;
  }
  const url = pendingWatchUrl;
  pendingWatchUrl = null;
  postWatchUrl(playerId, url);
}

/** After browse or watch, prefer watch URL if both were requested. */
export function takePendingWatchUrl(): string | null {
  const url = pendingWatchUrl;
  pendingWatchUrl = null;
  return url;
}

export function hasPendingWatchUrl(): boolean {
  return pendingWatchUrl !== null;
}

/** Poll a CLI-written queue file (scripts/open-url.sh). */
export function startOpenUrlQueuePoller(coordinator: PlayerCoordinator): void {
  setInterval(() => {
    try {
      const path = utils.resolvePath(OPEN_URL_QUEUE);
      if (!file.exists(path)) {
        return;
      }
      const raw = (file.read(path) || "").trim();
      try {
        file.delete(path);
      } catch {
        file.write(path, "");
      }
      if (!raw) {
        return;
      }
      openYouTubeWatchUrl(raw, coordinator);
    } catch (err) {
      appendLog(`open-url queue error: ${err}`);
    }
  }, 400);
}