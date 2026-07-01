import path from "node:path";
import {
  mapHomeFeed,
  mapNode,
  mapShortsFeed,
  mapSubscriptionsFeed,
  fetchWatchNextItems,
} from "../youtubejs-lib.mjs";
import { fetchShortsSequence } from "./shorts/index.mjs";
import {
  feedNeedsSignIn,
  PARTIAL_COOKIES_HINT,
  REFRESH_COOKIES_HINT,
} from "./youtubejs-feed-auth.mjs";

export function parseArgs(argv) {
  const out = {
    tab: "",
    cookies: path.join(process.env.HOME, ".config/yt-dlp/cookies.txt"),
    query: "",
    videoId: "",
    limit: 0,
    continuation: "",
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
    } else if (arg === "--continuation") {
      out.continuation = argv[++i] || "";
    }
  }

  return out;
}

export async function fetchTabItems(yt, args) {
  switch (args.tab) {
    case "home": {
      const feed = await yt.getHomeFeed();
      const items = mapHomeFeed(feed).slice(0, 60);
      if (items.length === 0) {
        const hint = feedNeedsSignIn(feed) ? PARTIAL_COOKIES_HINT : REFRESH_COOKIES_HINT;
        return { items: [], emptyHint: hint };
      }
      return { items };
    }
    case "subscriptions": {
      const feed = await yt.getSubscriptionsFeed();
      const items = mapSubscriptionsFeed(feed).slice(0, 80);
      if (items.length === 0) {
        const hint = feedNeedsSignIn(feed) ? PARTIAL_COOKIES_HINT : REFRESH_COOKIES_HINT;
        return { items: [], emptyHint: hint };
      }
      return { items };
    }
    case "subs-shorts": {
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
    case "shorts": {
      const limit = args.limit > 0 ? args.limit : 60;
      const { items, continuation } = await fetchShortsSequence(
        yt,
        args.continuation,
        limit,
      );
      if (items.length === 0) {
        return {
          items: [],
          emptyHint: "No Shorts available right now — try Refresh YouTube",
        };
      }
      return { items, continuation: continuation || undefined };
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
