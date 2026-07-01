import type { BrowseRefreshMessage, PlayVideoMessage } from "./messages";
import { handleBrowseRefresh, resolvePlayVideoUrl } from "../panel-handlers";
import { openShortsQueue, appendShortsToQueue } from "../shorts-queue";
import { openLinkedUrl } from "../youtube-open";
import { postSidebarPanelMessage } from "../panel-relay";
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
      appendLog("playVideo routed to global (background)");
      global.postMessage("panelPlayVideo", {
        url,
        background: true,
      });
      postSidebarPanelMessage("watchUrlChanged", { watchUrl: url });
      return;
    }
    global.postMessage("closeManagedPlayers", {});
    if (data.shortsQueue?.videoIds.length) {
      openShortsQueue(
        data.shortsQueue.videoIds,
        data.shortsQueue.startIndex,
        data.shortsQueue.source,
      );
      postSidebarPanelMessage("watchUrlChanged", { watchUrl: url });
      return;
    }
    openLinkedUrl(url);
  });

  sidebar.onMessage("appendShortsQueue", (data: { videoIds?: string[] }) => {
    const ids = Array.isArray(data?.videoIds) ? data.videoIds : [];
    if (ids.length) {
      appendShortsToQueue(ids);
    }
  });
}