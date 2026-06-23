import { YOUTUBE_AUTH_COOKIE_NAMES } from "./constants";
import { readNetscapeCookies, youtubeDomainMatches } from "./parse";

/** Any cookie scoped to youtube.com (not merely google.com / googlevideo.com). */
export function hasYouTubeDomainCookies(): boolean {
  const cookies = readNetscapeCookies();
  if (cookies === null) {
    return false;
  }

  return cookies.some((cookie) => youtubeDomainMatches(cookie.domain));
}

/** True when LOGIN_INFO or __Secure-1PSID is present on a youtube.com domain. */
export function hasYouTubeAuth(): boolean {
  const cookies = readNetscapeCookies();
  if (cookies === null) {
    return false;
  }

  return cookies.some(
    (cookie) =>
      youtubeDomainMatches(cookie.domain) &&
      YOUTUBE_AUTH_COOKIE_NAMES.has(cookie.name) &&
      cookie.value.length > 0,
  );
}
