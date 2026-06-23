import type { BrowseRefreshMessage } from "./messages";
import { handleBrowseRefresh, resolvePlayVideoUrl } from "../panel-handlers";
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

  sidebar.onMessage("playVideo", (data: {
    videoId?: string;
    url?: string;
    background?: boolean;
  }) => {
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
    openLinkedUrl(url);
  });
}