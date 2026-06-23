import { postToPlugin } from "./messaging";

const NOW_PLAYING_SYNC_DELAYS_MS = [600, 2000, 5000, 10000];

let syncGeneration = 0;

/** Poll the active player for metadata + progress after playback starts. */
export function scheduleNowPlayingSync(): void {
  const generation = ++syncGeneration;
  for (const delay of NOW_PLAYING_SYNC_DELAYS_MS) {
    window.setTimeout(() => {
      if (generation !== syncGeneration) {
        return;
      }
      postToPlugin("syncNowPlaying", {});
    }, delay);
  }
}

export function cancelNowPlayingSync(): void {
  syncGeneration += 1;
}

/** @deprecated Use scheduleNowPlayingSync */
export const scheduleListenNowPlayingSync = scheduleNowPlayingSync;

/** @deprecated Use cancelNowPlayingSync */
export const cancelListenNowPlayingSync = cancelNowPlayingSync;