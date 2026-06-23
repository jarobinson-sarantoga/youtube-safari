export { browseCacheTtlMs } from "./ttl";
export { EMPTY_CACHE_TTL_MS } from "./state";
export { flushPendingCache } from "./disk";
export {
  peekCachedEntry,
  getCached,
  setCached,
  clearCached,
} from "./memory";

import { clearBrowseCacheMemory } from "./memory";
import { clearBrowseCacheFile } from "./disk";

export function cacheKey(tab: string, suffix = ""): string {
  return suffix ? `${tab}:${suffix}` : tab;
}

export function clearBrowseCache(): void {
  clearBrowseCacheMemory();
  clearBrowseCacheFile();
}
