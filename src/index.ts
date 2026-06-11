import {
  attachAudioInLoadHook,
  clearQueuedAudio,
  queueAudioTrack,
} from "./audio-track";
import { applyStreamHeaders } from "./headers";
import {
  initQualityUI,
  registerFileLoadedRefresh,
  scheduleRefreshQualityUI,
  saveWatchUrl,
} from "./quality-ui";
import { queueMpvChapters, registerChapterHooks } from "./chapters-mpv";
import { attachSubtitlesInLoadHook } from "./subtitles";
import { openYouTubePlaylist } from "./playlist";
import { openLinkedUrl, peekPendingSeek, setPendingSeek } from "./youtube-open";
import {
  isGoogleVideoURL,
  getYouTubePlaylistId,
  isYouTubePlaylistURL,
  isYouTubeWatchURL,
  normalizeMediaURL,
  parseYouTubeTimestamp,
} from "./youtube";
import { installBrowse } from "./browse/init";
import { appendLog, extractYouTube, type ResolvedStream } from "./ytdl";

const { core, console, event, global, menu, mpv, preferences } = iina;

const SAFE_PROTOCOLS = new Set(["http", "https"]);

function isSafeURL(url: string): boolean {
  const match = url.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);
  if (!match) {
    return false;
  }
  return SAFE_PROTOCOLS.has(match[1].toLowerCase());
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

async function handleLoad(next?: () => void): Promise<void> {
  const rawUrl = mpv.getString("stream-open-filename");
  const url = normalizeMediaURL(rawUrl);
  appendLog(`on_load hook: ${rawUrl}`);
  appendLog(`normalized: ${url} youtube=${isYouTubeWatchURL(rawUrl)} googlevideo=${isGoogleVideoURL(rawUrl)}`);

  if (isGoogleVideoURL(rawUrl)) {
    appendLog("googlevideo pass-through (headers only)");
    applyStreamHeaders();
    next?.();
    return;
  }

  if (isYouTubeWatchURL(rawUrl)) {
    const startSeconds = parseYouTubeTimestamp(url);

    if (isYouTubePlaylistURL(url)) {
      appendLog(`Playlist URL detected (list=${getYouTubePlaylistId(url)})`);
      core.osd("Loading YouTube playlist…");
      try {
        await openYouTubePlaylist(url, startSeconds);
        next?.();
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

    core.osd("Resolving YouTube…");
    try {
      const resolved = await extractYouTube(url);
      if (resolved && isSafeURL(resolved.videoUrl)) {
        applyResolvedStream(resolved);
        saveWatchUrl(url, resolved.title, resolved.description, resolved.chapters);
        scheduleRefreshQualityUI();
      } else {
        appendLog("Extraction returned no safe playable URL");
        console.error("YouTube Safari: no playable stream URL");
        core.osd("YouTube failed — Plugin → Refresh Safari Cookies");
        mpv.set("stream-open-filename", "null://");
      }
    } catch (err) {
      appendLog(`Extraction error: ${err}`);
      console.error(`YouTube Safari extraction failed: ${err}`);
      core.osd("YouTube resolution failed");
      mpv.set("stream-open-filename", "null://");
    }
  }

  next?.();
}

const tryFirst = preferences.get("try_ytdl_first") !== false;
const hookName = tryFirst ? "on_load" : "on_load_fail";

// Register load hooks before ANY menu/sidebar init — menu work during init has
// crashed IINA (MenuController.updatePluginMenu) and prevented hook registration.
mpv.addHook(hookName, 15, handleLoad);
mpv.addHook(hookName === "on_load" ? "on_load_fail" : "on_load", 14, handleLoad);
appendLog(`Player plugin loaded (${hookName} @ priority 15)`);
console.log(`YouTube (Safari Cookies) registered ${hookName} @ priority 15`);

registerChapterHooks();

registerFileLoadedRefresh(event);
initQualityUI();

global.onMessage("openYouTubeWatch", (data: { url?: string }) => {
  const url = data?.url;
  if (typeof url === "string" && url.trim()) {
    openLinkedUrl(url.trim());
  }
});

installBrowse();
global.postMessage("playerReady", {});