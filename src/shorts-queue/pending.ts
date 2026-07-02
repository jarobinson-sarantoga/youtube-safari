import type { PlayVideoMessage } from "../browse/messages";

let pendingPlayVideo: PlayVideoMessage | null = null;

export function setPendingShortsPlayVideo(data: PlayVideoMessage): void {
  pendingPlayVideo = data;
}

export function takePendingShortsPlayVideo(): PlayVideoMessage | null {
  const data = pendingPlayVideo;
  pendingPlayVideo = null;
  return data;
}

export function hasPendingShortsPlayVideo(): boolean {
  return pendingPlayVideo !== null;
}
