import {
  type CacheEntry,
  dirtyKeys,
  diskHydrated,
  entryMap,
  flushTimer,
  memoryCache,
  setDiskHydrated,
  setFlushTimer,
  MAX_ENTRIES,
} from "./state";
import { isEntryFresh } from "./ttl";
import { hydrateFromDisk, markDirty } from "./disk";

export function pruneExpiredMemoryEntries(): void {
  for (const [key, entry] of memoryCache) {
    if (!isEntryFresh(entry)) {
      memoryCache.delete(key);
      entryMap.delete(key);
      if (diskHydrated) {
        markDirty(key);
      }
    }
  }
}

export function evictOldestMemoryEntries(): void {
  if (memoryCache.size <= MAX_ENTRIES) {
    return;
  }
  const sorted = [...memoryCache.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt);
  while (memoryCache.size > MAX_ENTRIES && sorted.length > 0) {
    const oldest = sorted.shift();
    if (oldest) {
      memoryCache.delete(oldest[0]);
      entryMap.delete(oldest[0]);
      if (diskHydrated) {
        markDirty(oldest[0]);
      }
    }
  }
}

export function peekCachedEntry<T>(key: string): { data: T; savedAt: number } | null {
  hydrateFromDisk();
  pruneExpiredMemoryEntries();

  const memEntry = memoryCache.get(key);
  if (memEntry && isEntryFresh(memEntry)) {
    return { data: memEntry.data as T, savedAt: memEntry.savedAt };
  }
  if (memEntry) {
    memoryCache.delete(key);
    entryMap.delete(key);
    markDirty(key);
  }

  return null;
}

export function getCached<T>(key: string): T | null {
  const hit = peekCachedEntry<T>(key);
  return hit ? hit.data : null;
}

export function setCached<T>(key: string, data: T, options?: { empty?: boolean }): void {
  hydrateFromDisk();
  const entry: CacheEntry<T> = {
    key,
    savedAt: Date.now(),
    data,
    empty: options?.empty || undefined,
  };

  memoryCache.set(key, entry as CacheEntry<unknown>);
  entryMap.set(key, entry as CacheEntry<unknown>);
  evictOldestMemoryEntries();
  markDirty(key);
}

export function clearCached(key: string): void {
  memoryCache.delete(key);
  entryMap.delete(key);
  if (diskHydrated) {
    markDirty(key);
  }
}

export function clearBrowseCacheMemory(): void {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    setFlushTimer(null);
  }
  dirtyKeys.clear();
  memoryCache.clear();
  entryMap.clear();
  setDiskHydrated(true);
}
