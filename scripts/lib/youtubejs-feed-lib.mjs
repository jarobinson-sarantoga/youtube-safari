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
} from "../youtubejs-lib.mjs";

export const REFRESH_COOKIES_HINT =
  "No feed — refresh Safari cookies from the menu, then try again";
export const PARTIAL_COOKIES_HINT =
  "Cookies are partial — Plugin → Refresh YouTube (IINA needs Full Disk Access)";

export function parseArgs(argv) {
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

export function authEmptyHint(cookiePath) {
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

export async function fetchTabItems(yt, args) {
  switch (args.tab) {
    case "home": {
      const feed = await yt.getHomeFeed();
      const items = mapHomeFeed(feed).slice(0, 60);
      if (items.length === 0) {
        return { items: [], emptyHint: REFRESH_COOKIES_HINT };
      }
      return { items };
    }
    case "subscriptions": {
      const feed = await yt.getSubscriptionsFeed();
      const items = mapSubscriptionsFeed(feed).slice(0, 80);
      if (items.length === 0) {
        return { items: [], emptyHint: REFRESH_COOKIES_HINT };
      }
      return { items };
    }
    case "shorts": {
      const feed = await yt.getSubscriptionsFeed();
      const items = mapShortsFeed(feed).slice(0, 60);
      if (items.length === 0) {
        return {
          items: [],
          emptyHint: "No Shorts in your subscriptions feed right now",
        };
      }
      return { items };
    }
    case "search": {
      const trimmed = args.query.trim();
      if (!trimmed) {
        return { items: [], error: "Enter a search query" };
      }
      const results = await yt.search(trimmed, { type: "video" });
      const items = (results.results || [])
        .map((node) => mapNode(node))
        .filter(Boolean)
        .slice(0, 40);
      return { items };
    }
    case "related": {
      const videoId = args.videoId.trim();
      if (!videoId) {
        return {
          items: [],
          emptyHint: "Play a YouTube video to see related videos",
        };
      }
      const limit = args.limit || 0;
      const items = await fetchWatchNextItems(yt, videoId, limit);
      if (items.length === 0) {
        return { items: [], emptyHint: "No related videos found" };
      }
      return { items };
    }
    default:
      return { items: [], error: `Unknown tab: ${args.tab}`, exitCode: 2 };
  }
}

export { getYouTubeClient, hasYouTubeAuth };
