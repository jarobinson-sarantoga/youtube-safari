import type { BrowseRefreshMessage, PlayVideoMessage } from "./messages";
import { handleBrowseRefresh, resolvePlayVideoUrl } from "../panel-handlers";
import { appendShortsToQueue, exitShortsQueue, playShortsQueue } from "../shorts-queue";
import { openLinkedUrl } from "../youtube-open";
import { postSidebarPanelMessage } from "../panel-relay";
import { handleLibraryAction, type LibraryAction } from "../library/handlers";
import { fetchTranscript } from "../transcript";
import { getBookmarksForVideo } from "../browse/store/bookmarks";
import { getLastWatchUrl } from "../preferences";
import { getYouTubeVideoId } from "../youtube";
import { appendLog } from "../ytdl";

const { global, sidebar } = iina;

function postToSidebar(name: string, data: unknown): void {
  postSidebarPanelMessage(name, data);
}

/** Register browse bridge handlers on the sidebar channel (call after each loadFile). */
export function registerBrowseSidebarHandlers(): void {
  sidebar.onMessage("browseRefresh", (data: BrowseRefreshMessage) => {
    void handleBrowseRefresh(data, postToSidebar);
  });

  sidebar.onMessage("playVideo", (data: PlayVideoMessage) => {
    const url = resolvePlayVideoUrl(data);
    if (!url) {
      return;
    }
    if (data.background) {
      exitShortsQueue();
      appendLog("playVideo routed to global (background)");
      global.postMessage("panelPlayVideo", {
        url,
        background: true,
      });
      postSidebarPanelMessage("watchUrlChanged", { watchUrl: url });
      return;
    }
    global.postMessage("retireBackgroundPlayers", {});
    if (data.shortsQueue?.videoIds.length) {
      playShortsQueue(
        data.shortsQueue.videoIds,
        data.shortsQueue.startIndex,
        data.shortsQueue.source,
        data.shortsQueue.titles,
      );
      postSidebarPanelMessage("watchUrlChanged", { watchUrl: url });
      return;
    }
    exitShortsQueue();
    openLinkedUrl(url);
  });

  sidebar.onMessage("appendShortsQueue", (data: { videoIds?: string[] }) => {
    const ids = Array.isArray(data?.videoIds) ? data.videoIds : [];
    if (ids.length) {
      appendShortsToQueue(ids);
    }
  });

  sidebar.onMessage("libraryAction", (data: LibraryAction) => {
    handleLibraryAction(data, postToSidebar);
  });

  sidebar.onMessage("requestTranscript", (data: { watchUrl?: string }) => {
    void handleTranscriptRequest(data?.watchUrl, postToSidebar);
  });

  sidebar.onMessage("requestBookmarks", (data: { videoId?: string }) => {
    const videoId = data?.videoId || "";
    if (!videoId) {
      return;
    }
    postToSidebar("bookmarks", {
      videoId,
      items: getBookmarksForVideo(videoId),
    });
  });
}

async function handleTranscriptRequest(
  watchUrl: string | undefined,
  post: (name: string, data: unknown) => void,
): Promise<void> {
  const url = watchUrl?.trim() || getLastWatchUrl();
  const videoId = getYouTubeVideoId(url) || "";
  if (!videoId) {
    post("transcript", { videoId: "", cues: [], error: "No video" });
    return;
  }
  post("transcript", { videoId, loading: true });
  try {
    const cues = await fetchTranscript(url);
    post("transcript", { videoId, cues });
  } catch (err) {
    post("transcript", { videoId, cues: [], error: String(err) });
  }
}
