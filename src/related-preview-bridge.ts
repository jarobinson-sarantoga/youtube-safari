import { postRelatedPreview as postRelatedPreviewShared, postRelatedPreviewClear as postRelatedPreviewClearShared } from "./panel-handlers";
import { postPanelMessage, postSidebarPanelMessage } from "./panel-relay";
import { getLastWatchUrl } from "./preferences";
import { isShortsQueueActive } from "./shorts-queue";
import { isYouTubeWatchURL } from "./youtube";
import { shouldRunPlaybackSideEffects } from "./playback-side-effects";

let sidebarReadyCheck: () => boolean = () => false;

export function setRelatedPreviewReadyCheck(check: () => boolean): void {
  sidebarReadyCheck = check;
}

function isSidebarReady(): boolean {
  return sidebarReadyCheck();
}

function postToPanels(name: string, data: unknown): void {
  if (isSidebarReady()) {
    postSidebarPanelMessage(name, data);
  } else {
    postPanelMessage(name, data);
  }
}

export function postRelatedPreviewClear(): void {
  postRelatedPreviewClearShared((name, data) => postToPanels(name, data));
}

export function postRelatedPreview(watchUrl: string, force = false): void {
  if (!isYouTubeWatchURL(watchUrl)) {
    postRelatedPreviewClear();
    return;
  }
  if (!shouldRunPlaybackSideEffects(isShortsQueueActive(), force)) {
    return;
  }

  void postRelatedPreviewShared(watchUrl, (name, data) => postToPanels(name, data), force);
}

export function refreshRelatedPreviewFromWatchUrl(): void {
  void postRelatedPreview(getLastWatchUrl());
}