/** Build an in-memory M3U playlist from watch URLs. */
export function buildWatchUrlM3U(
  entries: Array<{ title: string; url: string }>,
): string {
  const lines = ["#EXTM3U"];
  for (const entry of entries) {
    const title = entry.title.replace(/[\r\n]+/g, " ").trim() || "YouTube";
    lines.push(`#EXTINF:0,${title}`);
    lines.push(entry.url);
  }
  return lines.join("\n");
}
