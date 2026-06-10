import type { FeedTab, SubsFilter } from "../types";
import { cacheKey, getCached, setCached } from "../store/cache";
import { getHistoryItems } from "../store/history";
import { getYouTubeVideoId } from "../../youtube";

const { preferences } = iina;
import {
  fetchHomeItems,
  fetchSearchItems,
  fetchShortsItems,
  fetchSubscriptionsItems,
} from "./youtubejs-exec";
import { getRelatedItems } from "./related";

type FeedFetchResult = {
  items: import("../types").FeedItem[];
  error?: string;
  emptyHint?: string;
};

async function fetchWithCache(
  key: string,
  fetcher: () => Promise<FeedFetchResult>,
  force = false,
): Promise<FeedFetchResult> {
  if (!force) {
    const cached = getCached<import("../types").FeedItem[]>(key);
    if (cached?.length) {
      return { items: cached };
    }
  }
  const result = await fetcher();
  if (result.items.length) {
    setCached(key, result.items);
  }
  return result;
}

export async function fetchFeed(
  tab: FeedTab,
  query = "",
  subsFilter: SubsFilter = "all",
  force = false,
): Promise<FeedFetchResult> {
  switch (tab) {
    case "home":
      return fetchWithCache(cacheKey("home", "v1"), fetchHomeItems, force);
    case "subscriptions": {
      const filter = subsFilter === "shorts" ? "shorts" : "all";
      return fetchWithCache(
        cacheKey("subscriptions", filter),
        () =>
          filter === "shorts" ? fetchShortsItems() : fetchSubscriptionsItems(),
        force,
      );
    }
    case "search":
      return fetchSearchItems(query);
    case "related": {
      const watchUrl = (preferences.get("last_watch_url") as string | undefined) || "";
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