import type { FeedItem } from "../types";
import { browseCacheTtlMs, cacheKey, peekCachedEntry, setCached } from "../store/cache";
import { fetchRelatedItems } from "./youtubejs-exec";

export type RelatedFetchResult = {
  items: FeedItem[];
  emptyHint?: string;
  error?: string;
};

interface RelatedMemoryEntry {
  savedAt: number;
  items: FeedItem[];
}

const memoryCache = new Map<string, RelatedMemoryEntry>();
const inflight = new Map<string, Promise<RelatedFetchResult>>();

function isMemoryFresh(entry: RelatedMemoryEntry): boolean {
  return Date.now() - entry.savedAt <= browseCacheTtlMs();
}

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
    if (cached && isMemoryFresh(cached) && cached.items.length) {
      return { items: cached.items };
    }
    if (cached && !isMemoryFresh(cached)) {
      memoryCache.delete(videoId);
    }

    const diskEntry = peekCachedEntry<FeedItem[]>(cacheKey("related", videoId));
    if (diskEntry?.data.length) {
      memoryCache.set(videoId, { savedAt: diskEntry.savedAt, items: diskEntry.data });
      return { items: diskEntry.data };
    }

    const pending = inflight.get(videoId);
    if (pending) {
      return pending;
    }
  }

  const promise = fetchRelatedItems(videoId).then((result) => {
    const items = result.items || [];
    if (items.length) {
      memoryCache.set(videoId, { savedAt: Date.now(), items });
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