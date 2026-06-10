import type { DescriptionChapter } from "./description-chapters";
import { normalizeChapters, pickChapters } from "./description-chapters";
import { browseCacheTtlMs } from "./browse/store/cache";
import { heightLabel } from "./format";
import { getYouTubeVideoId } from "./youtube";
import { commonYtdlpFlags, execBashJsonLine } from "./ytdlp-script";

const { preferences, utils } = iina;

const LIST_SCRIPT = "~/Projects/youtube-safari/scripts/list-formats.sh";

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

function listScriptPath(): string {
  const configured = preferences.get("list_formats_script") as string | undefined;
  return utils.resolvePath(configured || LIST_SCRIPT);
}

function buildListArgs(url: string): string[] {
  return [listScriptPath(), url, ...commonYtdlpFlags()];
}

/** Current quality_height preference (0 = auto / up to 4K). */
export function getSelectedHeight(): number {
  const value = preferences.get("quality_height");
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function parseListedData(parsed: unknown): ListedQualities | null {
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

function parseQualityArray(options: unknown[]): ListedQualities | null {
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

interface QualitiesCacheEntry {
  savedAt: number;
  data: ListedQualities;
}

const qualitiesCache = new Map<string, QualitiesCacheEntry>();
const MAX_QUALITIES_CACHE_ENTRIES = 50;

function evictOldestQualitiesEntries(): void {
  if (qualitiesCache.size <= MAX_QUALITIES_CACHE_ENTRIES) {
    return;
  }
  const sorted = [...qualitiesCache.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt);
  while (qualitiesCache.size > MAX_QUALITIES_CACHE_ENTRIES && sorted.length > 0) {
    const oldest = sorted.shift();
    if (oldest) {
      qualitiesCache.delete(oldest[0]);
    }
  }
}

export function clearQualitiesCache(): void {
  qualitiesCache.clear();
}

function getCachedQualities(videoId: string): ListedQualities | null {
  const entry = qualitiesCache.get(videoId);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.savedAt > browseCacheTtlMs()) {
    qualitiesCache.delete(videoId);
    return null;
  }
  return entry.data;
}

function setCachedQualities(videoId: string, data: ListedQualities): void {
  qualitiesCache.set(videoId, { savedAt: Date.now(), data });
  evictOldestQualitiesEntries();
}

/** List selectable qualities for a YouTube watch URL (includes Auto at height 0). */
export async function listQualities(url: string): Promise<ListedQualities> {
  const empty: ListedQualities = {
    items: [{ height: 0, label: heightLabel(0) }],
    title: "",
    description: "",
    chapters: [],
  };

  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    const cached = getCachedQualities(videoId);
    if (cached) {
      return cached;
    }
  }

  const args = buildListArgs(url);
  const result = await execBashJsonLine<unknown>(args, "Listing qualities");

  if (!result.ok || result.data === undefined) {
    return { ...empty, error: result.error || "Could not list video qualities" };
  }

  const listed = parseListedData(result.data);
  if (!listed) {
    return {
      ...empty,
      error: result.error || "Could not parse quality list",
    };
  }

  if (videoId) {
    setCachedQualities(videoId, listed);
  }

  return listed;
}