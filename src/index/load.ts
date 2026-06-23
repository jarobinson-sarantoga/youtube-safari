import {
  attachAudioInLoadHook,
  clearQueuedAudio,
  queueAudioTrack,
} from "../audio-track";
import { applyStreamHeaders } from "../headers";
import { queueMpvChapters } from "../chapters-mpv";
import { attachSubtitlesInLoadHook } from "../subtitles";
import { openYouTubePlaylist } from "../playlist";
import { peekPendingSeek, setPendingSeek } from "../youtube-open";
import {
  getYouTubePlaylistId,
  isGoogleVideoURL,
  isYouTubePlaylistURL,
  isYouTubeWatchURL,
  normalizeMediaURL,
  parseYouTubeTimestamp,
} from "../youtube";
import { isBackgroundHidePending, rehideBackgroundPlayer } from "../background-play";
import { isShuttingDown } from "../lifecycle";
import { saveWatchUrl, scheduleRefreshQualityUI } from "../quality-ui";
import { appendLog, extractYouTube, type ResolvedStream } from "../ytdl";

const { core, console, mpv } = iina;

const SAFE_PROTOCOLS = new Set(["http", "https"]);

function isSafeURL(url: string): boolean {
  const match = url.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);
  return !!match && SAFE_PROTOCOLS.has(match[1].toLowerCase());
}

/** Apply resolved stream URLs and metadata to mpv (shared by on_load hook). */
export function applyResolvedStream(resolved: ResolvedStream): void {
  applyStreamHeaders(resolved.headers);
  clearQueuedAudio();

  if (resolved.audioUrl && isSafeURL(resolved.audioUrl)) {
    queueAudioTrack(resolved.audioUrl);
    attachAudioInLoadHook(resolved.audioUrl);
  }

  const startAt = peekPendingSeek();
  if (startAt !== null) {
    mpv.set("file-local-options/start", String(startAt));
    appendLog(`Set file-local-options/start=${startAt}`);
  }

  queueMpvChapters(resolved.chapters);
  mpv.set("stream-open-filename", resolved.videoUrl);
  mpv.set("file-local-options/force-media-title", resolved.title);
  attachSubtitlesInLoadHook(resolved.subtitles);
  appendLog(`Opened: ${resolved.title}`);
}

export async function handleLoadCore(isBackgroundPlayback: () => boolean): Promise<void> {
  const rawUrl = mpv.getString("stream-open-filename");
  const url = normalizeMediaURL(rawUrl);
  appendLog(`on_load hook: ${rawUrl}`);
  appendLog(
    `normalized: ${url} youtube=${isYouTubeWatchURL(rawUrl)} googlevideo=${isGoogleVideoURL(rawUrl)}`,
  );

  if (isGoogleVideoURL(rawUrl)) {
    appendLog("googlevideo pass-through (headers only)");
    applyStreamHeaders();
    return;
  }

  if (!isYouTubeWatchURL(rawUrl)) {
    return;
  }

  const startSeconds = parseYouTubeTimestamp(url);

  if (isYouTubePlaylistURL(url)) {
    appendLog(`Playlist URL detected (list=${getYouTubePlaylistId(url)})`);
    core.osd("Loading YouTube playlist…");
    try {
      await openYouTubePlaylist(url, startSeconds);
      return;
    } catch (err) {
      appendLog(`Playlist load failed: ${err}`);
      core.osd("Playlist load failed — opening video");
      if (startSeconds !== null) {
        setPendingSeek(startSeconds);
      }
    }
  } else if (startSeconds !== null) {
    setPendingSeek(startSeconds);
  }

  if (isShuttingDown()) {
    appendLog("on_load aborted before resolve: player shutting down");
    mpv.set("stream-open-filename", "null://");
    return;
  }

  core.osd("Resolving YouTube…");
  try {
    const resolved = await extractYouTube(url);
    if (isShuttingDown()) {
      appendLog("on_load resolve aborted: player shutting down");
      mpv.set("stream-open-filename", "null://");
      return;
    }
    if (resolved && isSafeURL(resolved.videoUrl)) {
      applyResolvedStream(resolved);
      if (isBackgroundPlayback() && isBackgroundHidePending()) {
        rehideBackgroundPlayer("after-resolve");
      }
      saveWatchUrl(url, resolved.title, resolved.description, resolved.chapters);
      scheduleRefreshQualityUI();
      return;
    }
    appendLog("Extraction returned no safe playable URL");
    console.error("YouTube Safari: no playable stream URL");
    core.osd("YouTube failed — Plugin → Refresh YouTube");
    mpv.set("stream-open-filename", "null://");
  } catch (err) {
    appendLog(`Extraction error: ${err}`);
    console.error(`YouTube Safari extraction failed: ${err}`);
    core.osd("YouTube resolution failed");
    mpv.set("stream-open-filename", "null://");
  }
}
