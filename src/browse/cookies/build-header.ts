import {
  isYoutubeDomain,
  YOUTUBE_SID_AUTH_COOKIE_NAMES,
  type NetscapeCookie,
} from "./constants";

/** Cookie header for InnerTube browse — youtube.com only (no .google.com mix). */
export function buildBrowseCookieHeader(cookies: NetscapeCookie[]): string {
  return cookies
    .filter((cookie) => isYoutubeDomain(cookie.domain))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

export function resolveSidAuthValue(cookies: NetscapeCookie[]): string {
  const youtube = cookies.filter((cookie) => isYoutubeDomain(cookie.domain));
  for (const name of YOUTUBE_SID_AUTH_COOKIE_NAMES) {
    const match = youtube.find((cookie) => cookie.name === name && cookie.value.length > 0);
    if (match) {
      return match.value;
    }
  }
  return "";
}
