import type { DescriptionChapter } from "../description-chapters";
import { normalizeChapters, pickChapters } from "../description-chapters";
import { heightLabel } from "../format";

export interface QualityItem {
  height: number;
  label: string;
}

export interface ListedQualities {
  items: QualityItem[];
  title: string;
  description: string;
  chapters: DescriptionChapter[];
  error?: string;
}

export function parseListedData(parsed: unknown): ListedQualities | null {
  if (Array.isArray(parsed)) {
    return parseQualityArray(parsed);
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title : "";
  const description = typeof record.description === "string" ? record.description : "";
  const ytdlpChapters = normalizeChapters(record.chapters);
  const qualities = Array.isArray(record.qualities) ? record.qualities : [];
  const listed = parseQualityArray(qualities);
  if (!listed) {
    return null;
  }
  return {
    items: listed.items,
    title,
    description,
    chapters: pickChapters(ytdlpChapters, description),
  };
}

export function parseQualityArray(options: unknown[]): ListedQualities | null {
  const items: QualityItem[] = [{ height: 0, label: heightLabel(0) }];
  const seen = new Set<number>([0]);

  for (const option of options) {
    if (!option || typeof option !== "object") {
      continue;
    }
    const record = option as Record<string, unknown>;
    const height = record.height;
    if (typeof height !== "number" || height <= 0 || seen.has(height)) {
      continue;
    }
    seen.add(height);
    items.push({
      height,
      label: typeof record.label === "string" ? record.label : heightLabel(height),
    });
  }

  return { items, title: "", description: "", chapters: [] };
}
