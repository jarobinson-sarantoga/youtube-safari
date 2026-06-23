import { heightLabel } from "../format";
import { getYouTubeVideoId } from "../youtube";
import { commonYtdlpFlags, execBashJsonLine } from "../ytdlp-script";
import { getCachedQualities, setCachedQualities } from "./cache";
import { parseListedData, type ListedQualities } from "./parse";

const { preferences, utils } = iina;

const LIST_SCRIPT = "~/Projects/youtube-safari/scripts/list-formats.sh";

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
