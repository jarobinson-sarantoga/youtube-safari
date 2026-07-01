/** Whether related preview / quality refresh should run for this watch transition. */
export function shouldRunPlaybackSideEffects(
  queueActive: boolean,
  force: boolean,
): boolean {
  return force || !queueActive;
}
