import type { PlayerCoordinator } from "./types";

export const OPEN_URL_QUEUE = "@data/open-url.pending";

export const managedPlayerIds = new Set<number>();
export const managedPlayerBackground = new Map<number, boolean>();

let pendingWatchUrl: string | null = null;
let pendingBackgroundPlay = false;
let queuePollerTimer: ReturnType<typeof setInterval> | null = null;
let pendingRetirePlayerIds: number[] = [];
let retireCoordinator: PlayerCoordinator | null = null;

export function getPendingWatchUrl(): string | null {
  return pendingWatchUrl;
}

export function getPendingBackgroundPlay(): boolean {
  return pendingBackgroundPlay;
}

export function setPendingWatch(url: string | null, background: boolean): void {
  pendingWatchUrl = url;
  pendingBackgroundPlay = background;
}

export function clearPendingWatchState(): void {
  pendingWatchUrl = null;
  pendingBackgroundPlay = false;
}

export function getQueuePollerTimer(): ReturnType<typeof setInterval> | null {
  return queuePollerTimer;
}

export function setQueuePollerTimer(timer: ReturnType<typeof setInterval> | null): void {
  queuePollerTimer = timer;
}

export function pushPendingRetirePlayerId(playerId: number): void {
  pendingRetirePlayerIds.push(playerId);
}

export function takePendingRetirePlayerIds(): number[] {
  const retiring = [...new Set(pendingRetirePlayerIds)];
  pendingRetirePlayerIds = [];
  return retiring;
}

export function hasPendingRetirePlayerIds(): boolean {
  return pendingRetirePlayerIds.length > 0;
}

export function setRetireCoordinator(coordinator: PlayerCoordinator | null): void {
  retireCoordinator = coordinator;
}

export function getRetireCoordinator(): PlayerCoordinator | null {
  return retireCoordinator;
}
