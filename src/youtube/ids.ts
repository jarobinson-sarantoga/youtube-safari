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

export function youtubeThumbnailUrl(videoId: string, quality: "hq" | "mq" | "short" = "hq"): string {
  if (quality === "short") {
    return `https://i.ytimg.com/vi/${videoId}/oardefault.jpg`;
  }
  const suffix = quality === "hq" ? "hqdefault" : "mqdefault";
  return `https://i.ytimg.com/vi/${videoId}/${suffix}.jpg`;
}

/** Portrait 9:16 thumbnail for Shorts. */
export function youtubeShortThumbnailUrl(videoId: string): string {
  return youtubeThumbnailUrl(videoId, "short");
}
