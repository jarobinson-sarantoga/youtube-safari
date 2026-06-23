export const CACHE_PATH = "@data/browse-cache.json";
export const MAX_ENTRIES = 100;
export const DISK_FLUSH_MS = 250;
export const EMPTY_CACHE_TTL_MS = 5 * 60 * 1000;

export interface CacheEntry<T> {
  key: string;
  savedAt: number;
  data: T;
  /** When true, use EMPTY_CACHE_TTL_MS instead of browse cache TTL. */
  empty?: boolean;
}

export interface CacheFile<T> {
  entries: CacheEntry<T>[];
}

export const memoryCache = new Map<string, CacheEntry<unknown>>();
export const entryMap = new Map<string, CacheEntry<unknown>>();
export const dirtyKeys = new Set<string>();
export let diskHydrated = false;
export let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function setDiskHydrated(value: boolean): void {
  diskHydrated = value;
}

export function setFlushTimer(value: ReturnType<typeof setTimeout> | null): void {
  flushTimer = value;
}
