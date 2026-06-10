import type { DescriptionChapter } from "./description-chapters";
import { appendLog } from "./ytdl";

const { core, mpv } = iina;

export interface MpvChapterEntry {
  time: number;
  title: string;
}

let pendingMpvChapters: MpvChapterEntry[] = [];

function toMpvChapterList(chapters: DescriptionChapter[]): MpvChapterEntry[] {
  return chapters.map((chapter) => ({
    time: chapter.seconds,
    title: `${chapter.timestamp} ${chapter.label}`,
  }));
}

function logChapterCount(label: string): void {
  try {
    const count = mpv.getNumber("chapter-list/count") || 0;
    appendLog(`mpv chapter-list/count after ${label}: ${count}`);
  } catch (err) {
    appendLog(`mpv chapter-list/count read failed (${label}): ${err}`);
  }
}

function applyChapterList(list: MpvChapterEntry[], label: string): boolean {
  if (!list.length) {
    return false;
  }
  try {
    mpv.set("chapter-list", list);
    appendLog(`Set mpv chapter-list (${label}): ${list.length} chapters`);
    logChapterCount(label);
    return true;
  } catch (err) {
    appendLog(`mpv chapter-list failed (${label}): ${err}`);
    return false;
  }
}

/** Queue chapters for injection in on_preloaded (before IINA snapshots chapter-list). */
export function queueMpvChapters(chapters: DescriptionChapter[]): void {
  if (!chapters.length) {
    pendingMpvChapters = [];
    return;
  }
  pendingMpvChapters = toMpvChapterList(chapters);
}

/** Apply chapters to mpv and ask IINA to refresh its native chapter panel. */
export function refreshNativeChapterPanel(chapters: DescriptionChapter[]): void {
  if (!chapters.length) {
    return;
  }
  const list = toMpvChapterList(chapters);
  if (!applyChapterList(list, "native-refresh")) {
    return;
  }
  try {
    core.getChapters();
  } catch (err) {
    appendLog(`core.getChapters refresh failed: ${err}`);
  }
}

export function registerChapterHooks(): void {
  mpv.addHook("on_preloaded", 10, (next) => {
    if (pendingMpvChapters.length > 0) {
      const list = pendingMpvChapters;
      pendingMpvChapters = [];
      applyChapterList(list, "on_preloaded");
    }
    next();
  });
}

export function logMpvChapterCount(label: string): void {
  logChapterCount(label);
}