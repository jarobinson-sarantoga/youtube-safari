import {
  mapLockupView,
  mapNode,
  mapVideoLike,
  pushItem,
} from "./youtubejs-map-core.mjs";

export function mapShelfContents(shelf, sectionId, seen) {
  const out = [];
  if (!shelf?.contents) return out;
  for (const entry of shelf.contents) {
    pushItem(mapNode(entry, sectionId), out, seen);
  }
  return out;
}

export function mapLooseGridVideos(feed, sectionId, seen) {
  const out = [];
  const contents = feed.page_contents?.contents;
  if (!Array.isArray(contents)) return out;
  for (const entry of contents) {
    if (entry.type === "RichItem" && entry.content?.type === "LockupView") {
      pushItem(mapLockupView(entry.content, sectionId), out, seen);
    }
  }
  return out;
}

export function mapSubscriptionsFeed(feed) {
  const seen = new Set();
  const out = [];
  const relevant = feed.getShelf?.("Most relevant");
  for (const item of mapShelfContents(relevant, "relevant", seen)) out.push(item);
  const shortsShelf = feed.getShelf?.("Shorts");
  for (const item of mapShelfContents(shortsShelf, "shorts", seen)) out.push(item);
  for (const item of mapLooseGridVideos(feed, "uploads", seen)) out.push(item);
  return out;
}

export function mapShortsFeed(feed) {
  const seen = new Set();
  const out = [];
  const shortsShelf = feed.getShelf?.("Shorts");
  for (const item of mapShelfContents(shortsShelf, "shorts", seen)) out.push(item);
  if (feed.memo) {
    for (const node of feed.memo.getType("ShortsLockupView", "ReelItem")) {
      pushItem(mapNode(node, "shorts"), out, seen);
    }
    for (const lockup of feed.memo.getType("LockupView")) {
      if (lockup.content_type === "SHORT" || lockup.content_type === "CLIP") {
        pushItem(mapLockupView(lockup, "shorts"), out, seen);
      }
    }
  }
  return out;
}

export function mapHomeFeed(feed) {
  const seen = new Set();
  const out = [];
  if (feed.videos) {
    for (const video of feed.videos) {
      pushItem(mapVideoLike(video), out, seen);
    }
  }
  if (feed.memo) {
    for (const lockup of feed.memo.getType("LockupView")) {
      if (lockup.content_type === "VIDEO" || lockup.content_type === "SHORT") {
        pushItem(mapLockupView(lockup), out, seen);
      }
    }
  }
  return out;
}

export function mapWatchNext(nodes, excludeId) {
  if (!nodes) return [];
  const seen = new Set();
  const out = [];
  for (const node of nodes) {
    const item = mapNode(node);
    if (item && item.videoId !== excludeId) {
      pushItem(item, out, seen);
    }
  }
  return out;
}
