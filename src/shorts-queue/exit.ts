import { clearActiveShortsQueue, getActiveShortsQueue } from "./state";

export function isShortsQueueActive(): boolean {
  return getActiveShortsQueue() !== null;
}

export function exitShortsQueue(): void {
  clearActiveShortsQueue();
}
