export const WATCH_LATER_PATH = "@data/watch-later.json";
export const MAX_WATCH_LATER = 500;

export interface WatchLaterEntry {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId?: string;
  thumbnailUrl: string;
  addedAt: number;
  durationLabel?: string;
}

export interface WatchLaterFile {
  entries: WatchLaterEntry[];
}
