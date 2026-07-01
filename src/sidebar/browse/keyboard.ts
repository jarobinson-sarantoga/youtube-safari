import { $ } from "../dom";
import { getActiveTab, getFeedItems, getSelectedIndex, setSelectedIndex } from "../feed-controller";
import { playItem } from "./playback";
import { getShortsLayout } from "./shorts-layout";
import {
  computeGridSelectionIndex,
  computeListSelectionIndex,
} from "./grid-nav";
import { scrollSelectedIntoView, updateFeedSelection } from "./feed-list";

function moveSelection(delta: number): void {
  const feedItems = getFeedItems();
  if (!feedItems.length) {
    return;
  }
  setSelectedIndex(
    computeListSelectionIndex(getSelectedIndex(), delta, feedItems.length),
  );
  updateFeedSelection();
  scrollSelectedIntoView();
}

function moveGridSelection(rowDelta: number, colDelta: number): void {
  const feedItems = getFeedItems();
  if (!feedItems.length) {
    return;
  }
  const next = computeGridSelectionIndex(
    getSelectedIndex(),
    rowDelta,
    colDelta,
    feedItems.length,
  );
  if (next === null) {
    return;
  }
  setSelectedIndex(next);
  updateFeedSelection();
  scrollSelectedIntoView();
}

export function setupBrowseKeyboard(): void {
  const listEl = $("feed-list");

  document.addEventListener("keydown", (event) => {
    if (
      (event.key === "/" || (event.key === "f" && event.metaKey)) &&
      document.activeElement !== $("search-input")
    ) {
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

    const grid = getActiveTab() === "shorts" && getShortsLayout() === "grid";

    if (grid && event.key === "ArrowRight") {
      event.preventDefault();
      moveGridSelection(0, 1);
    } else if (grid && event.key === "ArrowLeft") {
      event.preventDefault();
      moveGridSelection(0, -1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (grid) {
        moveGridSelection(1, 0);
      } else {
        moveSelection(1);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (grid) {
        moveGridSelection(-1, 0);
      } else {
        moveSelection(-1);
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
