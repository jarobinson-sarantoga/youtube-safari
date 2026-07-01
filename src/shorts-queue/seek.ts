import { getActiveShortsQueue } from "./state";

const { mpv } = iina;

export function seekShortsQueueIndex(index: number): boolean {
  const active = getActiveShortsQueue();
  if (!active || index < 0 || index >= active.videoIds.length) {
    return false;
  }
  mpv.command("set", ["playlist-pos", index]);
  mpv.command("playlist-play-index", [index]);
  return true;
}
