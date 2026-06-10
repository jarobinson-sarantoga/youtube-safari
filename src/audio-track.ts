import { appendLog } from "./ytdl";

const { core, mpv } = iina;

let pendingAudioUrl: string | null = null;

export function queueAudioTrack(url: string | null): void {
  pendingAudioUrl = url;
}

export function clearQueuedAudio(): void {
  pendingAudioUrl = null;
}

/** Attach DASH audio during on_load, before the video URL redirect (io.iina.ytdl pattern). */
export function attachAudioInLoadHook(audioUrl: string): void {
  mpv.command("audio-add", [audioUrl, "auto", "YouTube audio"]);
  appendLog("External audio track added via audio-add (auto)");
}

/** Select or load external audio after the file opens. */
export function ensureExternalAudioSelected(): void {
  const audioUrl = pendingAudioUrl;
  if (!audioUrl) {
    return;
  }

  try {
    const tracks = core.audio.tracks;
    for (let i = tracks.length - 1; i >= 0; i--) {
      const track = tracks[i];
      if (track.isExternal) {
        if (!track.isSelected) {
          core.audio.id = track.id;
        }
        appendLog(`External audio track id=${track.id} selected=${track.isSelected || core.audio.id === track.id}`);
        pendingAudioUrl = null;
        return;
      }
    }

    core.audio.loadTrack(audioUrl);
    for (const track of core.audio.tracks) {
      if (track.isExternal) {
        core.audio.id = track.id;
        appendLog(`External audio loaded on file-loaded id=${track.id}`);
        break;
      }
    }
    pendingAudioUrl = null;
  } catch (err) {
    appendLog(`ensureExternalAudioSelected error: ${err}`);
  }
}