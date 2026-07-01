import type { PlayVideoMessage } from "../browse/messages";
import { resolvePlayVideoUrl } from "../panel-handlers";
import { appendShortsToQueue, exitShortsQueue, playShortsQueue } from "../shorts-queue";
import { appendLog } from "../ytdl";
import { openLinkedUrl, seekPlayback } from "../youtube-open";
import { switchQuality } from "./switch-quality";

/** Route standalone panelProxy actions to player handlers. */
export function handlePanelProxy(payload: { action?: string; data?: unknown }): void {
  const action = payload?.action;
  const data = payload?.data;
  switch (action) {
    case "selectQuality": {
      const height = (data as { height?: number } | undefined)?.height;
      if (typeof height === "number") {
        void switchQuality(height);
      }
      break;
    }
    case "descriptionSeek":
    case "seek": {
      let seconds = (data as { seconds?: number | string } | undefined)?.seconds;
      if (typeof seconds === "string") {
        seconds = Number.parseFloat(seconds);
      }
      if (typeof seconds === "number" && seconds >= 0 && Number.isFinite(seconds)) {
        seekPlayback(seconds, "description");
      }
      break;
    }
    case "openUrl": {
      const url = (data as { url?: string } | undefined)?.url;
      if (typeof url === "string") {
        exitShortsQueue();
        openLinkedUrl(url);
      }
      break;
    }
    case "playVideo": {
      const msg = data as PlayVideoMessage;
      const url = resolvePlayVideoUrl(msg);
      if (!url) {
        break;
      }
      if (msg.shortsQueue?.videoIds.length) {
        playShortsQueue(
          msg.shortsQueue.videoIds,
          msg.shortsQueue.startIndex,
          msg.shortsQueue.source,
          msg.shortsQueue.titles,
        );
        break;
      }
      exitShortsQueue();
      openLinkedUrl(url);
      break;
    }
    case "appendShortsQueue": {
      const ids = (data as { videoIds?: string[] } | undefined)?.videoIds;
      if (Array.isArray(ids) && ids.length) {
        appendShortsToQueue(ids);
      }
      break;
    }
    default:
      appendLog(`panelProxy ignored: ${action ?? "?"}`);
  }
}
