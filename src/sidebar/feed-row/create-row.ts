import { createFeedMeta } from "./meta";
import { createThumbnail } from "./thumbnail";
import type { FeedRowOptions } from "./types";

export function createFeedRow(options: FeedRowOptions): HTMLElement {
  const {
    item,
    index = -1,
    selected = false,
    rowClassName = "feed-row",
    rowIdPrefix = "feed",
    showDuration = true,
    showResume = true,
    showExtra = true,
    showBackgroundPlay = false,
    onClick,
    onBackgroundPlay,
  } = options;

  const row = document.createElement("div");
  row.className = `${rowClassName}${selected ? " selected" : ""}`;
  row.setAttribute("role", "option");
  row.tabIndex = -1;
  row.setAttribute("aria-label", item.title);
  if (index >= 0) {
    row.dataset.index = String(index);
    row.id = `${rowIdPrefix}-row-${index}`;
  }

  row.appendChild(
    createThumbnail({
      item,
      index,
      showDuration,
      showResume,
      showBackgroundPlay,
      onBackgroundPlay,
    }),
  );
  row.appendChild(createFeedMeta({ item, showExtra }));

  row.addEventListener("click", () => {
    onClick(item, index);
  });

  return row;
}
