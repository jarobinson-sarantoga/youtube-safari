import type { FeedItem } from "../../types";
import { getBlocklistData, writeBlocklist } from "./storage";
import { MAX_BLOCKED } from "./types";

export { flushBlocklist } from "./storage";

export function isChannelBlocked(channelId: string | undefined): boolean {
  if (!channelId) {
    return false;
  }
  return getBlocklistData().channels.some((c) => c.channelId === channelId);
}

export function blockChannel(item: FeedItem): boolean {
  const channelId = item.channelId || item.channelTitle;
  if (!channelId) {
    return false;
  }
  const data = getBlocklistData();
  if (data.channels.some((c) => c.channelId === channelId)) {
    return false;
  }
  data.channels.unshift({
    channelId,
    channelTitle: item.channelTitle,
    blockedAt: Date.now(),
  });
  if (data.channels.length > MAX_BLOCKED) {
    data.channels.length = MAX_BLOCKED;
  }
  writeBlocklist(data);
  return true;
}

export function unblockChannel(channelId: string): boolean {
  const data = getBlocklistData();
  const before = data.channels.length;
  data.channels = data.channels.filter((c) => c.channelId !== channelId);
  if (data.channels.length === before) {
    return false;
  }
  writeBlocklist(data);
  return true;
}

export function filterBlockedItems(items: FeedItem[]): FeedItem[] {
  const blocked = new Set(getBlocklistData().channels.map((c) => c.channelId));
  return items.filter((item) => {
    const id = item.channelId || item.channelTitle;
    return !blocked.has(id);
  });
}
