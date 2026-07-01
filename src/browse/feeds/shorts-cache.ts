import type { FeedItem } from "../types";

export interface ShortsFeedCache {
  items: FeedItem[];
  continuation: string;
}

export function toShortsFeedCache(
  items: FeedItem[],
  continuation?: string | null,
): ShortsFeedCache {
  return {
    items,
    continuation: continuation || "",
  };
}

export function fromShortsFeedCache(cache: ShortsFeedCache): {
  items: FeedItem[];
  continuation?: string;
} {
  return {
    items: cache.items,
    continuation: cache.continuation || undefined,
  };
}
