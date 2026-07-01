import type { FeedResultMessage } from "../browse/messages";
import type { FeedItem, FeedTab, SubsFilter } from "../browse/types";

const FEED_TABS = new Set<FeedTab>([
  "home",
  "shorts",
  "subscriptions",
  "related",
  "history",
  "search",
  "later",
  "queue",
]);

const SUBS_FILTERS = new Set<SubsFilter>(["all", "shorts"]);

/** Minimal shape check for a single feed row. */
export function isFeedItem(value: unknown): value is FeedItem {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.videoId === "string" &&
    item.videoId.length > 0 &&
    typeof item.title === "string" &&
    typeof item.channelTitle === "string" &&
    typeof item.thumbnailUrl === "string" &&
    (item.isShort === undefined || typeof item.isShort === "boolean")
  );
}

/** Minimal validation for plugin → sidebar feedResult payloads. */
export function parseFeedResult(raw: unknown): FeedResultMessage | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const tab = data.tab;
  if (typeof tab !== "string" || !FEED_TABS.has(tab as FeedTab)) {
    return null;
  }

  if (!Array.isArray(data.items)) {
    return null;
  }

  const items = data.items.filter(isFeedItem);
  const subsFilter = data.subsFilter;
  const parsedSubsFilter =
    typeof subsFilter === "string" && SUBS_FILTERS.has(subsFilter as SubsFilter)
      ? (subsFilter as SubsFilter)
      : undefined;

  return {
    tab: tab as FeedTab,
    items,
    error: typeof data.error === "string" ? data.error : undefined,
    emptyHint: typeof data.emptyHint === "string" ? data.emptyHint : undefined,
    subsFilter: parsedSubsFilter,
    requestId: typeof data.requestId === "number" ? data.requestId : undefined,
    query: typeof data.query === "string" ? data.query : undefined,
    continuation:
      typeof data.continuation === "string" ? data.continuation : undefined,
    append: data.append === true ? true : undefined,
  };
}