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

export const YOUTUBE_SID_AUTH_COOKIE_NAMES = [
  "SAPISID",
  "__Secure-3PAPISID",
  "__Secure-1PAPISID",
];

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
