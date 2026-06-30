/** Shared Netscape cookie parsing and browse auth header building. */

export const YOUTUBE_AUTH_COOKIE_NAMES = new Set([
  "LOGIN_INFO",
  "__Secure-1PSID",
  "__Secure-3PSID",
]);

export const YOUTUBE_SID_AUTH_COOKIE_NAMES = [
  "SAPISID",
  "__Secure-3PAPISID",
  "__Secure-1PAPISID",
];

export function isYoutubeDomain(domain) {
  return (
    domain === ".youtube.com" ||
    domain === "youtube.com" ||
    domain.endsWith(".youtube.com")
  );
}

export function parseNetscapeCookies(raw) {
  return raw
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const parts = line.split("\t");
      return { domain: parts[0] || "", name: parts[5] || "", value: parts[6] || "" };
    })
    .filter((cookie) => cookie.name && cookie.value !== undefined);
}

/** Cookie header for InnerTube browse — youtube.com only (no .google.com mix). */
export function buildBrowseCookieHeader(cookies) {
  return cookies
    .filter((cookie) => isYoutubeDomain(cookie.domain))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

export function resolveSidAuthValue(cookies) {
  const youtube = cookies.filter((cookie) => isYoutubeDomain(cookie.domain));
  for (const name of YOUTUBE_SID_AUTH_COOKIE_NAMES) {
    const match = youtube.find((cookie) => cookie.name === name && cookie.value.length > 0);
    if (match) {
      return match.value;
    }
  }
  return "";
}

export function hasYouTubeAuthCookies(cookies) {
  return cookies.some(
    (cookie) =>
      isYoutubeDomain(cookie.domain) &&
      YOUTUBE_AUTH_COOKIE_NAMES.has(cookie.name) &&
      cookie.value.length > 0,
  );
}

export function hasBrowseAuthCookies(cookies) {
  return hasYouTubeAuthCookies(cookies) && resolveSidAuthValue(cookies).length > 0;
}

export function keepBrowseExportDomains(raw) {
  return raw
    .split(/\r?\n/)
    .filter((line) => {
      if (!line || line.startsWith("#")) {
        return true;
      }
      const domain = line.split("\t")[0] || "";
      return isYoutubeDomain(domain);
    })
    .join("\n");
}
