import { appendLog } from "../ytdl";
import { openYouTubeWatchUrlCore } from "./open-watch-core";
import {
  getQueuePollerTimer,
  OPEN_URL_QUEUE,
  setQueuePollerTimer,
} from "./state";
import type { PlayerCoordinator } from "./types";

const { file, utils } = iina;

/** Poll a CLI-written queue file (scripts/open-url.sh). */
export function startOpenUrlQueuePoller(coordinator: PlayerCoordinator): void {
  if (getQueuePollerTimer()) {
    return;
  }
  setQueuePollerTimer(setInterval(() => {
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
      let url = raw;
      let background = false;
      if (raw.startsWith("{")) {
        try {
          const parsed = JSON.parse(raw) as {
            url?: string;
            background?: boolean;
          };
          if (typeof parsed.url === "string" && parsed.url.trim()) {
            url = parsed.url.trim();
            background = !!parsed.background;
          }
        } catch {
          appendLog(`open-url queue JSON parse failed: ${raw.slice(0, 120)}`);
        }
      }
      openYouTubeWatchUrlCore(url, coordinator, { background });
    } catch (err) {
      appendLog(`open-url queue error: ${err}`);
    }
  }, 400));
}

export function stopOpenUrlQueuePoller(): void {
  const timer = getQueuePollerTimer();
  if (!timer) {
    return;
  }
  clearInterval(timer);
  setQueuePollerTimer(null);
  appendLog("Open-url queue poller stopped");
}
