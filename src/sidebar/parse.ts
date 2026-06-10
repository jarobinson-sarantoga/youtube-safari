import type { PanelPayload } from "../sidebar-state";
import { DEFAULT_QUALITY_OPTIONS } from "../sidebar-state";

export { isFeedItem, parseFeedResult } from "./parse-core";

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