import {
  GOOGLE_AUTH_COOKIE_NAMES,
  isGoogleAuthDomain,
  isYoutubeDomain,
} from "./constants";
import type { NetscapeCookie } from "./constants";

/** Cookie header for InnerTube browse: youtube.com session + .google.com SAPISID auth. */
export function buildBrowseCookieHeader(cookies: NetscapeCookie[]): string {
  const byName = new Map<string, string>();

  for (const cookie of cookies) {
    if (isYoutubeDomain(cookie.domain)) {
      byName.set(cookie.name, cookie.value);
    }
  }

  for (const cookie of cookies) {
    if (
      isGoogleAuthDomain(cookie.domain) &&
      GOOGLE_AUTH_COOKIE_NAMES.has(cookie.name) &&
      !byName.has(cookie.name)
    ) {
      byName.set(cookie.name, cookie.value);
    }
  }

  return [...byName.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}
