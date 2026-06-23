import crypto from "node:crypto";
import { YOUTUBE_DOMAINS, YT_ORIGIN } from "./innertube-constants.mjs";

export function parseNetscapeCookies(text) {
  const cookies = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split("\t");
    if (parts.length < 7) continue;
    cookies.push({
      domain: parts[0],
      name: parts[5],
      value: parts[6],
    });
  }
  return cookies;
}

export function buildCookieHeader(cookies, scope = "youtube-only") {
  const filtered = cookies.filter((c) => {
    if (scope === "youtube-only") {
      return c.domain.includes("youtube.com");
    }
    return [...YOUTUBE_DOMAINS].some(
      (d) =>
        c.domain === d ||
        c.domain.endsWith(d) ||
        c.domain.endsWith(".youtube.com"),
    );
  });
  return filtered.map((c) => `${c.name}=${c.value}`).join("; ");
}

export function cookieMap(cookies) {
  const map = new Map();
  for (const c of cookies) {
    if (c.domain.includes("youtube.com") || c.domain.includes("google.com")) {
      map.set(c.name, c.value);
    }
  }
  return map;
}

export function buildSapisidHash(sapisid, origin = YT_ORIGIN) {
  const ts = Math.floor(Date.now() / 1000);
  const input = `${ts} ${sapisid} ${origin}`;
  const hash = crypto.createHash("sha1").update(input).digest("hex");
  return `SAPISIDHASH ${ts}_${hash}`;
}
