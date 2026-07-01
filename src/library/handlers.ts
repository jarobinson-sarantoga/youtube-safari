import type { FeedItem } from "../browse/types";
import {
  toggleWatchLater,
  isInWatchLater,
} from "../browse/store/watch-later";
import {
  addToQueue,
  removeFromQueue,
  isInQueue,
} from "../browse/store/queue";
import { blockChannel, unblockChannel } from "../browse/store/blocklist";
import {
  addBookmark,
  removeBookmark,
  getBookmarksForVideo,
} from "../browse/store/bookmarks";
import { getHistoryData } from "../browse/store/history/storage";
import type { PanelPostFn } from "../panel-handlers";

export type LibraryAction =
  | { action: "toggleWatchLater"; item: FeedItem }
  | { action: "addQueue"; item: FeedItem }
  | { action: "removeQueue"; videoId: string }
  | { action: "blockChannel"; item: FeedItem }
  | { action: "unblockChannel"; channelId: string }
  | { action: "addBookmark"; videoId: string; seconds: number; label?: string }
  | { action: "removeBookmark"; id: string; videoId?: string }
  | { action: "exportHistory" };

export function handleLibraryAction(
  msg: LibraryAction,
  post: PanelPostFn,
): void {
  switch (msg.action) {
    case "toggleWatchLater": {
      const added = toggleWatchLater(msg.item);
      post("libraryState", {
        watchLater: { videoId: msg.item.videoId, added },
      });
      post("watchLaterStale", {});
      break;
    }
    case "addQueue": {
      const added = addToQueue(msg.item);
      post("libraryState", {
        queue: { videoId: msg.item.videoId, added },
      });
      post("queueStale", {});
      break;
    }
    case "removeQueue": {
      removeFromQueue(msg.videoId);
      post("queueStale", {});
      break;
    }
    case "blockChannel": {
      blockChannel(msg.item);
      post("blocklistStale", {});
      break;
    }
    case "unblockChannel": {
      unblockChannel(msg.channelId);
      post("blocklistStale", {});
      break;
    }
    case "addBookmark": {
      const bookmark = addBookmark(msg.videoId, msg.seconds, msg.label || "");
      post("bookmarks", {
        videoId: msg.videoId,
        items: getBookmarksForVideo(msg.videoId),
        added: bookmark,
      });
      break;
    }
    case "removeBookmark": {
      removeBookmark(msg.id);
      if (msg.videoId) {
        post("bookmarks", {
          videoId: msg.videoId,
          items: getBookmarksForVideo(msg.videoId),
        });
      }
      break;
    }
    case "exportHistory": {
      post("historyExport", { json: JSON.stringify(getHistoryData(), null, 2) });
      break;
    }
    default:
      break;
  }
}

export function getLibraryFlags(videoId: string): {
  watchLater: boolean;
  queued: boolean;
} {
  return {
    watchLater: isInWatchLater(videoId),
    queued: isInQueue(videoId),
  };
}
