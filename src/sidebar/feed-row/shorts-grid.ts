import type { FeedItem } from "../../browse/types";
import { createThumbnail } from "./thumbnail";
import type { FeedRowClickHandler } from "./types";

interface GridCardOptions {
  item: FeedItem;
  index: number;
  selected: boolean;
  onClick: FeedRowClickHandler;
}

export function createShortsGridCard(options: GridCardOptions): HTMLElement {
  const { item, index, selected, onClick } = options;
  const card = document.createElement("button");
  card.type = "button";
  card.className = `shorts-grid-card${selected ? " selected" : ""}`;
  card.setAttribute("role", "row");
  card.setAttribute("aria-selected", selected ? "true" : "false");
  card.setAttribute("aria-label", item.title);
  card.dataset.index = String(index);
  card.id = `feed-row-${index}`;

  card.appendChild(
    createThumbnail({
      item,
      index,
      showDuration: false,
      showResume: false,
      showBackgroundPlay: false,
      portrait: true,
    }),
  );

  const meta = document.createElement("div");
  meta.className = "shorts-grid-meta";
  const title = document.createElement("div");
  title.className = "shorts-grid-title";
  title.textContent = item.title;
  const channel = document.createElement("div");
  channel.className = "shorts-grid-channel";
  channel.textContent = item.channelTitle;
  meta.appendChild(title);
  meta.appendChild(channel);
  card.appendChild(meta);

  card.addEventListener("click", () => onClick(item, index));
  return card;
}
