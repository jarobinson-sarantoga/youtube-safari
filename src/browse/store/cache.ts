import { appendLog } from "../../ytdl";

const { file, preferences } = iina;

const CACHE_PATH = "@data/browse-cache.json";
const MAX_ENTRIES = 100;
const DISK_FLUSH_MS = 250;

interface CacheEntry<T> {
  key: string;
  savedAt: number;
  data: T;
}

interface CacheFile<T> {
  entries: CacheEntry<T>[];
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const dirtyKeys = new Set<string>();
let diskHydrated = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function browseCacheTtlMs(): number {
  const minutes = Number(preferences.get("browse_cache_ttl_minutes") ?? 30);
  if (!Number.isFinite(minutes) || minutes < 1) {
    return 30 * 60 * 1000;
  }
  return minutes * 60 * 1000;
}

function isEntryFresh(savedAt: number, ttl = browseCacheTtlMs()): boolean {
  return Date.now() - savedAt <= ttl;
}

function pruneExpiredMemoryEntries(): void {
  const ttl = browseCacheTtlMs();
  for (const [key, entry] of memoryCache) {
    if (!isEntryFresh(entry.savedAt, ttl)) {
      memoryCache.delete(key);
      if (diskHydrated) {
        markDirty(key);
      }
    }
  }
}

function evictOldestMemoryEntries(): void {
  if (memoryCache.size <= MAX_ENTRIES) {
    return;
  }
  const sorted = [...memoryCache.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt);
  while (memoryCache.size > MAX_ENTRIES && sorted.length > 0) {
    const oldest = sorted.shift();
    if (oldest) {
      memoryCache.delete(oldest[0]);
      if (diskHydrated) {
        markDirty(oldest[0]);
      }
    }
  }
}

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

function hydrateFromDisk(): void {
  if (diskHydrated) {
    return;
  }
  diskHydrated = true;
  const ttl = browseCacheTtlMs();
  const fileData = readCacheFile<unknown>();
  for (const entry of fileData.entries) {
    if (isEntryFresh(entry.savedAt, ttl)) {
      memoryCache.set(entry.key, entry);
    }
  }
}

function markDirty(key: string): void {
  dirtyKeys.add(key);
  scheduleDiskFlush();
}

function scheduleDiskFlush(): void {
  if (flushTimer !== null) {
    return;
  }
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushDirtyToDisk();
  }, DISK_FLUSH_MS);
}

function flushDirtyToDisk(): void {
  if (dirtyKeys.size === 0) {
    return;
  }
  const keys = [...dirtyKeys];
  dirtyKeys.clear();

  const fileData = readCacheFile<unknown>();
  const entryMap = new Map(fileData.entries.map((entry) => [entry.key, entry]));

  for (const key of keys) {
    const memEntry = memoryCache.get(key);
    if (memEntry) {
      entryMap.set(key, memEntry);
    } else {
      entryMap.delete(key);
    }
  }

  writeCacheFile({ entries: evictOldestDiskEntries([...entryMap.values()]) });
}

export function peekCachedEntry<T>(key: string): { data: T; savedAt: number } | null {
  hydrateFromDisk();
  pruneExpiredMemoryEntries();

  const memEntry = memoryCache.get(key);
  if (memEntry && isEntryFresh(memEntry.savedAt)) {
    return { data: memEntry.data as T, savedAt: memEntry.savedAt };
  }
  if (memEntry) {
    memoryCache.delete(key);
    markDirty(key);
  }

  return null;
}

export function getCached<T>(key: string): T | null {
  const hit = peekCachedEntry<T>(key);
  return hit ? hit.data : null;
}

export function setCached<T>(key: string, data: T): void {
  hydrateFromDisk();
  const entry: CacheEntry<T> = { key, savedAt: Date.now(), data };

  memoryCache.set(key, entry as CacheEntry<unknown>);
  evictOldestMemoryEntries();
  markDirty(key);
}

export function cacheKey(tab: string, suffix = ""): string {
  return suffix ? `${tab}:${suffix}` : tab;
}

export function clearCached(key: string): void {
  memoryCache.delete(key);
  if (diskHydrated) {
    markDirty(key);
  }
}

export function clearBrowseCache(): void {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  dirtyKeys.clear();
  memoryCache.clear();
  diskHydrated = true;
  try {
    if (file.exists(CACHE_PATH)) {
      file.delete(CACHE_PATH);
    }
  } catch (err) {
    appendLog(`browse cache clear error: ${err}`);
  }
}