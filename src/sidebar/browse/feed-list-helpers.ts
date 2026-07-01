import type { FeedItem } from "../../browse/types";
import {
  getActiveTab,
  getShortsContinuation,
  isShortsLoadingMore,
  requestLoadMoreShorts,
  setSelectedIndex,
} from "../feed-controller";
import { feedListA11y, usePortraitRows } from "./feed-list-role";
import { playItem } from "./playback";
import { updateFeedSelection } from "./feed-list-selection";

export { feedListA11y, usePortraitRows };

export function syncFeedListRole(
  listEl: HTMLElement,
  grid: boolean,
  listbox: boolean,
): void {
  const { role, label } = feedListA11y(grid, listbox);
  listEl.setAttribute("role", role);
  listEl.setAttribute("aria-label", label);
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
