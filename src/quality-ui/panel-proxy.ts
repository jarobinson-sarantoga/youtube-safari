import type { PlayVideoMessage } from "../browse/messages";
import { handleLibraryAction, type LibraryAction } from "../library/handlers";
import { resolvePlayVideoUrl } from "../panel-handlers";
import { postSidebarPanelMessage } from "../panel-relay";
import { setPlaybackSpeed } from "../playback-speed";
import { cancelSleepTimer, startSleepTimer } from "../sleep-timer";
import { appendShortsToQueue, exitShortsQueue, playShortsQueue } from "../shorts-queue";
import { fetchTranscript } from "../transcript";
import { getBookmarksForVideo } from "../browse/store/bookmarks";
import { getLastWatchUrl } from "../preferences";
import { appendLog } from "../ytdl";
import { getYouTubeVideoId } from "../youtube";
import { openLinkedUrl, seekPlayback } from "../youtube-open";
import { switchQuality } from "./switch-quality";

function postToSidebar(name: string, data: unknown): void {
  postSidebarPanelMessage(name, data);
}

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
    case "setPlaybackSpeed": {
      const speed = (data as { speed?: number } | undefined)?.speed;
      if (typeof speed === "number") {
        const applied = setPlaybackSpeed(speed);
        postToSidebar("playbackSpeed", { speed: applied });
      }
      break;
    }
    case "setSleepTimer": {
      const minutes = (data as { minutes?: number } | undefined)?.minutes;
      if (typeof minutes === "number" && minutes <= 0) {
        cancelSleepTimer();
        postToSidebar("sleepTimer", { endsAt: 0 });
      } else if (typeof minutes === "number") {
        const endsAt = startSleepTimer(minutes);
        postToSidebar("sleepTimer", { endsAt });
      }
      break;
    }
    case "libraryAction":
      handleLibraryAction(data as LibraryAction, postToSidebar);
      break;
    case "requestTranscript":
      void handleTranscriptProxy(data as { watchUrl?: string });
      break;
    case "requestBookmarks": {
      const videoId = (data as { videoId?: string } | undefined)?.videoId || "";
      if (videoId) {
        postToSidebar("bookmarks", {
          videoId,
          items: getBookmarksForVideo(videoId),
        });
      }
      break;
    }
    default:
      appendLog(`panelProxy ignored: ${action ?? "?"}`);
  }
}

async function handleTranscriptProxy(data: { watchUrl?: string }): Promise<void> {
  const url = data?.watchUrl?.trim() || getLastWatchUrl();
  const videoId = getYouTubeVideoId(url) || "";
  if (!videoId) {
    postToSidebar("transcript", { videoId: "", cues: [], error: "No video" });
    return;
  }
  postToSidebar("transcript", { videoId, loading: true });
  try {
    const cues = await fetchTranscript(url);
    postToSidebar("transcript", { videoId, cues });
  } catch (err) {
    postToSidebar("transcript", { videoId, cues: [], error: String(err) });
  }
}
