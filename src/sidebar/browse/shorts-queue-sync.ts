import {
  getActiveSubsFilter,
  getActiveTab,
  getFeedItems,
  getSelectedIndex,
  setSelectedIndex,
} from "../feed-controller";
import { scrollSelectedIntoView, updateFeedSelection } from "./feed-list";

export function handleShortsQueueState(raw: unknown): void {
  const data = raw as {
    videoId?: string;
    index?: number;
    source?: "shorts" | "subs-shorts";
  } | null;
  if (!data || typeof data.index !== "number" || data.index < 0) {
    return;
  }

  const tab = getActiveTab();
  const filter = getActiveSubsFilter();
  if (data.source === "shorts" && tab !== "shorts") {
    return;
  }
  if (data.source === "subs-shorts" && !(tab === "subscriptions" && filter === "shorts")) {
    return;
  }

  const items = getFeedItems();
  let index = typeof data.videoId === "string"
    ? items.findIndex((item) => item.videoId === data.videoId)
    : -1;
  if (index < 0) {
    index = data.index;
  }
  if (index < 0 || index >= items.length || index === getSelectedIndex()) {
    return;
  }

  setSelectedIndex(index);
  updateFeedSelection();
  scrollSelectedIntoView();
}
