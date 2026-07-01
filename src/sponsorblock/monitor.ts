import { appendLog } from "../ytdl";
import { seekPlayback } from "../youtube-open";
import type { SponsorSegment } from "./types";

const { core, mpv } = iina;

let activeSegments: SponsorSegment[] = [];
let monitorTimer: ReturnType<typeof setInterval> | null = null;
let lastSkipAt = 0;

const CATEGORY_LABELS: Record<string, string> = {
  sponsor: "Sponsor",
  intro: "Intro",
  outro: "Outro",
  selfpromo: "Self-promo",
  interaction: "Interaction",
  preview: "Preview",
  filler: "Filler",
  music_offtopic: "Music",
};

function findSegmentAt(position: number): SponsorSegment | null {
  for (const segment of activeSegments) {
    if (position >= segment.start && position < segment.end - 0.25) {
      return segment;
    }
  }
  return null;
}

function tick(): void {
  if (!activeSegments.length) {
    return;
  }
  const pos = mpv.getNumber("time-pos") || 0;
  const paused = mpv.getBoolean("pause") || false;
  if (paused || pos <= 0) {
    return;
  }
  const segment = findSegmentAt(pos);
  if (!segment) {
    return;
  }
  const now = Date.now();
  if (now - lastSkipAt < 800) {
    return;
  }
  lastSkipAt = now;
  const label = CATEGORY_LABELS[segment.category] || "Segment";
  appendLog(`SponsorBlock skip ${label}: ${segment.start}s → ${segment.end}s`);
  seekPlayback(segment.end, "sponsorblock");
  core.osd(`Skipped ${label}`);
}

export function startSponsorBlockMonitor(segments: SponsorSegment[]): void {
  stopSponsorBlockMonitor();
  activeSegments = segments;
  if (!segments.length) {
    return;
  }
  monitorTimer = setInterval(tick, 400);
}

export function stopSponsorBlockMonitor(): void {
  if (monitorTimer !== null) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
  activeSegments = [];
  lastSkipAt = 0;
}
