export const HISTORY_PATH = "@data/watch-history.json";
export const MAX_ENTRIES = 200;
export const DISK_FLUSH_MS = 250;

export interface HistoryEntry {
  videoId: string;
  watchUrl: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  watchedAt: number;
  positionSeconds?: number;
  durationSeconds?: number;
}

export interface HistoryFile {
  entries: HistoryEntry[];
}

export let skipNextWatchEnd = false;

export function setSkipNextWatchEnd(value: boolean): void {
  skipNextWatchEnd = value;
}
