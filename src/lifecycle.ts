let shuttingDown = false;

export function isShuttingDown(): boolean {
  return shuttingDown;
}

/** Set when the player window is closing so async work can bail out. */
export function markPlayerShuttingDown(): void {
  shuttingDown = true;
}