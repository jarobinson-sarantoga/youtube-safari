import { getFeedItems, getSelectedIndex, setSelectedIndex } from "../feed-controller";
import {
  computeGridSelectionIndex,
  computeListSelectionIndex,
} from "./grid-nav";
import { scrollSelectedIntoView, updateFeedSelection } from "./feed-list";

export function moveFeedSelection(delta: number): void {
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

export function moveFeedGridSelection(rowDelta: number, colDelta: number): void {
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
