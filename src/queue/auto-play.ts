import { appendLog } from "../ytdl";
import { openLinkedUrl } from "../youtube-open";
import { youtubeWatchUrl } from "../youtube";
import { shiftQueue } from "../browse/store/queue";
import { getQueueData } from "../browse/store/queue/storage";
import { isAutoQueueEnabled } from "../preferences";

const { core } = iina;

let queueAutoPlayEnabled = true;

export function setQueueAutoPlayEnabled(enabled: boolean): void {
  queueAutoPlayEnabled = enabled;
}

export function playNextInQueue(): boolean {
  if (!isAutoQueueEnabled() || !queueAutoPlayEnabled) {
    return false;
  }
  const next = shiftQueue();
  if (!next) {
    return false;
  }
  const url = youtubeWatchUrl(next.videoId);
  appendLog(`Queue auto-play: ${next.title}`);
  core.osd(`Up next: ${next.title}`);
  openLinkedUrl(url, { replace: true });
  return true;
}

export function peekQueueLength(): number {
  return getQueueData().entries.length;
}
