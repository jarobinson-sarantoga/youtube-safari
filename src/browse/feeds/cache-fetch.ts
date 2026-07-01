import { clearCached, peekCachedEntry, setCached } from "../store/cache";

type FeedFetchResult = {
  items: import("../types").FeedItem[];
  error?: string;
  emptyHint?: string;
  continuation?: string;
};

const inflight = new Map<string, Promise<FeedFetchResult>>();

export function clearFeedInflight(): void {
  inflight.clear();
}

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

  const pending = !force ? inflight.get(key) : undefined;
  if (pending) {
    return pending;
  }

  const promise = (async (): Promise<FeedFetchResult> => {
    try {
      const result = await fetcher();
      if (inflight.get(key) !== promise) {
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
      if (inflight.get(key) === promise && force) {
        clearCached(key);
      }
      return { items: [], error: String(err) };
    }
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    if (inflight.get(key) === promise) {
      inflight.delete(key);
    }
  }
}

export type { FeedFetchResult };
