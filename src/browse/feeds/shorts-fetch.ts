import { cacheKey, clearCached, peekCachedEntry, setCached } from "../store/cache";
import { feedInflight, type FeedFetchResult } from "./fetch-result";
import {
  fromShortsFeedCache,
  toShortsFeedCache,
  type ShortsFeedCache,
} from "./shorts-cache";
import { fetchShortsItems } from "./youtubejs-exec";

function continuationCacheKey(token: string): string {
  return cacheKey("shorts", `cont:${token.slice(0, 64)}`);
}

export async function fetchShortsWithCache(force = false): Promise<FeedFetchResult> {
  const key = cacheKey("shorts", "v1");
  if (!force) {
    const cached = peekCachedEntry<ShortsFeedCache>(key);
    if (cached) {
      return fromShortsFeedCache(cached.data);
    }
  }

  const pending = !force ? feedInflight.get(key) : undefined;
  if (pending) {
    return pending;
  }

  const promise = (async (): Promise<FeedFetchResult> => {
    try {
      const result = await fetchShortsItems();
      if (feedInflight.get(key) !== promise) {
        return result;
      }
      if (result.error) {
        if (force) {
          clearCached(key);
        }
        return result;
      }
      setCached(key, toShortsFeedCache(result.items, result.continuation));
      return result;
    } catch (err) {
      if (feedInflight.get(key) === promise && force) {
        clearCached(key);
      }
      return { items: [], error: String(err) };
    }
  })();

  feedInflight.set(key, promise);
  try {
    return await promise;
  } finally {
    if (feedInflight.get(key) === promise) {
      feedInflight.delete(key);
    }
  }
}

export async function fetchShortsContinuation(
  continuation: string,
): Promise<FeedFetchResult> {
  const key = continuationCacheKey(continuation);
  const pending = feedInflight.get(key);
  if (pending) {
    return pending;
  }

  const promise = fetchShortsItems(continuation);
  feedInflight.set(key, promise);
  try {
    return await promise;
  } finally {
    if (feedInflight.get(key) === promise) {
      feedInflight.delete(key);
    }
  }
}
