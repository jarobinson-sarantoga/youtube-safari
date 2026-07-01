import type { FeedTab, SubsFilter } from "../types";
import { cacheKey } from "../store/cache";
import { getHistoryItems } from "../store/history";
import { getLastWatchUrl } from "../../preferences";
import { getYouTubeVideoId } from "../../youtube";
import { fetchSearchItems, fetchTabItems } from "./youtubejs-exec";
import { getRelatedItems } from "./related";
import { fetchWithCache } from "./fetch-cache";
import { clearFeedInflight } from "./fetch-result";
import { fetchShortsContinuation, fetchShortsWithCache } from "./shorts-fetch";

export { clearFeedInflight };
export type { FeedFetchResult } from "./fetch-result";

function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export async function fetchFeed(
  tab: FeedTab,
  query = "",
  subsFilter: SubsFilter = "all",
  force = false,
  continuation = "",
): Promise<import("./fetch-result").FeedFetchResult> {
  switch (tab) {
    case "home":
      return fetchWithCache(cacheKey("home", "v1"), () => fetchTabItems("home"), force);
    case "shorts": {
      if (continuation) {
        return fetchShortsContinuation(continuation);
      }
      return fetchShortsWithCache(force);
    }
    case "subscriptions": {
      const filter = subsFilter === "shorts" ? "shorts" : "all";
      return fetchWithCache(
        cacheKey("subscriptions", filter),
        () => fetchTabItems(filter === "shorts" ? "subs-shorts" : "subscriptions"),
        force,
      );
    }
    case "search": {
      const normalized = normalizeSearchQuery(query);
      if (!normalized) {
        return { items: [], emptyHint: "Enter a search query" };
      }
      return fetchWithCache(
        cacheKey("search", normalized),
        () => fetchSearchItems(query),
        force,
      );
    }
    case "related": {
      const watchUrl = getLastWatchUrl();
      const videoId = getYouTubeVideoId(watchUrl) || "";
      return getRelatedItems(videoId, force);
    }
    case "history": {
      const items = getHistoryItems();
      if (items.length === 0) {
        return { items: [], emptyHint: "Watch history is empty" };
      }
      return { items };
    }
    default:
      return { items: [], error: `Unknown tab: ${tab}` };
  }
}
