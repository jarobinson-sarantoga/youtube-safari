import { buildWatchUrlM3U } from "../m3u/build";
import { appendLog } from "../ytdl";
import { youtubeWatchUrl } from "../youtube";
import { getActiveShortsQueue, setActiveShortsQueue } from "./state";
import type { ShortsQueueSource } from "./types";

const { core, mpv } = iina;

export function openShortsQueue(
  videoIds: string[],
  startIndex: number,
  source: ShortsQueueSource,
): boolean {
  const ids = videoIds.filter((id) => id.length > 0);
  if (!ids.length) {
    return false;
  }

  const index = Math.min(Math.max(startIndex, 0), ids.length - 1);
  const entries = ids.map((videoId, i) => ({
    title: `Short ${i + 1}`,
    url: youtubeWatchUrl(videoId),
  }));
  const m3u = buildWatchUrlM3U(entries);

  setActiveShortsQueue(source, ids);
  mpv.set("playlist-start", String(index));
  mpv.set("stream-open-filename", `memory://${m3u}`);
  appendLog(`Opened Shorts queue (${ids.length} items, start ${index})`);
  core.osd(`Shorts (${ids.length})`);

  try {
    core.window.sidebar = "playlist";
  } catch {
    // optional UI hint
  }

  return true;
}

export function appendShortsToQueue(videoIds: string[]): void {
  const active = getActiveShortsQueue();
  if (!active) {
    return;
  }
  for (const videoId of videoIds) {
    if (!active.videoIds.includes(videoId)) {
      active.videoIds.push(videoId);
      mpv.command("loadfile", [youtubeWatchUrl(videoId), "append"]);
    }
  }
}
