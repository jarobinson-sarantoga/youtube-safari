import { appendLog } from "../../../ytdl";
import {
  CACHE_PATH,
  type CacheEntry,
  type CacheFile,
  dirtyKeys,
  diskHydrated,
  entryMap,
  flushTimer,
  memoryCache,
  setDiskHydrated,
  setFlushTimer,
  DISK_FLUSH_MS,
  MAX_ENTRIES,
} from "./state";
import { isEntryFresh } from "./ttl";

const { file } = iina;

function readCacheFile<T>(): CacheFile<T> {
  if (!file.exists(CACHE_PATH)) {
    return { entries: [] };
  }
  try {
    const raw = file.read(CACHE_PATH);
    if (!raw) {
      return { entries: [] };
    }
    const parsed = JSON.parse(raw) as CacheFile<T>;
    if (Array.isArray(parsed.entries)) {
      return parsed;
    }
  } catch (err) {
    appendLog(`browse cache read error: ${err}`);
  }
  return { entries: [] };
}

function writeCacheFile<T>(data: CacheFile<T>): void {
  try {
    file.write(CACHE_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    appendLog(`browse cache write error: ${err}`);
  }
}

function evictOldestDiskEntries<T>(entries: CacheEntry<T>[]): CacheEntry<T>[] {
  if (entries.length <= MAX_ENTRIES) {
    return entries;
  }
  return [...entries].sort((a, b) => a.savedAt - b.savedAt).slice(-MAX_ENTRIES);
}

export function hydrateFromDisk(): void {
  if (diskHydrated) {
    return;
  }
  setDiskHydrated(true);
  const fileData = readCacheFile<unknown>();
  entryMap.clear();
  for (const entry of fileData.entries) {
    if (isEntryFresh(entry)) {
      entryMap.set(entry.key, entry);
      memoryCache.set(entry.key, entry);
    }
  }
}

export function markDirty(key: string): void {
  dirtyKeys.add(key);
  scheduleDiskFlush();
}

function scheduleDiskFlush(): void {
  if (flushTimer !== null) {
    return;
  }
  setFlushTimer(
    setTimeout(() => {
      setFlushTimer(null);
      flushDirtyToDisk();
    }, DISK_FLUSH_MS),
  );
}

function flushDirtyToDisk(): void {
  if (dirtyKeys.size === 0) {
    return;
  }
  dirtyKeys.clear();
  writeCacheFile({ entries: evictOldestDiskEntries([...entryMap.values()]) });
}

/** Flush debounced browse-cache writes immediately (e.g. before window close). */
export function flushPendingCache(): void {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    setFlushTimer(null);
  }
  flushDirtyToDisk();
}

export function clearBrowseCacheFile(): void {
  try {
    if (file.exists(CACHE_PATH)) {
      file.delete(CACHE_PATH);
    }
  } catch (err) {
    appendLog(`browse cache clear error: ${err}`);
  }
}
