import { $ } from "../dom";
import { getActiveTab, getFeedItems, getSelectedIndex, setSelectedIndex } from "../feed-controller";
import { playItem } from "./playback";
import { getShortsLayout } from "./shorts-layout";
import { scrollSelectedIntoView, updateFeedSelection } from "./feed-list";

const SHORTS_GRID_COLUMNS = 2;

function moveSelection(delta: number): void {
  const feedItems = getFeedItems();
  if (!feedItems.length) {
    return;
  }
  setSelectedIndex(Math.min(feedItems.length - 1, Math.max(0, getSelectedIndex() + delta)));
  updateFeedSelection();
  scrollSelectedIntoView();
}

function moveGridSelection(rowDelta: number, colDelta: number): void {
  const feedItems = getFeedItems();
  if (!feedItems.length) {
    return;
  }
  const current = getSelectedIndex();
  const row = Math.floor(current / SHORTS_GRID_COLUMNS);
  const col = current % SHORTS_GRID_COLUMNS;
  const nextRow = row + rowDelta;
  const nextCol = col + colDelta;
  if (nextCol < 0 || nextCol >= SHORTS_GRID_COLUMNS) {
    return;
  }
  const nextIndex = nextRow * SHORTS_GRID_COLUMNS + nextCol;
  if (nextIndex < 0 || nextIndex >= feedItems.length) {
    return;
  }
  setSelectedIndex(nextIndex);
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
