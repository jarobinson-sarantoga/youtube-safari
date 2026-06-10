import type { FeedResultMessage } from "../browse/messages";
import type { FeedItem, FeedTab, SubsFilter } from "../browse/types";
import { DEFAULT_QUALITY_OPTIONS } from "../sidebar-state";
import type { PanelPayload } from "../sidebar-state";

const FEED_TABS = new Set<FeedTab>([
  "home",
  "subscriptions",
  "related",
  "history",
  "search",
]);

const SUBS_FILTERS = new Set<SubsFilter>(["all", "shorts"]);

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

  const subsFilter = data.subsFilter;
  const parsedSubsFilter =
    typeof subsFilter === "string" && SUBS_FILTERS.has(subsFilter as SubsFilter)
      ? (subsFilter as SubsFilter)
      : undefined;

  return {
    tab: tab as FeedTab,
    items: data.items as FeedItem[],
    error: typeof data.error === "string" ? data.error : undefined,
    emptyHint: typeof data.emptyHint === "string" ? data.emptyHint : undefined,
    subsFilter: parsedSubsFilter,
    requestId: typeof data.requestId === "number" ? data.requestId : undefined,
  };
}

/** Minimal validation for plugin → sidebar panel payloads. */
export function parsePanelPayload(raw: unknown): PanelPayload | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.items)) {
    return null;
  }

  return {
    items: data.items.length
      ? (data.items as PanelPayload["items"])
      : DEFAULT_QUALITY_OPTIONS,
    selected: typeof data.selected === "number" ? data.selected : 0,
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : "",
    chapters: Array.isArray(data.chapters) ? (data.chapters as PanelPayload["chapters"]) : [],
    loading: !!data.loading,
    watchUrl: typeof data.watchUrl === "string" ? data.watchUrl : undefined,
    error: typeof data.error === "string" ? data.error : undefined,
  };
}