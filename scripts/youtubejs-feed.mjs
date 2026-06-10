#!/usr/bin/env node
/**
 * Fetch a browse feed via YouTube.js (runs outside IINA).
 * Usage: node scripts/youtubejs-feed.mjs --tab home [--cookies PATH] [--query Q] [--video-id ID] [--limit N]
 */
import fs from "node:fs";
import path from "node:path";
import {
  getYouTubeClient,
  hasYouTubeAuth,
  mapHomeFeed,
  mapNode,
  mapShortsFeed,
  mapSubscriptionsFeed,
  fetchWatchNextItems,
} from "./youtubejs-lib.mjs";

const REFRESH_COOKIES_HINT =
  "No feed — refresh Safari cookies from the menu, then try again";
const PARTIAL_COOKIES_HINT =
  "Cookies are partial — Plugin → Refresh Safari Cookies (IINA needs Full Disk Access)";

function parseArgs(argv) {
  const out = {
    tab: "",
    cookies: path.join(process.env.HOME, ".config/yt-dlp/cookies.txt"),
    query: "",
    videoId: "",
    limit: 0,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--tab") {
      out.tab = argv[++i] || "";
    } else if (arg === "--cookies") {
      out.cookies = argv[++i] || out.cookies;
    } else if (arg === "--query") {
      out.query = argv[++i] || "";
    } else if (arg === "--video-id") {
      out.videoId = argv[++i] || "";
    } else if (arg === "--limit") {
      out.limit = Number(argv[++i]) || 0;
    }
  }

  return out;
}

function emit(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function authEmptyHint(cookiePath) {
  if (!fs.existsSync(cookiePath)) {
    return REFRESH_COOKIES_HINT;
  }
  const raw = fs.readFileSync(cookiePath, "utf8");
  const hasYoutubeDomain = raw
    .split(/\r?\n/)
    .some((line) => line.includes("youtube.com"));
  if (!hasYoutubeDomain) {
    return REFRESH_COOKIES_HINT;
  }
  return PARTIAL_COOKIES_HINT;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.tab) {
    emit({ items: [], error: "missing --tab" });
    process.exit(2);
  }

  if (!fs.existsSync(args.cookies)) {
    emit({ items: [], emptyHint: REFRESH_COOKIES_HINT });
    return;
  }

  if (!hasYouTubeAuth(args.cookies)) {
    emit({ items: [], emptyHint: authEmptyHint(args.cookies) });
    return;
  }

  try {
    const yt = await getYouTubeClient(args.cookies);

    switch (args.tab) {
      case "home": {
        const feed = await yt.getHomeFeed();
        const items = mapHomeFeed(feed).slice(0, 60);
        if (items.length === 0) {
          emit({ items: [], emptyHint: REFRESH_COOKIES_HINT });
          return;
        }
        emit({ items });
        return;
      }
      case "subscriptions": {
        const feed = await yt.getSubscriptionsFeed();
        const items = mapSubscriptionsFeed(feed).slice(0, 80);
        if (items.length === 0) {
          emit({ items: [], emptyHint: REFRESH_COOKIES_HINT });
          return;
        }
        emit({ items });
        return;
      }
      case "shorts": {
        const feed = await yt.getSubscriptionsFeed();
        const items = mapShortsFeed(feed).slice(0, 60);
        if (items.length === 0) {
          emit({
            items: [],
            emptyHint: "No Shorts in your subscriptions feed right now",
          });
          return;
        }
        emit({ items });
        return;
      }
      case "search": {
        const trimmed = args.query.trim();
        if (!trimmed) {
          emit({ items: [], error: "Enter a search query" });
          return;
        }
        const results = await yt.search(trimmed, { type: "video" });
        const items = (results.results || [])
          .map((node) => mapNode(node))
          .filter(Boolean)
          .slice(0, 40);
        emit({ items });
        return;
      }
      case "related": {
        const videoId = args.videoId.trim();
        if (!videoId) {
          emit({
            items: [],
            emptyHint: "Play a YouTube video to see related videos",
          });
          return;
        }
        const limit = args.limit || 0;
        const items = await fetchWatchNextItems(yt, videoId, limit);
        if (items.length === 0) {
          emit({ items: [], emptyHint: "No related videos found" });
          return;
        }
        emit({ items });
        return;
      }
      default:
        emit({ items: [], error: `Unknown tab: ${args.tab}` });
        process.exit(2);
    }
  } catch (err) {
    emit({ items: [], error: String(err), emptyHint: REFRESH_COOKIES_HINT });
    process.exit(1);
  }
}

void main();