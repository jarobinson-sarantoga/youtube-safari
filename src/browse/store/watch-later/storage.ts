import { createJsonStore } from "../shared/json-store";
import type { WatchLaterFile } from "./types";
import { WATCH_LATER_PATH } from "./types";

const store = createJsonStore<WatchLaterFile>(
  WATCH_LATER_PATH,
  () => ({ entries: [] }),
);

export function getWatchLaterData(): WatchLaterFile {
  return store.get();
}

export function writeWatchLater(data: WatchLaterFile): void {
  store.write(data);
}

export function flushWatchLater(): void {
  store.flush();
}
