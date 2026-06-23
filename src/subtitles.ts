import { appendLog } from "./ytdl";

const { core, mpv } = iina;

export interface ResolvedSubtitle {
  lang: string;
  ext: string;
  url: string;
  data: string;
  name: string;
}

const SUBTITLE_LANG_ORDER = ["en", "ja"] as const;

function isSafeURL(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function edlEscape(url: string): string {
  return `%${url.length}%${url}`;
}

function ytdlCodecToMpvCodec(ext: string): string | null {
  if (ext === "vtt") {
    return "webvtt";
  }
  if (ext === "srt") {
    return "subrip";
  }
  if (ext === "ass" || ext === "ssa") {
    return "ass";
  }
  return null;
}

/** Attach English and Japanese subtitles during on_load (io.iina.ytdl pattern). */
export function attachSubtitlesInLoadHook(subtitles: ResolvedSubtitle[]): void {
  if (!subtitles.length) {
    return;
  }

  try {
    mpv.set("file-local-options/slang", "en");
  } catch {
    // optional preference for mpv auto-selection
  }

  for (const lang of SUBTITLE_LANG_ORDER) {
    const sub = subtitles.find((entry) => entry.lang === lang);
    if (!sub) {
      continue;
    }

    const source = sub.data
      ? `memory://${sub.data}`
      : sub.url && isSafeURL(sub.url)
        ? sub.url
        : null;
    if (!source) {
      appendLog(`Subtitle skipped (${lang}): no url/data`);
      continue;
    }

    const codec = ytdlCodecToMpvCodec(sub.ext);
    const codecStr = codec ? `,codec=${codec};` : ";";
    const edl = `edl://!no_clip;!delay_open,media_type=sub${codecStr}${edlEscape(source)}`;
    const title = sub.name || lang;

    try {
      mpv.command("sub-add", [edl, "auto", title, lang]);
      appendLog(`Subtitle added: ${lang} (${title})`);
    } catch (err) {
      appendLog(`sub-add failed (${lang}): ${err}`);
    }
  }
}

/** Select English primary and Japanese secondary after the file opens. */
export function ensureSubtitlesSelected(): void {
  try {
    const tracks = core.subtitle.tracks;
    let enId: number | null = null;
    let jaId: number | null = null;

    for (const track of tracks) {
      const lang = (track.lang || "").toLowerCase();
      const title = (track.title || track.formattedTitle || "").toLowerCase();

      if (
        enId === null &&
        (lang === "en" || lang.startsWith("en-") || title.includes("english"))
      ) {
        enId = track.id;
      }
      if (
        jaId === null &&
        (lang === "ja" || lang.startsWith("ja-") || title.includes("japanese"))
      ) {
        jaId = track.id;
      }
    }

    if (enId !== null) {
      core.subtitle.id = enId;
      appendLog(`Primary subtitle: id=${enId}`);
    }
    if (jaId !== null && jaId !== enId) {
      core.subtitle.secondID = jaId;
      appendLog(`Secondary subtitle: id=${jaId}`);
    }
  } catch (err) {
    appendLog(`ensureSubtitlesSelected error: ${err}`);
  }
}