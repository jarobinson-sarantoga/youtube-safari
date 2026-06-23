/** Trim and strip optional ytdl:// prefix (IINA Online Media convention). */
export function normalizeMediaURL(url: string): string {
  let u = url.trim();
  if (u.startsWith("ytdl://")) {
    u = u.slice("ytdl://".length).trim();
  }
  return u;
}
