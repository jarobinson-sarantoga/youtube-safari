import { getYouTubeVideoId } from "../../youtube";
import { IDLE_COPY } from "../copy";
import { $ } from "../dom";
import { createSkeletonRows } from "../feed-row";
import { postToPlugin } from "../messaging";
import { getCurrentWatchUrl } from "./hero";
import { playerState, resetRelatedPreviewCache } from "./state";

export function hasCachedRelatedPreview(watchUrl: string): boolean {
  const videoId = getYouTubeVideoId(watchUrl) || "";
  return (
    !!videoId &&
    videoId === playerState.renderedRelatedVideoId &&
    playerState.renderedRelatedHasItems
  );
}

export function beginRelatedPreviewLoad(): void {
  const el = $("related-preview");
  el.innerHTML = "";
  el.classList.remove("empty");
  el.appendChild(createSkeletonRows(2));
}

function renderIdleRelatedMessage(): void {
  const el = $("related-preview");
  el.innerHTML = "";
  el.textContent = IDLE_COPY.related;
  el.classList.add("empty");
}

export function requestRelatedPreviewForCurrentWatch(force = false): void {
  const watchUrl = getCurrentWatchUrl();
  const videoId = getYouTubeVideoId(watchUrl) || "";
  if (!videoId) {
    playerState.relatedLoadVideoId = "";
    resetRelatedPreviewCache();
    renderIdleRelatedMessage();
    return;
  }
  if (!force && hasCachedRelatedPreview(watchUrl)) {
    return;
  }
  if (!force && playerState.relatedLoadVideoId === videoId) {
    return;
  }

  playerState.relatedLoadVideoId = videoId;
  beginRelatedPreviewLoad();
  postToPlugin("requestRelatedPreview", { watchUrl, force: force || undefined });
}
