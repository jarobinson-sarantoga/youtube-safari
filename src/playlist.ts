import {
  getYouTubeVideoId,
  normalizeMediaURL,
} from "./youtube";
import { setPendingSeek } from "./youtube-open";
import { appendLog, listYouTubePlaylist, type PlaylistEntry } from "./ytdl";

const { core, mpv } = iina;

function sanitizeM3UTitle(title: string): string {
  return title.replace(/[\r\n]+/g, " ").trim() || "YouTube";
}

/** Use a single-video watch URL so playlist navigation does not re-fetch the list. */
function videoOnlyWatchUrl(url: string): string {
  const id = getYouTubeVideoId(url);
  if (id) {
    return `https://www.youtube.com/watch?v=${id}`;
  }
  return normalizeMediaURL(url);
}

/** Build an in-memory M3U playlist (io.iina.ytdl pattern). */
export function buildPlaylistM3U(entries: PlaylistEntry[]): string {
  const lines = ["#EXTM3U"];
  for (const entry of entries) {
    lines.push(`#EXTINF:0,${sanitizeM3UTitle(entry.title)}`);
    lines.push(videoOnlyWatchUrl(entry.url));
  }
  return lines.join("\n");
}

/** Redirect on_load to a memory M3U so IINA's playlist tab lists every video. */
export async function openYouTubePlaylist(
  url: string,
  startSeconds: number | null,
): Promise<boolean> {
  const data = await listYouTubePlaylist(url);
  if (!data.entries.length) {
    throw new Error("playlist has no entries");
  }

  const targetId = getYouTubeVideoId(url);
  let startIndex = 0;
  if (targetId) {
    const matchIndex = data.entries.findIndex((entry) => entry.id === targetId);
    if (matchIndex >= 0) {
      startIndex = matchIndex;
    }
  }

  if (startSeconds !== null) {
    setPendingSeek(startSeconds);
  }

  const m3u = buildPlaylistM3U(data.entries);
  mpv.set("playlist-start", String(startIndex));
  mpv.set("stream-open-filename", `memory://${m3u}`);
  appendLog(
    `Opened playlist "${data.title}" (${data.entries.length} entries, start index ${startIndex})`,
  );
  core.osd(`${data.title} (${data.entries.length} videos)`);

  try {
    core.window.sidebar = "playlist";
  } catch {
    // optional UI hint
  }

  return true;
}