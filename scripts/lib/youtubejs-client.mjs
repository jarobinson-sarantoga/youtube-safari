import fs from "node:fs";
import { Innertube, Parser, YTNodes } from "youtubei.js";
import {
  buildBrowseCookieHeader,
  hasBrowseAuthCookies,
  hasYouTubeAuthCookies,
  parseNetscapeCookies,
} from "./youtube-cookies.mjs";
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
  return buildBrowseCookieHeader(parseNetscapeCookies(raw));
}

export function hasYouTubeAuth(filePath) {
  const cookies = parseNetscapeCookies(fs.readFileSync(filePath, "utf8"));
  return hasYouTubeAuthCookies(cookies);
}

export function hasBrowseAuth(filePath) {
  const cookies = parseNetscapeCookies(fs.readFileSync(filePath, "utf8"));
  return hasBrowseAuthCookies(cookies);
}

let clientPromise = null;
let clientCookiePath = "";

export async function getYouTubeClient(cookiePath) {
  if (clientPromise && clientCookiePath === cookiePath) {
    return clientPromise;
  }

  clientCookiePath = cookiePath;
  clientPromise = Innertube.create({
    lang: "en",
    location: "US",
    cookie: readBrowseCookieHeader(cookiePath),
    retrieve_player: false,
    enable_session_cache: false,
  });
  return clientPromise;
}

export function resetYouTubeClient() {
  clientPromise = null;
  clientCookiePath = "";
}
