import type { FeedItem } from "../../browse/types";
import { getSelectedIndex } from "../feed-controller";
import { createFeedRow } from "../feed-row";
import { createShortsGridCard } from "../feed-row/shorts-grid";
import { handleRowPlay } from "./feed-list-helpers";
import { sectionLabel } from "./ui";

interface AppendRowsOptions {
  listEl: HTMLElement;
  feedItems: FeedItem[];
  grid: boolean;
  listbox: boolean;
  portrait: boolean;
  showSectionHeaders: boolean;
}

export function appendFeedListRows(options: AppendRowsOptions): void {
  const { listEl, feedItems, grid, listbox, portrait, showSectionHeaders } = options;
  let lastSection = "";

  feedItems.forEach((item, index) => {
    if (showSectionHeaders && item.sectionId && item.sectionId !== lastSection) {
      lastSection = item.sectionId;
      const header = document.createElement("div");
      header.className = "feed-section-header";
      header.textContent = sectionLabel(item.sectionId);
      listEl.appendChild(header);
    }

    if (grid) {
      listEl.appendChild(
        createShortsGridCard({
          item,
          index,
          selected: index === getSelectedIndex(),
          onClick: (clickedItem, clickedIndex) => handleRowPlay(clickedItem, clickedIndex, listEl),
        }),
      );
      return;
    }

    listEl.appendChild(
      createFeedRow({
        item,
        index,
        selected: index === getSelectedIndex(),
        portrait,
        listboxOption: listbox,
        showBackgroundPlay: true,
        onClick: (clickedItem, clickedIndex) => handleRowPlay(clickedItem, clickedIndex, listEl),
        onBackgroundPlay: (clickedItem, clickedIndex) =>
          handleRowPlay(clickedItem, clickedIndex, listEl, true),
      }),
    );
  });
}
