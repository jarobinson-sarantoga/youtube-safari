import { appendLog } from "../../ytdl";

const { file, preferences } = iina;

const CACHE_PATH = "@data/browse-cache.json";

interface CacheEntry<T> {
  key: string;
  savedAt: number;
  data: T;
}

interface CacheFile<T> {
  entries: CacheEntry<T>[];
}

function cacheTtlMs(): number {
  const minutes = Number(preferences.get("browse_cache_ttl_minutes") ?? 30);
  if (!Number.isFinite(minutes) || minutes < 1) {
    return 30 * 60 * 1000;
  }
  return minutes * 60 * 1000;
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

export function getCached<T>(key: string): T | null {
  const ttl = cacheTtlMs();
  const fileData = readCacheFile<T>();
  const entry = fileData.entries.find((e) => e.key === key);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.savedAt > ttl) {
    return null;
  }
  return entry.data;
}

export function setCached<T>(key: string, data: T): void {
  const fileData = readCacheFile<T>();
  const filtered = fileData.entries.filter((e) => e.key !== key);
  filtered.push({ key, savedAt: Date.now(), data });
  // Keep cache bounded
  while (filtered.length > 100) {
    filtered.shift();
  }
  writeCacheFile({ entries: filtered });
}

export function cacheKey(tab: string, suffix = ""): string {
  return suffix ? `${tab}:${suffix}` : tab;
}

export function clearBrowseCache(): void {
  try {
    if (file.exists(CACHE_PATH)) {
      file.delete(CACHE_PATH);
    }
  } catch (err) {
    appendLog(`browse cache clear error: ${err}`);
  }
}