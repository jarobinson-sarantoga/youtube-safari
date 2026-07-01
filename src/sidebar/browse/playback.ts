import type { FeedItem } from "../../browse/types";
import { youtubeWatchUrl } from "../../youtube";
import {
  getActiveSubsFilter,
  getActiveTab,
  getFeedItems,
  requestFeed,
  setActiveTabForSearch,
} from "../feed-controller";
import { postToPlugin } from "../messaging";
import { scheduleNowPlayingSync } from "../now-playing-sync";
import { previewNowPlayingFromFeed } from "../player";
import { setActiveView } from "../views";
import { clearStatus, setStatus } from "./ui";

function shortsQueueSource():
  | { source: "shorts" | "subs-shorts"; videoIds: string[] }
  | null {
  const tab = getActiveTab();
  const filter = getActiveSubsFilter();
  if (tab === "shorts") {
    const videoIds = getFeedItems().map((item) => item.videoId);
    return videoIds.length ? { source: "shorts", videoIds } : null;
  }
  if (tab === "subscriptions" && filter === "shorts") {
    const videoIds = getFeedItems()
      .filter((item) => item.isShort !== false)
      .map((item) => item.videoId);
    return videoIds.length ? { source: "subs-shorts", videoIds } : null;
  }
  return null;
}

export function playItem(item: FeedItem, options?: { background?: boolean }): void {
  let url = youtubeWatchUrl(item.videoId);
  if (typeof item.resumeSeconds === "number" && item.resumeSeconds > 0) {
    url += `&t=${item.resumeSeconds}`;
  }
  previewNowPlayingFromFeed(item);
  const queue = !options?.background ? shortsQueueSource() : null;
  const startIndex = queue ? queue.videoIds.indexOf(item.videoId) : -1;
  postToPlugin("playVideo", {
    videoId: item.videoId,
    url,
    background: !!options?.background,
    shortsQueue: queue && startIndex >= 0
      ? {
          videoIds: queue.videoIds,
          startIndex,
          source: queue.source,
        }
      : undefined,
  });
  scheduleNowPlayingSync();
  if (!options?.background) {
    clearStatus();
  }
  setActiveView("player", { skipPanelRefresh: true });
}

export function runSearch(onSearchTabActivated: () => void): void {
  const input = document.getElementById("search-input") as HTMLInputElement | null;
  const query = input?.value.trim() || "";
  if (!query) {
    setStatus("Enter a search query", true);
    return;
  }
  setActiveTabForSearch();
  onSearchTabActivated();
  requestFeed("search", query);
}
