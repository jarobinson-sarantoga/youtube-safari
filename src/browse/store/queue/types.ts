export const QUEUE_PATH = "@data/play-queue.json";
export const MAX_QUEUE = 200;

export interface QueueEntry {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId?: string;
  thumbnailUrl: string;
  addedAt: number;
  durationLabel?: string;
}

export interface QueueFile {
  entries: QueueEntry[];
}
