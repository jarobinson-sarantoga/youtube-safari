import { getLastWatchUrl } from "../preferences";
import { isShuttingDown } from "../lifecycle";
import { openLinkedUrl } from "../youtube-open";
import { isYouTubeWatchURL } from "../youtube";
import { appendLog } from "../ytdl";

export function maybeOpenLastWatchOnIdleLaunch(
  idleBootstrapDone: boolean,
  bootIdle: boolean,
  isManagedPlayer: boolean,
  setIdleBootstrapDone: (done: boolean) => void,
): void {
  if (idleBootstrapDone || !bootIdle || isShuttingDown() || isManagedPlayer) {
    return;
  }
  const lastWatch = getLastWatchUrl();
  if (!isYouTubeWatchURL(lastWatch)) {
    return;
  }
  setIdleBootstrapDone(true);
  appendLog(`Idle dock bootstrap: ${lastWatch}`);
  openLinkedUrl(lastWatch);
}
