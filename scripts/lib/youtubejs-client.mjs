import crypto from "node:crypto";
import fs from "node:fs";
import { Innertube, Parser, YTNodes } from "youtubei.js";
import {
  buildBrowseCookieHeader,
  hasBrowseAuthCookies,
  hasYouTubeAuthCookies,
  parseNetscapeCookies,
  resolveSidAuthValue,
} from "./youtube-cookies.mjs";
import { mapWatchNext } from "./youtubejs-map-feeds.mjs";

const { NavigationEndpoint, TwoColumnWatchNextResults, ItemSection } = YTNodes;

function sidAuthHeader(sid) {
  const timestamp = Math.floor(Date.now() / 1000);
  const input = [timestamp, sid, "https://www.youtube.com"].join(" ");
  const hash = crypto.createHash("sha1").update(input).digest("hex");
  return `SAPISIDHASH ${timestamp}_${hash}`;
}

function createBrowseFetch(sidAuthValue, baseFetch = globalThis.fetch) {
  return async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes("youtubei/v1") || !sidAuthValue) {
      return baseFetch(input, init);
    }

    const headers = new Headers(
      init?.headers || (input instanceof Request ? input.headers : undefined),
    );
    if (!headers.has("Authorization")) {
      headers.set("Authorization", sidAuthHeader(sidAuthValue));
      headers.set("X-Goog-Authuser", "0");
    }

    return baseFetch(input, { ...init, headers });
  };
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

  const cookies = parseNetscapeCookies(fs.readFileSync(cookiePath, "utf8"));
  const cookie = buildBrowseCookieHeader(cookies);
  const sidAuthValue = resolveSidAuthValue(cookies);

  clientCookiePath = cookiePath;
  clientPromise = Innertube.create({
    lang: "en",
    location: "US",
    cookie,
    fetch: createBrowseFetch(sidAuthValue),
    retrieve_player: false,
    enable_session_cache: false,
  });
  return clientPromise;
}

export function resetYouTubeClient() {
  clientPromise = null;
  clientCookiePath = "";
}
