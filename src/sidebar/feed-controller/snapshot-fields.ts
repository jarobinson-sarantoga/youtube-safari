import type { FeedItem, FeedTab } from "../../browse/types";

export interface FeedSnapshotFields {
  shortsContinuation?: string;
  selectedIndex?: number;
}

export function buildSnapshotFields(
  tab: FeedTab,
  items: FeedItem[],
  shortsContinuation: string,
  selectedIndex: number,
  formatCount: (n: number) => string,
  emptyHint: string,
): {
  items: FeedItem[];
  statusText: string;
  emptyHint: string;
  shortsContinuation?: string;
  selectedIndex?: number;
} {
  return {
    items,
    statusText: items.length > 0 ? formatCount(items.length) : "",
    emptyHint,
    shortsContinuation: tab === "shorts" ? shortsContinuation : undefined,
    selectedIndex,
  };
}
