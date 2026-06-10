import type { DescriptionChapter } from "./description-chapters";
import { normalizeChapters } from "./description-chapters";
import { buildFormatString } from "./format";
import { getSelectedHeight } from "./qualities";
import type { ResolvedSubtitle } from "./subtitles";

const { console, preferences, utils } = iina;

const LOG_PATH = "@data/youtube-safari.log";
const RESOLVE_SCRIPT = "~/Projects/youtube-safari/scripts/resolve.sh";
const PLAYLIST_SCRIPT = "~/Projects/youtube-safari/scripts/list-playlist.sh";

export interface ResolvedStream {
  title: string;
  description: string;
  chapters: DescriptionChapter[];
  subtitles: ResolvedSubtitle[];
  videoUrl: string;
  audioUrl: string | null;
  headers: Record<string, string>;
}

interface ResolvePayload {
  title?: string;
  description?: string;
  chapters?: unknown;
  subtitles?: unknown;
  video?: string;
  audio?: string;
  ua?: string;
  error?: string;
}

function normalizeSubtitles(raw: unknown): ResolvedSubtitle[] {
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

export interface PlaylistEntry {
  id: string;
  title: string;
  url: string;
}

export interface PlaylistListing {
  title: string;
  entries: PlaylistEntry[];
}

interface PlaylistPayload {
  title?: string;
  entries?: PlaylistEntry[];
  error?: string;
}

export function appendLog(message: string): void {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    const path = utils.resolvePath(LOG_PATH);
    const { file } = iina;
    let existing = "";
    try {
      existing = file.read(path) || "";
    } catch {
      existing = "";
    }
    const trimmed = existing.length > 200_000 ? existing.slice(-120_000) : existing;
    file.write(path, trimmed + line);
  } catch (err) {
    console.log(`log write failed: ${err}`);
  }
}

export function getLogPath(): string {
  return utils.resolvePath(LOG_PATH);
}

function prefPath(key: string): string {
  const value = preferences.get(key) as string;
  return utils.resolvePath(value);
}

function resolveScriptPath(): string {
  const configured = preferences.get("resolve_script") as string | undefined;
  const candidate = configured || RESOLVE_SCRIPT;
  return utils.resolvePath(candidate);
}

function playlistScriptPath(): string {
  const configured = preferences.get("playlist_script") as string | undefined;
  const candidate = configured || PLAYLIST_SCRIPT;
  return utils.resolvePath(candidate);
}

function buildResolveArgs(url: string): string[] {
  const script = resolveScriptPath();
  const args = [script, url];

  const cookies = preferences.get("cookies_path") as string | undefined;
  if (cookies) {
    args.push("--cookies", prefPath("cookies_path"));
  }

  const ytdlp = preferences.get("ytdl_path") as string | undefined;
  if (ytdlp) {
    args.push("--ytdlp", prefPath("ytdl_path"));
  }

  args.push("--format", buildFormatString(getSelectedHeight()));

  return args;
}

function buildPlaylistArgs(url: string): string[] {
  const script = playlistScriptPath();
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

export async function listYouTubePlaylist(url: string): Promise<PlaylistListing> {
  const script = playlistScriptPath();
  if (!utils.fileInPath(script)) {
    throw new Error(`playlist script not found at ${script}`);
  }

  const args = buildPlaylistArgs(url);
  appendLog(`Listing playlist via script: ${args.join(" ")}`);
  const result = await utils.exec("/bin/bash", args);

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `exit ${result.status}`);
  }

  const line = result.stdout.trim().split("\n").pop() || "";
  let payload: PlaylistPayload;
  try {
    payload = JSON.parse(line);
  } catch (err) {
    throw new Error(`playlist JSON parse error: ${err}`);
  }

  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  if (!entries.length) {
    throw new Error(payload.error || "playlist has no entries");
  }

  return {
    title: payload.title || "YouTube Playlist",
    entries: entries.filter(
      (entry): entry is PlaylistEntry =>
        typeof entry?.url === "string" &&
        typeof entry?.id === "string" &&
        typeof entry?.title === "string",
    ),
  };
}

let resolveQueue: Promise<unknown> = Promise.resolve();

async function extractYouTubeOnce(url: string): Promise<ResolvedStream | null> {
  const script = resolveScriptPath();
  if (!utils.fileInPath(script)) {
    throw new Error(`resolve script not found at ${script}`);
  }

  const args = buildResolveArgs(url);
  appendLog(`Resolving via script: ${args.join(" ")}`);
  const result = await utils.exec("/bin/bash", args);

  if (result.status !== 0) {
    appendLog(`resolve.sh failed (${result.status}): ${result.stderr || result.stdout}`);
    return null;
  }

  const line = result.stdout.trim().split("\n").pop() || "";
  let payload: ResolvePayload;
  try {
    payload = JSON.parse(line);
  } catch (err) {
    appendLog(`resolve JSON parse error: ${err}; stdout=${result.stdout.slice(0, 200)}`);
    return null;
  }

  if (!payload.video) {
    appendLog(`resolve returned no video: ${JSON.stringify(payload)}`);
    return null;
  }

  const subtitles = normalizeSubtitles(payload.subtitles);
  appendLog(
    `Resolved: ${payload.title || "YouTube"} (subs: ${subtitles.map((s) => s.lang).join(",") || "none"})`,
  );
  return {
    title: payload.title || "YouTube",
    description: payload.description || "",
    chapters: normalizeChapters(payload.chapters),
    subtitles,
    videoUrl: payload.video,
    audioUrl: payload.audio || null,
    headers: { "User-Agent": payload.ua || "Mozilla/5.0" },
  };
}

/** Serialize yt-dlp resolves — parallel browse clicks were starving each other. */
export async function extractYouTube(url: string): Promise<ResolvedStream | null> {
  const queued = resolveQueue.then(
    () => extractYouTubeOnce(url),
    () => extractYouTubeOnce(url),
  );
  resolveQueue = queued.catch(() => {});
  return queued;
}