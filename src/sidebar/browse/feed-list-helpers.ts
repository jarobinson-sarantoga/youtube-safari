import type { FeedItem } from "../../browse/types";
import {
  getActiveTab,
  getShortsContinuation,
  isShortsLoadingMore,
  requestLoadMoreShorts,
  setSelectedIndex,
} from "../feed-controller";
import { playItem } from "./playback";
import { updateFeedSelection } from "./feed-list-selection";

export function usePortraitRows(
  tab: ReturnType<typeof getActiveTab>,
  subsFilter: string,
): boolean {
  return tab === "shorts" || (tab === "subscriptions" && subsFilter === "shorts");
}

export function syncFeedListRole(
  listEl: HTMLElement,
  grid: boolean,
  listbox: boolean,
): void {
  if (grid) {
    listEl.setAttribute("role", "grid");
    listEl.setAttribute("aria-label", "Shorts feed");
    return;
  }
  if (listbox) {
    listEl.setAttribute("role", "listbox");
    listEl.setAttribute("aria-label", "Video feed");
    return;
  }
  listEl.setAttribute("role", "grid");
  listEl.setAttribute("aria-label", "Video feed");
}

export function handleRowPlay(
  item: FeedItem,
  index: number,
  listEl: HTMLElement,
  background = false,
): void {
  setSelectedIndex(index);
  updateFeedSelection();
  listEl.focus();
  playItem(item, { background });
}

export function syncFeedListTabindex(listEl: HTMLElement, interactive: boolean): void {
  listEl.tabIndex = interactive ? 0 : -1;
}

export function appendLoadMoreButton(listEl: HTMLElement): void {
  if (getActiveTab() !== "shorts" || !getShortsContinuation()) {
    return;
  }
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "feed-load-more";
  btn.textContent = isShortsLoadingMore() ? "Loading…" : "Load more Shorts";
  btn.disabled = isShortsLoadingMore();
  btn.addEventListener("click", () => requestLoadMoreShorts());
  listEl.appendChild(btn);
}
