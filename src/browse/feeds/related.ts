import type { FeedItem } from "../types";
import { IDLE_COPY } from "../../sidebar/copy";
import {
  browseCacheTtlMs,
  cacheKey,
  clearCached,
  EMPTY_CACHE_TTL_MS,
  peekCachedEntry,
  setCached,
} from "../store/cache";
import { fetchRelatedItems } from "./youtubejs-exec";

export type RelatedFetchResult = {
  items: FeedItem[];
  emptyHint?: string;
  error?: string;
};

interface RelatedMemoryEntry {
  savedAt: number;
  items: FeedItem[];
  empty?: boolean;
}

const memoryCache = new Map<string, RelatedMemoryEntry>();
const inflight = new Map<string, Promise<RelatedFetchResult>>();

function isMemoryFresh(entry: RelatedMemoryEntry): boolean {
  const ttl = entry.empty ? EMPTY_CACHE_TTL_MS : browseCacheTtlMs();
  return Date.now() - entry.savedAt <= ttl;
}

function clearRelatedCacheForVideo(videoId: string): void {
  memoryCache.delete(videoId);
  clearCached(cacheKey("related", videoId));
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
      emptyHint: IDLE_COPY.related,
    };
  }

  if (!force) {
    const pending = inflight.get(videoId);
    if (pending) {
      return pending;
    }
  }

  if (!force) {
    const cached = memoryCache.get(videoId);
    if (cached && isMemoryFresh(cached)) {
      return { items: cached.items };
    }
    if (cached && !isMemoryFresh(cached)) {
      memoryCache.delete(videoId);
    }

    const diskEntry = peekCachedEntry<FeedItem[]>(cacheKey("related", videoId));
    if (diskEntry) {
      memoryCache.set(videoId, {
        savedAt: diskEntry.savedAt,
        items: diskEntry.data,
        empty: diskEntry.data.length === 0 ? true : undefined,
      });
      return { items: diskEntry.data };
    }
  }

  const promise = fetchRelatedItems(videoId).then((result) => {
    const items = result.items || [];
    if (inflight.get(videoId) === promise) {
      if (result.error) {
        if (force) {
          clearRelatedCacheForVideo(videoId);
        }
      } else if (items.length) {
        memoryCache.set(videoId, { savedAt: Date.now(), items });
        setCached(cacheKey("related", videoId), items);
      } else {
        memoryCache.set(videoId, { savedAt: Date.now(), items: [], empty: true });
        setCached(cacheKey("related", videoId), [], { empty: true });
      }
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