import { clearQualitiesCache } from "../qualities";
import { appendLog } from "../ytdl";
import { invalidateCookieCache } from "./cookies";
import { clearFeedInflight } from "./feeds/index";
import { clearRelatedMemoryCache } from "./feeds/related";
import { clearBrowseCache } from "./store/cache";

/** Drop cached YouTube session data after a cookie refresh. */
export function invalidateBrowseSessionCaches(): void {
  invalidateCookieCache();
  clearBrowseCache();
  clearRelatedMemoryCache();
  clearQualitiesCache();
  clearFeedInflight();
  appendLog("Browse session caches invalidated after refresh");
}