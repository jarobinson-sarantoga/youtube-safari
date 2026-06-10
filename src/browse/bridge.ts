import type { BrowseRefreshMessage } from "./messages";
import { fetchFeed } from "./feeds/index";
import { openLinkedUrl } from "../youtube-open";
import { youtubeWatchUrl } from "../youtube";
import { appendLog } from "../ytdl";

const { sidebar } = iina;

async function handleBrowseRefresh(msg: BrowseRefreshMessage): Promise<void> {
  const { tab, query, subsFilter, force, requestId } = msg;
  appendLog(
    `browseRefresh: tab=${tab} filter=${subsFilter || "all"} force=${force ? "yes" : "no"} query=${query || ""} id=${requestId ?? "?"}`,
  );

  try {
    const result = await fetchFeed(tab, query, subsFilter, force);
    appendLog(
      `feedResult: tab=${tab} id=${requestId ?? "?"} items=${result.items.length}` +
        (result.error ? ` error=${result.error}` : "") +
        (result.emptyHint ? ` hint=${result.emptyHint}` : ""),
    );
    sidebar.postMessage("feedResult", {
      tab,
      items: result.items,
      error: result.error,
      emptyHint: result.emptyHint,
      subsFilter,
      requestId,
      query: tab === "search" ? query : undefined,
    });
  } catch (err) {
    appendLog(`browseRefresh error: ${err}`);
    sidebar.postMessage("feedResult", {
      tab,
      items: [],
      error: String(err),
      subsFilter,
      requestId,
      query: tab === "search" ? query : undefined,
    });
  }
}

function handlePlayVideo(data: { videoId?: string; url?: string }): void {
  const videoId = data.videoId;
  const url = data.url || (videoId ? youtubeWatchUrl(videoId) : "");

  if (!url) {
    return;
  }

  openLinkedUrl(url);
}

/** Register browse bridge handlers on the sidebar channel (call after each loadFile). */
export function registerBrowseSidebarHandlers(): void {
  sidebar.onMessage("browseRefresh", (data: BrowseRefreshMessage) => {
    void handleBrowseRefresh(data);
  });

  sidebar.onMessage("playVideo", (data: { videoId?: string; url?: string }) => {
    handlePlayVideo(data);
  });
}