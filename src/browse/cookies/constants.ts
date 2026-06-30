export const YOUTUBE_DOMAINS = new Set([
  ".youtube.com",
  "youtube.com",
  ".www.youtube.com",
  "www.youtube.com",
  ".m.youtube.com",
  ".google.com",
  ".googlevideo.com",
]);

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

export interface NetscapeCookie {
  domain: string;
  name: string;
  value: string;
}

export function isYoutubeDomain(domain: string): boolean {
  return (
    domain === ".youtube.com" ||
    domain === "youtube.com" ||
    domain.endsWith(".youtube.com")
  );
}

export function isGoogleAuthDomain(domain: string): boolean {
  return domain === ".google.com" || domain === "google.com";
}
