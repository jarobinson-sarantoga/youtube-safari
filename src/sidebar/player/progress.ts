import { $, formatClock } from "../dom";

export function updateProgress(position: number, duration: number, paused: boolean): void {
  const block = $("player-progress-block");
  const track = $("progress-track");
  const fill = $("progress-fill");
  const posEl = $("player-time-pos");
  const durEl = $("player-time-dur");

  if (duration <= 0) {
    block.classList.add("hidden");
    track.removeAttribute("role");
    track.removeAttribute("aria-label");
    track.removeAttribute("aria-valuemin");
    track.removeAttribute("aria-valuemax");
    track.removeAttribute("aria-valuenow");
    return;
  }

  block.classList.remove("hidden");
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
