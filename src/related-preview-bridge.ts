import type { FeedItem } from "./browse/types";
import { getRelatedItems } from "./browse/feeds/related";
import { getYouTubeVideoId, isYouTubeWatchURL } from "./youtube";
import { appendLog } from "./ytdl";

const { sidebar } = iina;

let relatedRequestSeq = 0;
let sidebarReadyCheck: () => boolean = () => false;

export function setRelatedPreviewReadyCheck(check: () => boolean): void {
  sidebarReadyCheck = check;
}

function isSidebarReady(): boolean {
  return sidebarReadyCheck();
}

export function nextRelatedRequestId(): number {
  return ++relatedRequestSeq;
}

export function postRelatedPreviewClear(): void {
  if (!isSidebarReady()) {
    return;
  }
  const requestId = nextRelatedRequestId();
  sidebar.postMessage("relatedPreview", { videoId: "", items: [], relatedRequestId: requestId });
}

function postRelatedPreviewItems(
  videoId: string,
  items: FeedItem[],
  requestId: number,
  error?: string,
): void {
  if (!isSidebarReady()) {
    return;
  }
  sidebar.postMessage("relatedPreview", { videoId, items, error, relatedRequestId: requestId });
}

export function postRelatedPreview(watchUrl: string, force = false): void {
  if (!isYouTubeWatchURL(watchUrl)) {
    postRelatedPreviewClear();
    return;
  }

  const requestVideoId = getYouTubeVideoId(watchUrl) || "";
  if (!requestVideoId) {
    postRelatedPreviewClear();
    return;
  }

  const requestId = nextRelatedRequestId();

  void (async () => {
    try {
      const result = await getRelatedItems(requestVideoId, force);
      postRelatedPreviewItems(requestVideoId, result.items, requestId, result.error);
    } catch (err) {
      appendLog(`related preview failed: ${err}`);
      const message = err instanceof Error ? err.message : String(err);
      postRelatedPreviewItems(requestVideoId, [], requestId, message);
    }
  })();
}