export const YOUTUBE_DOMAINS = new Set([
  ".youtube.com",
  "youtube.com",
  ".www.youtube.com",
  "www.youtube.com",
  ".m.youtube.com",
  ".google.com",
  ".googlevideo.com",
]);

export const YOUTUBE_AUTH_COOKIE_NAMES = new Set(["LOGIN_INFO", "__Secure-1PSID"]);

export interface NetscapeCookie {
  domain: string;
  name: string;
  value: string;
}
