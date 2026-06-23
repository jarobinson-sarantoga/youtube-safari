import fs from "node:fs";
import { Innertube, Parser, YTNodes } from "youtubei.js";
import { mapWatchNext } from "./youtubejs-map-feeds.mjs";

const { NavigationEndpoint, TwoColumnWatchNextResults, ItemSection } = YTNodes;

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
