export function textValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.toString();
}

export function thumbUrl(thumbnails) {
  if (!thumbnails?.length) return "";
  const last = thumbnails[thumbnails.length - 1];
  return typeof last?.url === "string" ? last.url : "";
}

export function mapVideoLike(node, sectionId) {
  const videoId = node.video_id;
  if (!videoId) return null;
  return {
    videoId,
    title: textValue(node.title) || "Untitled",
    channelTitle:
      textValue(node.author?.name) ||
      textValue(node.short_byline_text) ||
      "Unknown channel",
    channelId: node.author?.id,
    thumbnailUrl: thumbUrl(node.thumbnails),
    publishedAt: textValue(node.published) || undefined,
    durationLabel: textValue(node.length_text) || undefined,
    sectionId,
    isShort: sectionId === "shorts" ? true : undefined,
  };
}

export function mapLockupView(node, sectionId) {
  const contentType = node.content_type;
  if (
    contentType &&
    contentType !== "VIDEO" &&
    contentType !== "SHORT" &&
    contentType !== "CLIP"
  ) {
    return null;
  }
  const videoId = node.content_id;
  if (!videoId) return null;
  const meta = node.metadata;
  const channelTitle = textValue(
    meta?.metadata?.metadata_rows?.[0]?.metadata_parts?.[0]?.text,
  );
  const sources = node.content_image?.image?.sources;
  return {
    videoId,
    title: textValue(meta?.title) || "Untitled",
    channelTitle: channelTitle || "Unknown channel",
    thumbnailUrl: sources ? thumbUrl(sources) : "",
    sectionId,
    isShort:
      contentType === "SHORT" || contentType === "CLIP" ? true : undefined,
  };
}

export function mapShortsLockupView(node, sectionId) {
  const payload = node.on_tap_endpoint?.payload;
  const reel = payload?.reelWatchEndpoint;
  const videoId =
    (typeof payload?.videoId === "string" ? payload.videoId : undefined) ||
    reel?.videoId ||
    node.entity_id?.replace(/^shorts-shelf-item-/, "") ||
    "";
  if (!videoId) return null;
  return {
    videoId,
    title:
      textValue(node.overlay_metadata?.primary_text) ||
      node.accessibility_text ||
      "Short",
    channelTitle: textValue(node.overlay_metadata?.secondary_text) || "Shorts",
    thumbnailUrl: thumbUrl(node.thumbnail),
    sectionId,
    isShort: true,
  };
}

export function mapNode(node, sectionId) {
  const type = node.type || "";
  switch (type) {
    case "Video":
    case "CompactVideo":
    case "GridVideo":
      return mapVideoLike(node, sectionId);
    case "LockupView":
      return mapLockupView(node, sectionId);
    case "ShortsLockupView":
      return mapShortsLockupView(node, sectionId);
    case "ReelItem":
      if (!node.id) return null;
      return {
        videoId: node.id,
        title: textValue(node.title) || "Short",
        channelTitle: textValue(node.views) || "Shorts",
        thumbnailUrl: thumbUrl(node.thumbnails),
        sectionId,
        isShort: true,
      };
    case "RichItem":
      return node.content ? mapNode(node.content, sectionId) : null;
    default:
      return null;
  }
}

export function pushItem(item, out, seen) {
  if (!item || seen.has(item.videoId)) return;
  seen.add(item.videoId);
  out.push(item);
}
