/** Drop empty and duplicate video IDs while preserving order. */
export function dedupeVideoIds(videoIds: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of videoIds) {
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}
