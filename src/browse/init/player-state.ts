import { getLastWatchUrl } from "../../preferences";
import { postSidebarPanelMessage } from "../../panel-relay";
import { isYouTubeWatchURL, normalizeMediaURL } from "../../youtube";
import type { PlayerStateMessage } from "../messages";

const { core, mpv } = iina;

let playerStateTimer: ReturnType<typeof setInterval> | null = null;

function readMpvSeconds(property: string): number {
  const raw = mpv.getNumber(property);
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return 0;
  }
  return Math.max(0, raw);
}

function buildPlayerState(): PlayerStateMessage {
  const watchUrl = getLastWatchUrl();
  const position = readMpvSeconds("time-pos");
  const duration = readMpvSeconds("duration");
  const paused = mpv.getFlag("pause");

  let title = "";
  try {
    title =
      mpv.getString("file-local-options/force-media-title") ||
      mpv.getString("media-title") ||
      core.status.title ||
      "";
  } catch {
    title = core.status.title || "";
  }

  return {
    watchUrl,
    title,
    position,
    duration,
    paused,
  };
}

export function postPlayerState(): void {
  postSidebarPanelMessage("playerState", buildPlayerState());
}

export function startPlayerStatePolling(): void {
  if (playerStateTimer) {
    return;
  }
  playerStateTimer = setInterval(() => {
    postPlayerState();
  }, 1000);
}

export function stopPlayerStatePolling(): void {
  if (playerStateTimer) {
    clearInterval(playerStateTimer);
    playerStateTimer = null;
  }
}

export function notifyPlayerStateFromFileLoaded(): void {
  const current = mpv.getString("stream-open-filename") || "";
  const normalized = normalizeMediaURL(current);
  const watchUrl = getLastWatchUrl();

  if (isYouTubeWatchURL(watchUrl) || /googlevideo\.com/i.test(normalized)) {
    postPlayerState();
    startPlayerStatePolling();
  }
}

/** Push full Now Playing metadata and live playback state to the panel. */
export function syncNowPlayingToPanel(): void {
  postPlayerState();
  startPlayerStatePolling();
}
