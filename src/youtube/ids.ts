import { normalizeMediaURL } from "./normalize";
import { decodeQueryComponent } from "./query";
import { isYouTubeWatchURL } from "./url-match";

export function getYouTubePlaylistId(url: string): string | null {
  const match = normalizeMediaURL(url).match(/[?&]list=([^&#]+)/i);
  return match ? decodeQueryComponent(match[1]) : null;
}

export function getYouTubeVideoId(url: string): string | null {
  const normalized = normalizeMediaURL(url);

  let match = normalized.match(/[?&]v=([\w-]{6,})/i);
  if (match) {
    return match[1];
  }

  match = normalized.match(/youtu\.be\/([\w-]{6,})/i);
  if (match) {
    return match[1];
  }

  match = normalized.match(/\/shorts\/([\w-]{6,})/i);
  if (match) {
    return match[1];
  }

  match = normalized.match(/\/live\/([\w-]{6,})/i);
  if (match) {
    return match[1];
  }

  return null;
}

export function isYouTubePlaylistURL(url: string): boolean {
  return isYouTubeWatchURL(url) && getYouTubePlaylistId(url) !== null;
}

/** Canonical YouTube watch URL for a video ID. */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** YouTube thumbnail URL for a video ID. */
export function youtubeThumbnailUrl(videoId: string, quality: "hq" | "mq" = "hq"): string {
  const suffix = quality === "hq" ? "hqdefault" : "mqdefault";
  return `https://i.ytimg.com/vi/${videoId}/${suffix}.jpg`;
}
