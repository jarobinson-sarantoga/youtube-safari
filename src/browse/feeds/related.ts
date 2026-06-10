import type { FeedItem } from "../types";
import { cacheKey, getCached, setCached } from "../store/cache";
import { fetchRelatedItems } from "./youtubejs-exec";

export type RelatedFetchResult = {
  items: FeedItem[];
  emptyHint?: string;
  error?: string;
};

const memoryCache = new Map<string, FeedItem[]>();
const inflight = new Map<string, Promise<RelatedFetchResult>>();

export function clearRelatedMemoryCache(): void {
  memoryCache.clear();
  inflight.clear();
}

export async function getRelatedItems(
  videoId: string,
  force = false,
): Promise<RelatedFetchResult> {
  if (!videoId) {
    return {
      items: [],
      emptyHint: "Play a YouTube video to see related videos",
    };
  }

  if (!force) {
    const cached = memoryCache.get(videoId);
    if (cached?.length) {
      return { items: cached };
    }

    const disk = getCached<FeedItem[]>(cacheKey("related", videoId));
    if (disk?.length) {
      memoryCache.set(videoId, disk);
      return { items: disk };
    }

    const pending = inflight.get(videoId);
    if (pending) {
      return pending;
    }
  }

  const promise = fetchRelatedItems(videoId).then((result) => {
    const items = result.items || [];
    if (items.length) {
      memoryCache.set(videoId, items);
      setCached(cacheKey("related", videoId), items);
    }
    return {
      items,
      emptyHint: result.emptyHint,
      error: result.error,
    };
  });

  inflight.set(videoId, promise);
  try {
    return await promise;
  } finally {
    if (inflight.get(videoId) === promise) {
      inflight.delete(videoId);
    }
  }
}