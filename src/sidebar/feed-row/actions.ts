import type { FeedItem } from "../../browse/types";
import { postToPlugin } from "../messaging";

export function createFeedRowActions(
  item: FeedItem,
  flags?: { watchLater?: boolean; queued?: boolean },
): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "feed-row-actions";

  const laterBtn = document.createElement("button");
  laterBtn.type = "button";
  laterBtn.className = `feed-action-btn${flags?.watchLater ? " active" : ""}`;
  laterBtn.textContent = "Later";
  laterBtn.title = "Watch Later (W)";
  laterBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    postToPlugin("libraryAction", { action: "toggleWatchLater", item });
  });

  const queueBtn = document.createElement("button");
  queueBtn.type = "button";
  queueBtn.className = `feed-action-btn${flags?.queued ? " active" : ""}`;
  queueBtn.textContent = "Queue";
  queueBtn.title = "Add to queue (Q)";
  queueBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    postToPlugin("libraryAction", { action: "addQueue", item });
  });

  const blockBtn = document.createElement("button");
  blockBtn.type = "button";
  blockBtn.className = "feed-action-btn";
  blockBtn.textContent = "Block";
  blockBtn.title = "Block channel";
  blockBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    postToPlugin("libraryAction", { action: "blockChannel", item });
  });

  bar.appendChild(laterBtn);
  bar.appendChild(queueBtn);
  bar.appendChild(blockBtn);
  return bar;
}

export function updateFeedRowActionFlags(
  bar: HTMLElement,
  flags: { watchLater?: boolean; queued?: boolean },
): void {
  const buttons = bar.querySelectorAll<HTMLButtonElement>(".feed-action-btn");
  const laterBtn = buttons[0];
  const queueBtn = buttons[1];
  if (laterBtn) {
    laterBtn.classList.toggle("active", !!flags.watchLater);
  }
  if (queueBtn) {
    queueBtn.classList.toggle("active", !!flags.queued);
  }
}
