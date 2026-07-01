/** Browse feed keyboard: search focus shortcut, list/grid navigation, play keys.
 *  @see keyboard-move.ts — selection delta helpers
 *  @see grid-nav.ts — pure grid index math
 */
import { $ } from "../dom";
import { getActiveTab, getFeedItems, getSelectedIndex, setSelectedIndex } from "../feed-controller";
import { playItem } from "./playback";
import { getShortsLayout } from "./shorts-layout";
import { moveFeedGridSelection, moveFeedSelection } from "./keyboard-move";
import { scrollSelectedIntoView, updateFeedSelection } from "./feed-list";
import { postToPlugin } from "../messaging";

export function setupBrowseKeyboard(): void {
  const listEl = $("feed-list");

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== $("search-input")) {
      event.preventDefault();
      ($("search-input") as HTMLInputElement).focus();
      return;
    }
    if (document.activeElement === $("search-input") || document.activeElement !== listEl) {
      return;
    }

    const feedItems = getFeedItems();
    if (!feedItems.length) {
      return;
    }

    const selected = feedItems[getSelectedIndex()];
    if (
      (event.key === "w" || event.key === "W") &&
      selected &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      event.preventDefault();
      postToPlugin("libraryAction", { action: "toggleWatchLater", item: selected });
      return;
    }
    if (
      (event.key === "q" || event.key === "Q") &&
      selected &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      event.preventDefault();
      postToPlugin("libraryAction", { action: "addQueue", item: selected });
      return;
    }

    const grid = getActiveTab() === "shorts" && getShortsLayout() === "grid";

    if (grid && event.key === "ArrowRight") {
      event.preventDefault();
      moveFeedGridSelection(0, 1);
    } else if (grid && event.key === "ArrowLeft") {
      event.preventDefault();
      moveFeedGridSelection(0, -1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (grid) {
        moveFeedGridSelection(1, 0);
      } else {
        moveFeedSelection(1);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (grid) {
        moveFeedGridSelection(-1, 0);
      } else {
        moveFeedSelection(-1);
      }
    } else if (event.key === "Home") {
      event.preventDefault();
      setSelectedIndex(0);
      updateFeedSelection();
      scrollSelectedIntoView();
    } else if (event.key === "End") {
      event.preventDefault();
      setSelectedIndex(feedItems.length - 1);
      updateFeedSelection();
      scrollSelectedIntoView();
    } else if (
      (event.key === "l" || event.key === "L") &&
      getSelectedIndex() >= 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      event.preventDefault();
      playItem(feedItems[getSelectedIndex()], { background: true });
    } else if (event.key === "Enter" && getSelectedIndex() >= 0) {
      event.preventDefault();
      playItem(feedItems[getSelectedIndex()]);
    } else if (event.key === " " && getSelectedIndex() >= 0) {
      event.preventDefault();
      playItem(feedItems[getSelectedIndex()]);
    }
  });

  listEl.addEventListener("focus", () => {
    const items = getFeedItems();
    if (!items.length) {
      return;
    }
    if (getSelectedIndex() < 0) {
      setSelectedIndex(0);
    }
    updateFeedSelection();
  });
}
