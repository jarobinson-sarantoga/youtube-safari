#!/usr/bin/env node
/**
 * Verify YouTube.js feed fetches with Safari cookies.
 * Usage: node scripts/verify-youtubejs-feeds.mjs [cookies.txt path]
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Innertube } from "youtubei.js";

const COOKIES_PATH =
  process.argv[2] || path.join(process.env.HOME, ".config/yt-dlp/cookies.txt");

function textValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.toString();
}

function thumbUrl(thumbnails) {
  if (!thumbnails?.length) return "";
  const last = thumbnails[thumbnails.length - 1];
  return typeof last?.url === "string" ? last.url : "";
}

function mapVideoLike(node, sectionId) {
  const videoId = node.video_id;
  if (!videoId) return null;
  return {
    videoId,
    title: textValue(node.title) || "Untitled",
    channelTitle:
      textValue(node.author?.name) ||
      textValue(node.short_byline_text) ||
      "Unknown channel",
    thumbnailUrl: thumbUrl(node.thumbnails),
    sectionId,
  };
}

function mapLockupView(node, sectionId) {
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

function mapShortsLockupView(node, sectionId) {
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

function mapNode(node, sectionId) {
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

function pushItem(item, out, seen) {
  if (!item || seen.has(item.videoId)) return;
  seen.add(item.videoId);
  out.push(item);
}

function mapShelfContents(shelf, sectionId, seen) {
  const out = [];
  if (!shelf?.contents) return out;
  for (const entry of shelf.contents) {
    pushItem(mapNode(entry, sectionId), out, seen);
  }
  return out;
}

function mapLooseGridVideos(feed, sectionId, seen) {
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

function mapSubscriptionsFeed(feed) {
  const seen = new Set();
  const out = [];
  const relevant = feed.getShelf?.("Most relevant");
  for (const item of mapShelfContents(relevant, "relevant", seen)) out.push(item);
  const shortsShelf = feed.getShelf?.("Shorts");
  for (const item of mapShelfContents(shortsShelf, "shorts", seen)) out.push(item);
  for (const item of mapLooseGridVideos(feed, "uploads", seen)) out.push(item);
  return out;
}

function mapShortsFeed(feed) {
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

function mapHomeFeed(feed) {
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

function mapWatchNext(nodes, excludeId) {
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

function readCookieHeader(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const p = l.split("\t");
      return { domain: p[0], name: p[5], value: p[6] };
    })
    .filter((c) => c.domain?.includes("youtube.com"))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

function sectionCounts(items) {
  const counts = {};
  for (const item of items) {
    const key = item.sectionId || "(none)";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function firstLine(label, items) {
  const first = items[0];
  if (!first) {
    console.log(`${label}: 0 items`);
    return null;
  }
  console.log(
    `${label}: ${items.length} items — first: ${first.title.slice(0, 60)} (${first.videoId})` +
      (first.sectionId ? ` [${first.sectionId}]` : ""),
  );
  return first;
}

async function main() {
  if (!fs.existsSync(COOKIES_PATH)) {
    console.error(`Missing cookies: ${COOKIES_PATH}`);
    process.exit(1);
  }

  const cookie = readCookieHeader(COOKIES_PATH);
  if (!cookie.includes("LOGIN_INFO") && !cookie.includes("__Secure-1PSID")) {
    console.error("Cookies look unauthenticated — refresh Safari cookies first");
    process.exit(1);
  }

  console.log(`Using cookies: ${COOKIES_PATH}`);
  const yt = await Innertube.create({
    lang: "en",
    location: "US",
    cookie,
    retrieve_player: false,
    enable_session_cache: false,
  });
  console.log("Innertube session ready\n");

  const homeFeed = await yt.getHomeFeed();
  const homeItems = mapHomeFeed(homeFeed).slice(0, 60);
  const homeFirst = firstLine("home", homeItems);

  const subsFeed = await yt.getSubscriptionsFeed();
  const subsItems = mapSubscriptionsFeed(subsFeed).slice(0, 80);
  const subsFirst = firstLine("subscriptions", subsItems);
  const subsSections = sectionCounts(subsItems);
  console.log(`  sections: ${JSON.stringify(subsSections)}`);

  const shortsItems = mapShortsFeed(subsFeed).slice(0, 60);
  const shortsFirst = firstLine("shorts", shortsItems);

  const search = await yt.search("lofi hip hop", { type: "video" });
  const searchItems = (search.results || [])
    .map((node) => mapNode(node))
    .filter(Boolean)
    .slice(0, 10);
  const searchFirst = firstLine("search", searchItems);

  let relatedFirst = null;
  if (homeFirst) {
    const info = await yt.getBasicInfo(homeFirst.videoId);
    const relatedItems = mapWatchNext(info.watch_next_feed, homeFirst.videoId).slice(0, 10);
    relatedFirst = firstLine(`related (for ${homeFirst.videoId})`, relatedItems);
  }

  const subsSection = subsFeed.page_contents?.contents?.[0];
  const loginWall =
    subsItems.length === 0 &&
    subsSection?.contents?.some((node) => node.type === "BackgroundPromo");

  console.log("\n--- checks ---");
  let failed = 0;
  const check = (ok, msg) => {
    console.log(`${ok ? "PASS" : "FAIL"}: ${msg}`);
    if (!ok) failed += 1;
  };
  const skip = (msg) => console.log(`SKIP: ${msg}`);

  check(searchItems.length > 0, `search has items (${searchItems.length})`);

  if (loginWall) {
    skip(
      "authenticated feeds (home/subscriptions/shorts) — Safari cookies are logged out; run refresh-cookies",
    );
  } else {
    check(homeItems.length > 0, `home has items (${homeItems.length})`);
    check(subsItems.length > 0, `subscriptions has items (${subsItems.length})`);
    check(
      subsSections.relevant > 0 || subsSections.uploads > 0,
      "subscriptions has relevant or uploads section",
    );
    check(shortsItems.length > 0, `shorts has items (${shortsItems.length})`);

    if (homeFirst && subsFirst) {
      check(
        homeFirst.videoId !== subsFirst.videoId,
        "home first ≠ subscriptions first",
      );
    }
    if (subsFirst && shortsFirst) {
      check(
        subsFirst.videoId !== shortsFirst.videoId ||
          subsFirst.sectionId !== shortsFirst.sectionId,
        "subscriptions first differs from shorts first (id or section)",
      );
    }
    if (relatedFirst) {
      check(relatedFirst.videoId !== homeFirst?.videoId, "related excludes source video");
    }
  }

  if (loginWall) {
    console.log("\nYouTube.js session OK; refresh Safari cookies for full feed verification");
    process.exit(0);
  }

  console.log(`\n${failed === 0 ? "All checks passed" : `${failed} check(s) failed`}`);
  process.exit(failed === 0 ? 0 : 1);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});