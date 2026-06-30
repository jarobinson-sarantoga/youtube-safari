import {
  isYoutubeDomain,
  YOUTUBE_AUTH_COOKIE_NAMES,
  YOUTUBE_SID_AUTH_COOKIE_NAMES,
} from "./constants";
import { readNetscapeCookies } from "./parse";

/** Any cookie scoped to youtube.com (not merely google.com / googlevideo.com). */
export function hasYouTubeDomainCookies(): boolean {
  const cookies = readNetscapeCookies();
  if (cookies === null) {
    return false;
  }

  return cookies.some((cookie) => isYoutubeDomain(cookie.domain));
}

/** True when LOGIN_INFO or a PSID cookie is present on youtube.com. */
export function hasYouTubeAuth(): boolean {
  const cookies = readNetscapeCookies();
  if (cookies === null) {
    return false;
  }

  return cookies.some(
    (cookie) =>
      isYoutubeDomain(cookie.domain) &&
      YOUTUBE_AUTH_COOKIE_NAMES.has(cookie.name) &&
      cookie.value.length > 0,
  );
}

/** True when browse feeds can send SAPISIDHASH via a youtube.com PAPISID cookie. */
export function hasBrowseAuth(): boolean {
  const cookies = readNetscapeCookies();
  if (cookies === null || !hasYouTubeAuth()) {
    return false;
  }

  return YOUTUBE_SID_AUTH_COOKIE_NAMES.some((name) =>
    cookies.some(
      (cookie) =>
        isYoutubeDomain(cookie.domain) && cookie.name === name && cookie.value.length > 0,
    ),
  );
}

export function missingBrowseAuthHint(): string {
  const cookies = readNetscapeCookies();
  if (cookies === null) {
    return "No feed — refresh Safari cookies from the menu, then try again";
  }

  if (!hasYouTubeAuth()) {
    return "Cookies are partial — Plugin → Refresh YouTube (IINA needs Full Disk Access)";
  }

  if (!hasBrowseAuth()) {
    return "Cookies are partial — sign in to YouTube in Safari, then Plugin → Refresh YouTube";
  }

  return "No feed — sign in to YouTube in Safari, then Plugin → Refresh YouTube";
}
