/** Shared Netscape cookie parsing and browse auth header building. */

export const YOUTUBE_AUTH_COOKIE_NAMES = new Set([
  "LOGIN_INFO",
  "__Secure-1PSID",
  "__Secure-3PSID",
]);

export const GOOGLE_AUTH_COOKIE_NAMES = new Set([
  "SID",
  "HSID",
  "SSID",
  "APISID",
  "SAPISID",
  "__Secure-1PSID",
  "__Secure-3PSID",
  "__Secure-1PAPISID",
  "__Secure-3PAPISID",
  "__Secure-1PSIDTS",
  "__Secure-3PSIDTS",
  "LOGIN_INFO",
]);

export function isYoutubeDomain(domain) {
  return (
    domain === ".youtube.com" ||
    domain === "youtube.com" ||
    domain.endsWith(".youtube.com")
  );
}

export function isGoogleAuthDomain(domain) {
  return domain === ".google.com" || domain === "google.com";
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

/** Cookie header for InnerTube browse: youtube.com session + .google.com SAPISID auth. */
export function buildBrowseCookieHeader(cookies) {
  const byName = new Map();

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

export function hasYouTubeAuthCookies(cookies) {
  return cookies.some(
    (cookie) =>
      isYoutubeDomain(cookie.domain) &&
      YOUTUBE_AUTH_COOKIE_NAMES.has(cookie.name) &&
      cookie.value.length > 0,
  );
}

export function hasBrowseAuthCookies(cookies) {
  if (!hasYouTubeAuthCookies(cookies)) {
    return false;
  }

  return cookies.some(
    (cookie) =>
      (isGoogleAuthDomain(cookie.domain) || isYoutubeDomain(cookie.domain)) &&
      cookie.name === "SAPISID" &&
      cookie.value.length > 0,
  );
}

export function keepBrowseExportDomains(raw) {
  return raw
    .split(/\r?\n/)
    .filter((line) => {
      if (!line || line.startsWith("#")) {
        return true;
      }
      const domain = line.split("\t")[0] || "";
      return (
        isYoutubeDomain(domain) ||
        isGoogleAuthDomain(domain) ||
        domain === "accounts.google.com"
      );
    })
    .join("\n");
}
