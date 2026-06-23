import { browseCacheTtlMs } from "../browse/store/cache";
import type { ListedQualities } from "./parse";

interface QualitiesCacheEntry {
  savedAt: number;
  data: ListedQualities;
}

const qualitiesCache = new Map<string, QualitiesCacheEntry>();
const MAX_QUALITIES_CACHE_ENTRIES = 50;

function evictOldestQualitiesEntries(): void {
  if (qualitiesCache.size <= MAX_QUALITIES_CACHE_ENTRIES) {
    return;
  }
  const sorted = [...qualitiesCache.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt);
  while (qualitiesCache.size > MAX_QUALITIES_CACHE_ENTRIES && sorted.length > 0) {
    const oldest = sorted.shift();
    if (oldest) {
      qualitiesCache.delete(oldest[0]);
    }
  }
}

export function clearQualitiesCache(): void {
  qualitiesCache.clear();
}

export function getCachedQualities(videoId: string): ListedQualities | null {
  const entry = qualitiesCache.get(videoId);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.savedAt > browseCacheTtlMs()) {
    qualitiesCache.delete(videoId);
    return null;
  }
  return entry.data;
}

export function setCachedQualities(videoId: string, data: ListedQualities): void {
  qualitiesCache.set(videoId, { savedAt: Date.now(), data });
  evictOldestQualitiesEntries();
}
