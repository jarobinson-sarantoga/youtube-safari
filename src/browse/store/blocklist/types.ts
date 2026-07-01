export const BLOCKLIST_PATH = "@data/blocked-channels.json";
export const MAX_BLOCKED = 1000;

export interface BlockedChannel {
  channelId: string;
  channelTitle: string;
  blockedAt: number;
}

export interface BlocklistFile {
  channels: BlockedChannel[];
}
