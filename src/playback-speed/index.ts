import { appendLog } from "../ytdl";
import { PLAYBACK_SPEED_OPTIONS } from "../shared/playback-speed-options";

const { mpv } = iina;

const ALLOWED_SPEEDS = [...PLAYBACK_SPEED_OPTIONS];

export function normalizePlaybackSpeed(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  let closest = ALLOWED_SPEEDS[0];
  let minDiff = Math.abs(value - closest);
  for (const speed of ALLOWED_SPEEDS) {
    const diff = Math.abs(value - speed);
    if (diff < minDiff) {
      closest = speed;
      minDiff = diff;
    }
  }
  return closest;
}

export function setPlaybackSpeed(speed: number): number {
  const normalized = normalizePlaybackSpeed(speed);
  try {
    mpv.set("speed", String(normalized));
    appendLog(`Playback speed set to ${normalized}x`);
  } catch (err) {
    appendLog(`setPlaybackSpeed failed: ${err}`);
  }
  return normalized;
}

export function getPlaybackSpeed(): number {
  try {
    return mpv.getNumber("speed") || 1;
  } catch {
    return 1;
  }
}

export const PLAYBACK_SPEED_OPTIONS = ALLOWED_SPEEDS;