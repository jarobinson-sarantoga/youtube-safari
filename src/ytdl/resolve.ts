import { normalizeChapters } from "../description-chapters";
import { execBashJsonLine } from "../ytdlp-script";
import { appendLog } from "./log";
import { normalizeSubtitles } from "./normalize";
import { buildResolveArgs } from "./scripts";
import type { ResolvePayload, ResolvedStream } from "./types";

let resolveQueue: Promise<unknown> = Promise.resolve();

async function extractYouTubeOnce(url: string): Promise<ResolvedStream | null> {
  const args = buildResolveArgs(url);
  const result = await execBashJsonLine<ResolvePayload>(args, "Resolving via script");

  if (!result.ok || !result.data) {
    return null;
  }

  const payload = result.data;

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
