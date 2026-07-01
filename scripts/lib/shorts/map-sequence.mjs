import { thumbUrl } from "../youtubejs-map-core.mjs";

function textValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.toString();
}

function mapNavigationEndpoint(entry) {
  const payload = entry?.payload;
  if (!payload) return null;
  const videoId = payload.videoId;
  if (!videoId) return null;

  const prefetch = payload.unserializedPrefetchData?.playerResponse?.videoDetails;
  const title =
    prefetch?.title ||
    textValue(payload.accessibilityRenderer?.accessibilityData?.label) ||
    "Short";
  const channelTitle = prefetch?.author || "Shorts";
  const channelId = prefetch?.channelId || undefined;
  const thumbnailUrl =
    thumbUrl(payload.thumbnail?.thumbnails) ||
    `https://i.ytimg.com/vi/${videoId}/oardefault.jpg`;

  return {
    videoId,
    title,
    channelTitle,
    channelId,
    thumbnailUrl,
    isShort: true,
  };
}

/** Map reel_watch_sequence entries to FeedItem rows. */
export function mapReelSequenceEntries(entries) {
  if (!Array.isArray(entries)) return [];
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const item = mapNavigationEndpoint(entry);
    if (!item || seen.has(item.videoId)) continue;
    seen.add(item.videoId);
    out.push(item);
  }
  return out;
}
