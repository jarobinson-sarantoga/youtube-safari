import type { FeedTab, SubsFilter } from "../types";
import { cacheKey } from "../store/cache";
import { getHistoryItems } from "../store/history";
import { getWatchLaterItems } from "../store/watch-later";
import { getQueueItems } from "../store/queue";
import { getLastWatchUrl } from "../../preferences";
import { getYouTubeVideoId } from "../../youtube";
import { fetchSearchItems, fetchTabItems } from "./youtubejs-exec";
import { getRelatedItems } from "./related";
import { postProcessFeedItems } from "./post-process";
import { fetchWithCache } from "./fetch-cache";
import { clearFeedInflight, type FeedFetchResult } from "./fetch-result";
import { fetchShortsContinuation, fetchShortsWithCache } from "./shorts-fetch";

export { clearFeedInflight };
export type { FeedFetchResult } from "./fetch-result";

function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

function finalize(result: FeedFetchResult): FeedFetchResult {
  if (result.error || !result.items.length) {
    return result;
  }
  return { ...result, items: postProcessFeedItems(result.items) };
}

export async function fetchFeed(
  tab: FeedTab,
  query = "",
  subsFilter: SubsFilter = "all",
  force = false,
  continuation = "",
): Promise<FeedFetchResult> {
  let result: FeedFetchResult;
  switch (tab) {
    case "home":
      result = await fetchWithCache(cacheKey("home", "v1"), () => fetchTabItems("home"), force);
      break;
    case "shorts": {
      if (continuation) {
        return finalize(await fetchShortsContinuation(continuation));
      }
      return finalize(await fetchShortsWithCache(force));
    }
    case "subscriptions": {
      const filter = subsFilter === "shorts" ? "shorts" : "all";
      result = await fetchWithCache(
        cacheKey("subscriptions", filter),
        () => fetchTabItems(filter === "shorts" ? "subs-shorts" : "subscriptions"),
        force,
      );
      break;
    }
    case "search": {
      const normalized = normalizeSearchQuery(query);
      if (!normalized) {
        return { items: [], emptyHint: "Enter a search query" };
      }
      result = await fetchWithCache(
        cacheKey("search", normalized),
        () => fetchSearchItems(query),
        force,
      );
      break;
    }
    case "related": {
      const watchUrl = getLastWatchUrl();
      const videoId = getYouTubeVideoId(watchUrl) || "";
      result = await getRelatedItems(videoId, force);
      break;
    }
    case "history": {
      const items = getHistoryItems();
      result = items.length
        ? { items }
        : { items: [], emptyHint: "Watch history is empty" };
      break;
    }
    case "later": {
      const items = getWatchLaterItems();
      result = items.length
        ? { items }
        : { items: [], emptyHint: "Watch Later is empty — save videos with W" };
      break;
    }
    case "queue": {
      const items = getQueueItems();
      result = items.length
        ? { items }
        : { items: [], emptyHint: "Queue is empty — add videos with Q" };
      break;
    }
    default:
      return { items: [], error: `Unknown tab: ${tab}` };
  }
  return finalize(result);
}
