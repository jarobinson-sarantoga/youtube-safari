import { createJsonStore } from "../shared/json-store";
import type { QueueFile } from "./types";
import { QUEUE_PATH } from "./types";

const store = createJsonStore<QueueFile>(QUEUE_PATH, () => ({ entries: [] }));

export function getQueueData(): QueueFile {
  return store.get();
}

export function writeQueue(data: QueueFile): void {
  store.write(data);
}

export function flushQueue(): void {
  store.flush();
}
