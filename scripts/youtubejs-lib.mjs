import fs from "node:fs";
import { Innertube, Parser, YTNodes } from "youtubei.js";

const { NavigationEndpoint, TwoColumnWatchNextResults, ItemSection } = YTNodes;

export function textValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.toString();
}

export function thumbUrl(thumbnails) {
  if (!thumbnails?.length) return "";
  const last = thumbnails[thumbnails.length - 1];
  return typeof last?.url === "string" ? last.url : "";
}

export function mapVideoLike(node, sectionId) {
  const videoId = node.video_id;
  if (!videoId) return null;
  return {
    videoId,
    title: textValue(node.title) || "Untitled",
    channelTitle:
      textValue(node.author?.name) ||
      textValue(node.short_byline_text) ||
      "Unknown channel",
    channelId: node.author?.id,
    thumbnailUrl: thumbUrl(node.thumbnails),
    publishedAt: textValue(node.published) || undefined,
    durationLabel: textValue(node.length_text) || undefined,
    sectionId,
  };
}

export function mapLockupView(node, sectionId) {
  const contentType = node.content_type;
  if (
    contentType &&
    contentType !== "VIDEO" &&
    contentType !== "SHORT" &&
    contentType !== "CLIP"
  ) {
    return null;
  }
  const videoId = node.content_id;
  if (!videoId) return null;
  const meta = node.metadata;
  const channelTitle = textValue(
    meta?.metadata?.metadata_rows?.[0]?.metadata_parts?.[0]?.text,
  );
  const sources = node.content_image?.image?.sources;
  return {
    videoId,
    title: textValue(meta?.title) || "Untitled",
    channelTitle: channelTitle || "Unknown channel",
    thumbnailUrl: sources ? thumbUrl(sources) : "",
    sectionId,
  };
}

export function mapShortsLockupView(node, sectionId) {
  const payload = node.on_tap_endpoint?.payload;
  const reel = payload?.reelWatchEndpoint;
  const videoId =
    (typeof payload?.videoId === "string" ? payload.videoId : undefined) ||
    reel?.videoId ||
    node.entity_id?.replace(/^shorts-shelf-item-/, "") ||
    "";
  if (!videoId) return null;
  return {
    videoId,
    title:
      textValue(node.overlay_metadata?.primary_text) ||
      node.accessibility_text ||
      "Short",
    channelTitle: textValue(node.overlay_metadata?.secondary_text) || "Shorts",
    thumbnailUrl: thumbUrl(node.thumbnail),
    sectionId,
  };
}

export function mapNode(node, sectionId) {
  const type = node.type || "";
  switch (type) {
    case "Video":
    case "CompactVideo":
    case "GridVideo":
      return mapVideoLike(node, sectionId);
    case "LockupView":
      return mapLockupView(node, sectionId);
    case "ShortsLockupView":
      return mapShortsLockupView(node, sectionId);
    case "ReelItem":
      if (!node.id) return null;
      return {
        videoId: node.id,
        title: textValue(node.title) || "Short",
        channelTitle: textValue(node.views) || "Shorts",
        thumbnailUrl: thumbUrl(node.thumbnails),
        sectionId,
      };
    case "RichItem":
      return node.content ? mapNode(node.content, sectionId) : null;
    default:
      return null;
  }
}

export function pushItem(item, out, seen) {
  if (!item || seen.has(item.videoId)) return;
  seen.add(item.videoId);
  out.push(item);
}

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

export function mapRichGridContents(contents, seen) {
  const out = [];
  if (!contents) return out;
  for (const entry of contents) {
    if (entry.type === "RichItem" && entry.content) {
      pushItem(mapNode(entry.content), out, seen);
      continue;
    }
    pushItem(mapNode(entry), out, seen);
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
  if (Array.isArray(feed.videos)) {
    for (const video of feed.videos) {
      pushItem(mapVideoLike(video), out, seen);
    }
  }
  for (const item of mapRichGridContents(feed.contents?.contents, seen)) {
    out.push(item);
  }
  if (feed.memo) {
    for (const lockup of feed.memo.getType("LockupView")) {
      if (lockup.content_type === "VIDEO" || lockup.content_type === "SHORT") {
        pushItem(mapLockupView(lockup), out, seen);
      }
    }
    for (const node of feed.memo.getType(
      "Video",
      "GridVideo",
      "CompactVideo",
      "ShortsLockupView",
      "ReelItem",
    )) {
      pushItem(mapNode(node), out, seen);
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

/** Lighter than getInfo — only calls YouTube's watch-next endpoint. */
export async function fetchWatchNextItems(yt, videoId, limit = 0) {
  const payload = { videoId, racyCheckOk: true, contentCheckOk: true };
  const endpoint = new NavigationEndpoint({ watchNextEndpoint: payload });
  const response = await endpoint.call(yt.session.actions);
  const parsed = Parser.parseResponse(response.data);
  const twoCol = parsed?.contents?.item().as(TwoColumnWatchNextResults);
  const secondary = twoCol?.secondary_results;
  const feed = secondary?.firstOfType(ItemSection)?.contents || secondary;
  const items = mapWatchNext(feed, videoId);
  return limit > 0 ? items.slice(0, limit) : items;
}

export function readBrowseCookieHeader(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const p = l.split("\t");
      return { domain: p[0], name: p[5], value: p[6] };
    })
    .filter((c) => {
      const domain = c.domain || "";
      return (
        domain === ".youtube.com" ||
        domain === "youtube.com" ||
        domain.endsWith(".youtube.com")
      );
    })
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

export function hasYouTubeAuth(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const authNames = new Set(["LOGIN_INFO", "__Secure-1PSID"]);
  return raw
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .some((line) => {
      const parts = line.split("\t");
      const domain = parts[0] || "";
      const name = parts[5] || "";
      const value = parts[6] || "";
      const youtubeDomain =
        domain === ".youtube.com" ||
        domain === "youtube.com" ||
        domain.endsWith(".youtube.com");
      return youtubeDomain && authNames.has(name) && value.length > 0;
    });
}

let clientPromise = null;

export async function getYouTubeClient(cookiePath) {
  if (!clientPromise) {
    clientPromise = Innertube.create({
      lang: "en",
      location: "US",
      cookie: readBrowseCookieHeader(cookiePath),
      retrieve_player: false,
      enable_session_cache: false,
    });
  }
  return clientPromise;
}

export function resetYouTubeClient() {
  clientPromise = null;
}