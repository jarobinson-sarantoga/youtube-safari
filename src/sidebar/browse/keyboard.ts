import { $ } from "../dom";
import { getFeedItems, getSelectedIndex, setSelectedIndex } from "../feed-controller";
import { playItem } from "./playback";
import { scrollSelectedIntoView, updateFeedSelection } from "./feed-list";

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

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex(Math.min(feedItems.length - 1, getSelectedIndex() + 1));
      updateFeedSelection();
      scrollSelectedIntoView();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex(Math.max(0, getSelectedIndex() - 1));
      updateFeedSelection();
      scrollSelectedIntoView();
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
    }
  });

  listEl.addEventListener("focus", () => {
    const feedItems = getFeedItems();
    if (!feedItems.length) {
      return;
    }
    if (getSelectedIndex() < 0) {
      setSelectedIndex(0);
    }
    updateFeedSelection();
  });
}
