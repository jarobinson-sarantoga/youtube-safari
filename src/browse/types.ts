/** A single video row in browse feeds. */
export interface FeedItem {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId?: string;
  thumbnailUrl: string;
  publishedAt?: string;
  durationLabel?: string;
  /** Resume position in seconds (history / continue watching). */
  resumeSeconds?: number;
  /** Section grouping for subscriptions feed. */
  sectionId?: string;
}

export type FeedTab =
  | "home"
  | "subscriptions"
  | "related"
  | "history"
  | "search";

export type SubsFilter = "all" | "shorts";

export interface FeedResult {
  tab: FeedTab;
  items: FeedItem[];
  error?: string;
  emptyHint?: string;
}