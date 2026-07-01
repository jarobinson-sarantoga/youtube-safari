import { getYouTubeVideoId } from "../youtube";
import { postSidebarPanelMessage } from "../panel-relay";
import { getActiveShortsQueue } from "./state";
import { resolveQueueIndexByVideoId } from "./sync-index";

export function postShortsQueueStateFromPlayer(watchUrl: string): void {
  const active = getActiveShortsQueue();
  if (!active) {
    return;
  }

  const videoId = getYouTubeVideoId(watchUrl) || "";
  const index = resolveQueueIndexByVideoId(videoId, active.videoIds);
  if (index < 0) {
    return;
  }

  postSidebarPanelMessage("shortsQueueState", {
    videoId,
    index,
    source: active.source,
  });
}
