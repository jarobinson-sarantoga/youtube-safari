import type { FeedItem } from "../../browse/types";
import { getYouTubeVideoId, youtubeWatchUrl } from "../../youtube";
import { IDLE_COPY } from "../copy";
import { $, createErrorWithRetry } from "../dom";
import { createFeedRow } from "../feed-row";
import { postToPlugin } from "../messaging";
import { scheduleNowPlayingSync } from "../now-playing-sync";
import { setActiveView } from "../views";
import { previewNowPlayingFromFeed } from "./hero";
import { requestRelatedPreviewForCurrentWatch } from "./related-request";
import { updateRelatedSelection } from "./related-selection";
import { playerState } from "./state";

function playRelated(item: FeedItem, index: number, background = false): void {
  const listEl = $("related-preview");
  playerState.relatedSelectedIndex = index;
  updateRelatedSelection();
  listEl.focus();
  previewNowPlayingFromFeed(item);
  postToPlugin("playVideo", {
    videoId: item.videoId,
    url: youtubeWatchUrl(item.videoId),
    background: background || undefined,
  });
  scheduleNowPlayingSync();
  setActiveView("player", { skipPanelRefresh: true });
  requestRelatedPreviewForCurrentWatch();
}

function renderEmptyRelated(el: HTMLElement): void {
  el.textContent = IDLE_COPY.related;
  el.classList.add("empty");
  el.tabIndex = -1;
  el.removeAttribute("role");
  el.removeAttribute("aria-label");
  el.removeAttribute("aria-activedescendant");
}

export function renderRelatedPreview(
  videoId: string,
  items: FeedItem[],
  error?: string,
  relatedRequestId?: number,
): void {
  if (
    typeof relatedRequestId === "number" &&
    relatedRequestId < playerState.lastAcceptedRelatedRequestId
  ) {
    return;
  }
  if (typeof relatedRequestId === "number") {
    playerState.lastAcceptedRelatedRequestId = relatedRequestId;
  }

  const currentVideoId = getYouTubeVideoId(playerState.currentWatchUrl) || "";
  const resolvedVideoId = videoId || currentVideoId;
  if (resolvedVideoId && currentVideoId && resolvedVideoId !== currentVideoId) {
    return;
  }
  if (resolvedVideoId) {
    playerState.relatedLoadVideoId = "";
  }

  const el = $("related-preview");
  el.innerHTML = "";
  playerState.relatedSelectedIndex = -1;
  playerState.renderedRelatedVideoId = videoId || currentVideoId;
  playerState.renderedRelatedHasItems = items.length > 0;

  if (error) {
    el.classList.remove("empty");
    el.tabIndex = -1;
    el.removeAttribute("role");
    el.removeAttribute("aria-label");
    el.removeAttribute("aria-activedescendant");
    el.appendChild(createErrorWithRetry(error, () => requestRelatedPreviewForCurrentWatch(true)));
    return;
  }
  if (!items.length) {
    renderEmptyRelated(el);
    return;
  }

  el.classList.remove("empty");
  el.tabIndex = 0;
  el.setAttribute("role", "listbox");
  el.setAttribute("aria-label", "Related videos");
  items.forEach((item, index) => {
    el.appendChild(
      createFeedRow({
        item,
        index,
        rowClassName: "feed-row related-row",
        rowIdPrefix: "related",
        showDuration: false,
        showResume: false,
        showExtra: false,
        showBackgroundPlay: true,
        onClick: (clickedItem) => playRelated(clickedItem, index),
        onBackgroundPlay: (clickedItem) => playRelated(clickedItem, index, true),
      }),
    );
  });

  playerState.relatedSelectedIndex = 0;
  updateRelatedSelection();
}
