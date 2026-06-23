import type { FeedItem } from "../../browse/types";
import { youtubeWatchUrl } from "../../youtube";
import { setActiveTabForSearch, requestFeed } from "../feed-controller";
import { postToPlugin } from "../messaging";
import { scheduleNowPlayingSync } from "../now-playing-sync";
import { previewNowPlayingFromFeed } from "../player";
import { setActiveView } from "../views";
import { clearStatus, setStatus } from "./ui";

export function playItem(item: FeedItem, options?: { background?: boolean }): void {
  let url = youtubeWatchUrl(item.videoId);
  if (typeof item.resumeSeconds === "number" && item.resumeSeconds > 0) {
    url += `&t=${item.resumeSeconds}`;
  }
  previewNowPlayingFromFeed(item);
  postToPlugin("playVideo", {
    videoId: item.videoId,
    url,
    background: !!options?.background,
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
