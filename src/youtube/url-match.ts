import { normalizeMediaURL } from "./normalize";

export function isGoogleVideoURL(url: string): boolean {
  const u = normalizeMediaURL(url);
  return /googlevideo\.com/i.test(u);
}

/**
 * Match YouTube watch URLs without the browser URL() API — not available in
 * IINA's JavaScriptCore runtime.
 */
export function isYouTubeWatchURL(url: string): boolean {
  const u = normalizeMediaURL(url);
  if (!/^https?:\/\//i.test(u)) {
    return false;
  }

  // youtu.be/VIDEO_ID
  if (/^https?:\/\/youtu\.be\/[\w-]+/i.test(u)) {
    return true;
  }

  const hostMatch = u.match(/^https?:\/\/([^/?#]+)/i);
  if (!hostMatch) {
    return false;
  }

  const host = hostMatch[1].toLowerCase();
  const watchHosts = new Set([
    "www.youtube.com",
    "youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "www.youtube-nocookie.com",
  ]);

  if (!watchHosts.has(host)) {
    return false;
  }

  if (/[?&]v=[\w-]+/i.test(u) && /\/watch\b/i.test(u)) {
    return true;
  }

  if (/\/shorts\/[\w-]+/i.test(u)) {
    return true;
  }

  if (/\/live\/[\w-]+/i.test(u)) {
    return true;
  }

  if (/\/embed\/[\w-]+/i.test(u)) {
    return true;
  }

  return false;
}
