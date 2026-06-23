import { EMPTY_CACHE_TTL_MS, type CacheEntry } from "./state";

const { preferences } = iina;

export function browseCacheTtlMs(): number {
  const minutes = Number(preferences.get("browse_cache_ttl_minutes") ?? 30);
  if (!Number.isFinite(minutes) || minutes < 1) {
    return 30 * 60 * 1000;
  }
  return minutes * 60 * 1000;
}

export function entryTtl(entry: CacheEntry<unknown>): number {
  return entry.empty ? EMPTY_CACHE_TTL_MS : browseCacheTtlMs();
}

export function isEntryFresh(entry: CacheEntry<unknown>): boolean {
  return Date.now() - entry.savedAt <= entryTtl(entry);
}
