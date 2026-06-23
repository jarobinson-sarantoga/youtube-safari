import { $, formatClock, setPanelHidden } from "../dom";

let lastPosition = 0;
let lastDuration = 0;
let lastPaused = true;
let lastSyncMs = 0;
let tickTimer: ReturnType<typeof setInterval> | null = null;

function paintProgress(position: number, duration: number, paused: boolean): void {
  const block = $("player-progress-block");
  const track = $("progress-track");
  const fill = $("progress-fill");
  const posEl = $("player-time-pos");
  const durEl = $("player-time-dur");

  if (duration <= 0) {
    setPanelHidden(block, true);
    track.removeAttribute("role");
    track.removeAttribute("aria-label");
    track.removeAttribute("aria-valuemin");
    track.removeAttribute("aria-valuemax");
    track.removeAttribute("aria-valuenow");
    return;
  }

  setPanelHidden(block, false);
  const pct = Math.min(100, Math.max(0, (position / duration) * 100));
  fill.style.width = `${pct}%`;
  posEl.textContent = formatClock(position);
  durEl.textContent = formatClock(duration);

  track.setAttribute("role", "progressbar");
  track.setAttribute("aria-label", "Playback progress");
  track.setAttribute("aria-valuemin", "0");
  track.setAttribute("aria-valuemax", String(Math.floor(duration)));
  track.setAttribute("aria-valuenow", String(Math.floor(position)));

  const subEl = $("player-hero-sub");
  subEl.textContent = paused ? "Paused" : "Playing";
}

function stopProgressTick(): void {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

function ensureProgressTick(): void {
  if (tickTimer) {
    return;
  }
  tickTimer = setInterval(() => {
    if (lastPaused || lastDuration <= 0) {
      return;
    }
    const elapsed = (Date.now() - lastSyncMs) / 1000;
    const position = Math.min(lastDuration, lastPosition + elapsed);
    paintProgress(position, lastDuration, lastPaused);
  }, 250);
}

export function updateProgress(position: number, duration: number, paused: boolean): void {
  lastPosition = position;
  lastDuration = duration;
  lastPaused = paused;
  lastSyncMs = Date.now();
  paintProgress(position, duration, paused);

  if (duration > 0 && !paused) {
    ensureProgressTick();
    return;
  }
  stopProgressTick();
}
