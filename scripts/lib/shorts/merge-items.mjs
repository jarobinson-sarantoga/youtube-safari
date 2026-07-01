/** Merge feed rows by videoId, preserving order of the base list. */
export function mergeUniqueVideoItems(base, extra) {
  const seen = new Set(base.map((item) => item.videoId));
  const merged = [...base];
  for (const item of extra) {
    if (!item?.videoId || seen.has(item.videoId)) {
      continue;
    }
    seen.add(item.videoId);
    merged.push(item);
  }
  return merged;
}
