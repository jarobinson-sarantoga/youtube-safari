import type { DescriptionChapter } from "./description-chapters";
import { normalizeChapters, pickChapters } from "./description-chapters";
import { heightLabel } from "./format";
import { appendLog } from "./ytdl";

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
}

function prefPath(key: string): string {
  const value = preferences.get(key) as string;
  return utils.resolvePath(value);
}

function listScriptPath(): string {
  const configured = preferences.get("list_formats_script") as string | undefined;
  return utils.resolvePath(configured || LIST_SCRIPT);
}

function buildListArgs(url: string): string[] {
  const script = listScriptPath();
  const args = [script, url];

  const cookies = preferences.get("cookies_path") as string | undefined;
  if (cookies) {
    args.push("--cookies", prefPath("cookies_path"));
  }

  const ytdlp = preferences.get("ytdl_path") as string | undefined;
  if (ytdlp) {
    args.push("--ytdlp", prefPath("ytdl_path"));
  }

  return args;
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

function parseListedPayload(line: string): ListedQualities | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }

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

/** List selectable qualities for a YouTube watch URL (includes Auto at height 0). */
export async function listQualities(url: string): Promise<ListedQualities> {
  const empty: ListedQualities = {
    items: [{ height: 0, label: heightLabel(0) }],
    title: "",
    description: "",
    chapters: [],
  };

  const script = listScriptPath();
  if (!utils.fileInPath(script)) {
    appendLog(`list-formats script not found: ${script}`);
    return empty;
  }

  const args = buildListArgs(url);
  appendLog(`Listing qualities: ${args.join(" ")}`);
  const result = await utils.exec("/bin/bash", args);

  if (result.status !== 0) {
    appendLog(`list-formats failed (${result.status}): ${result.stderr || result.stdout}`);
    return empty;
  }

  const line = result.stdout.trim().split("\n").pop() || "";
  const listed = parseListedPayload(line);
  if (!listed) {
    appendLog(`list-formats JSON parse error; stdout=${result.stdout.slice(0, 200)}`);
    return empty;
  }

  return listed;
}