import { getYouTubeVideoId } from "../youtube";
import { postSidebarPanelMessage } from "../panel-relay";
import { findShortsQueueIndex, getActiveShortsQueue } from "./state";

export function postShortsQueueStateFromPlayer(watchUrl: string): void {
  const active = getActiveShortsQueue();
  if (!active) {
    return;
  }

  const videoId = getYouTubeVideoId(watchUrl) || "";
  if (!videoId) {
    return;
  }

  const index = findShortsQueueIndex(videoId);
  if (index < 0) {
    return;
  }

  postSidebarPanelMessage("shortsQueueState", {
    videoId,
    index,
    source: active.source,
  });
}
