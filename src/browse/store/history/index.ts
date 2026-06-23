export { suppressNextWatchEnd, recordWatchStart, updateWatchProgress, markWatchEnded } from "./watch";
export { getHistoryItems } from "./feed";
export type { HistoryEntry } from "./types";

import {
  clearProgressWriteTimer,
  flushPendingProgress,
} from "./progress";
import { flushHistoryToDisk } from "./storage";

/** Flush debounced watch-history writes immediately (e.g. before window close). */
export function flushPendingHistory(): void {
  clearProgressWriteTimer();
  flushPendingProgress();
  flushHistoryToDisk();
}
