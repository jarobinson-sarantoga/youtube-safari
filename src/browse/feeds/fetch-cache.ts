import { clearCached, peekCachedEntry, setCached } from "../store/cache";
import { feedInflight, type FeedFetchResult } from "./fetch-result";

export async function fetchWithCache(
  key: string,
  fetcher: () => Promise<FeedFetchResult>,
  force = false,
): Promise<FeedFetchResult> {
  if (!force) {
    const cached = peekCachedEntry<import("../types").FeedItem[]>(key);
    if (cached) {
      return { items: cached.data };
    }
  }

  const pending = !force ? feedInflight.get(key) : undefined;
  if (pending) {
    return pending;
  }

  const promise = (async (): Promise<FeedFetchResult> => {
    try {
      const result = await fetcher();
      if (feedInflight.get(key) !== promise) {
        return result;
      }
      if (result.error) {
        if (force) {
          clearCached(key);
        }
        return result;
      }
      if (result.items.length) {
        setCached(key, result.items);
      } else {
        setCached(key, [], { empty: true });
      }
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
