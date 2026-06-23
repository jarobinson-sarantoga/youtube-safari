import type { ResolvedSubtitle } from "../subtitles";

export function normalizeSubtitles(raw: unknown): ResolvedSubtitle[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const subtitles: ResolvedSubtitle[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const lang = typeof record.lang === "string" ? record.lang : "";
    const url = typeof record.url === "string" ? record.url : "";
    const data = typeof record.data === "string" ? record.data : "";
    if (!lang || (!url && !data)) {
      continue;
    }
    subtitles.push({
      lang,
      ext: typeof record.ext === "string" ? record.ext : "vtt",
      url,
      data,
      name: typeof record.name === "string" ? record.name : lang,
    });
  }

  return subtitles;
}
