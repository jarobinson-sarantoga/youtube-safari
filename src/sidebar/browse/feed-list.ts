/** Feed list render orchestrator — empty states, rows, load-more.
 *  @see feed-list-empty.ts, feed-list-rows.ts, feed-list-helpers.ts
 */
import { $ } from "../dom";
import {
  getActiveSubsFilter,
  getActiveTab,
  getFeedItems,
} from "../feed-controller";
import { setFeedBusy, setFeedRefreshSpinning, setSearchBusy } from "./ui";
import { renderFeedListEmpty } from "./feed-list-empty";
import { appendFeedListRows } from "./feed-list-rows";
import {
  appendLoadMoreButton,
  syncFeedListRole,
  syncFeedListTabindex,
  usePortraitRows,
} from "./feed-list-helpers";
import { applyShortsLayoutClass, getShortsLayout } from "./shorts-layout";
import { scrollSelectedIntoView, updateFeedSelection } from "./feed-list-selection";

export { scrollSelectedIntoView, updateFeedSelection };

export function renderFeedList(): void {
  const listEl = $("feed-list");
  const feedItems = getFeedItems();
  const tab = getActiveTab();
  const subsFilter = getActiveSubsFilter();
  const grid = tab === "shorts" && getShortsLayout() === "grid";
  const listbox = tab === "shorts" && !grid;

  listEl.innerHTML = "";
  applyShortsLayoutClass(listEl, tab);
  syncFeedListRole(listEl, grid, listbox);
  setFeedRefreshSpinning(false);

  if (!feedItems.length) {
    setFeedBusy(false);
    setSearchBusy(false);
    renderFeedListEmpty(listEl);
    return;
  }

  setFeedBusy(false);
  setSearchBusy(false);
  syncFeedListTabindex(listEl, true);

  appendFeedListRows({
    listEl,
    feedItems,
    grid,
    listbox,
    portrait: usePortraitRows(tab, subsFilter),
    showSectionHeaders: tab === "subscriptions" && subsFilter === "all",
  });

  appendLoadMoreButton(listEl);
  updateFeedSelection();
}
