#!/usr/bin/env node
/**
 * Verify YouTube.js feed fetches with Safari cookies.
 * Usage: node scripts/verify-youtubejs-feeds.mjs [cookies.txt path]
 */
import fs from "node:fs";
import path from "node:path";
import { Innertube } from "youtubei.js";
import { mapNode } from "./lib/youtubejs-map-core.mjs";
import {
  mapHomeFeed,
  mapShortsFeed,
  mapSubscriptionsFeed,
  mapWatchNext,
} from "./lib/youtubejs-verify-map.mjs";
import {
  firstLine,
  readCookieHeader,
  runFeedChecks,
  sectionCounts,
} from "./lib/youtubejs-verify-checks.mjs";

const COOKIES_PATH =
  process.argv[2] || path.join(process.env.HOME, ".config/yt-dlp/cookies.txt");

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
  firstLine("search", searchItems);

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

  const failed = runFeedChecks({
    loginWall,
    homeItems,
    subsItems,
    subsSections,
    shortsItems,
    searchItems,
    homeFirst,
    subsFirst,
    shortsFirst,
    relatedFirst,
  });

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
