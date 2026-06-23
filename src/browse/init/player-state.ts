import { getLastWatchUrl } from "../../preferences";
import { postSidebarPanelMessage } from "../../panel-relay";
import { isYouTubeWatchURL, normalizeMediaURL } from "../../youtube";
import type { PlayerStateMessage } from "../messages";

const { core, mpv } = iina;

let playerStateTimer: ReturnType<typeof setInterval> | null = null;

function buildPlayerState(): PlayerStateMessage {
  const watchUrl = getLastWatchUrl();
  const position = mpv.getNumber("time-pos") || 0;
  const duration = mpv.getNumber("duration") || 0;
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
