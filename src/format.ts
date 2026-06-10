/** Maximum height for "Auto" quality (up to 4K). */
export const DEFAULT_MAX_HEIGHT = 2160;

const SPECIAL_LABELS: Record<number, string> = {
  0: "Auto (up to 4K)",
  2160: "4K (2160p)",
};

/** Human-readable label for a quality height (codecs not shown). */
export function heightLabel(height: number): string {
  if (height in SPECIAL_LABELS) {
    return SPECIAL_LABELS[height];
  }
  if (height > 0) {
    return `${height}p`;
  }
  return SPECIAL_LABELS[0];
}

/** yt-dlp format string for split DASH (bestvideo + bestaudio). */
export function buildFormatString(height: number): string {
  const max = height > 0 ? height : DEFAULT_MAX_HEIGHT;
  const bounds =
    height > 0 ? `[height<=${max}][height>=${max}]` : `[height<=${DEFAULT_MAX_HEIGHT}]`;
  return [
    `bestvideo${bounds}[vcodec^=av01]+bestaudio[ext=m4a]`,
    `bestvideo${bounds}[vcodec^=vp9]+bestaudio[acodec^=opus]`,
    `bestvideo${bounds}[vcodec^=avc1]+bestaudio[ext=m4a]`,
    `bestvideo${bounds}+bestaudio`,
    `best${bounds}`,
    "best",
  ].join("/");
}