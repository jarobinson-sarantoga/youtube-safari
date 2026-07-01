import { registerBrowseSidebarHandlers } from "../bridge";
import { invalidateBrowseSessionCaches } from "../session-invalidate";
import { flushPendingCache } from "../store/cache";
import { flushPendingHistory } from "../store/history";
import { flushWatchLater } from "../store/watch-later";
import { flushQueue } from "../store/queue";
import { flushBlocklist } from "../store/blocklist";
import { flushBookmarks } from "../store/bookmarks";
import { notifyCookieHealthIfNeeded } from "../../cookie-health";
import { isBackgroundHidePending } from "../../background-play";
import { isIntentionalPlayerClose, markPlayerShuttingDown } from "../../lifecycle";
import { cancelSeekRetries } from "../../youtube-open";
import { postPanelMessage } from "../../panel-relay";
import { appendLog } from "../../ytdl";
import { registerPlaybackHooks, stopWatchProgressPolling } from "./playback-hooks";
import { stopPlayerStatePolling } from "./player-state";

const { event, global } = iina;

let browseInstalled = false;

/** Wire browse bridge, playback hooks, and global shortcut listener. */
export function installBrowse(): void {
  if (browseInstalled) {
    return;
  }
  browseInstalled = true;

  registerBrowseSidebarHandlers();
  registerPlaybackHooks();

  event.on("iina.window-will-close", () => {
    if (isBackgroundHidePending() && !isIntentionalPlayerClose()) {
      appendLog("window-will-close skipped (background hide)");
      return;
    }
    const label =
      typeof global.getLabel === "function" ? global.getLabel() : "";
    if (label === "youtube-open" && !isIntentionalPlayerClose()) {
      appendLog("window-will-close skipped (managed youtube-open)");
      return;
    }
    markPlayerShuttingDown();
    stopPlayerStatePolling();
    stopWatchProgressPolling();
    cancelSeekRetries();
    flushPendingCache();
    flushPendingHistory();
    flushWatchLater();
    flushQueue();
    flushBlocklist();
    flushBookmarks();
    global.postMessage("playerClosed", {});
  });

  global.onMessage("cookiesRefreshed", () => {
    notifyCookiesRefreshed();
  });

  notifyCookieHealthIfNeeded({ osd: true });
  appendLog("Browse module installed");
}

export function notifyCookiesRefreshed(): void {
  invalidateBrowseSessionCaches();
  postPanelMessage("feedsStale", {});
}

/** Re-register browse handlers after sidebar.loadFile (IINA clears listeners). */
export function registerBrowseHandlers(): void {
  registerBrowseSidebarHandlers();
}
