import { getYouTubeVideoId } from "../youtube";
import { postSidebarPanelMessage } from "../panel-relay";
import { findShortsQueueIndex, getActiveShortsQueue } from "./state";

const { mpv } = iina;

export function postShortsQueueStateFromPlayer(watchUrl: string): void {
  const active = getActiveShortsQueue();
  if (!active) {
    return;
  }

  const videoId = getYouTubeVideoId(watchUrl) || "";
  if (!videoId) {
    return;
  }

  let index = findShortsQueueIndex(videoId);
  if (index < 0) {
    const pos = mpv.getNumber("playlist-pos");
    if (Number.isFinite(pos) && pos >= 0 && pos < active.videoIds.length) {
      index = pos;
    } else {
      return;
    }
  }

  postSidebarPanelMessage("shortsQueueState", {
    videoId,
    index,
    source: active.source,
  });
}
