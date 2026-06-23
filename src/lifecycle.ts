let shuttingDown = false;
let intentionalClose = false;
let playGeneration = 0;

export function isShuttingDown(): boolean {
  return shuttingDown;
}

/** Set when the player window is closing so async work can bail out. */
export function markPlayerShuttingDown(): void {
  shuttingDown = true;
}

/** Panel requested this managed player to close (not a background-hide). */
export function markIntentionalPlayerClose(): void {
  intentionalClose = true;
}

export function isIntentionalPlayerClose(): boolean {
  return intentionalClose;
}

export function getPlayGeneration(): number {
  return playGeneration;
}

/** Align with global coordinator after openYouTubeWatch. */
export function syncPlayGeneration(generation: number): void {
  if (generation > playGeneration) {
    playGeneration = generation;
  }
  shuttingDown = false;
  intentionalClose = false;
}

/** New playback request — allow load hooks to run again. */
export function bumpPlayGeneration(): number {
  playGeneration += 1;
  shuttingDown = false;
  intentionalClose = false;
  return playGeneration;
}

/** @deprecated Use bumpPlayGeneration or syncPlayGeneration */
export function resetPlayerLifecycle(): void {
  bumpPlayGeneration();
}

/** Ignore closeManagedPlayer posted before the current play generation. */
export function shouldHonorClose(requestedGeneration?: number): boolean {
  if (typeof requestedGeneration !== "number") {
    return true;
  }
  return requestedGeneration >= playGeneration;
}