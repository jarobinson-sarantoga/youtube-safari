import { createJsonStore } from "../shared/json-store";
import type { BlocklistFile } from "./types";
import { BLOCKLIST_PATH } from "./types";

const store = createJsonStore<BlocklistFile>(
  BLOCKLIST_PATH,
  () => ({ channels: [] }),
);

export function getBlocklistData(): BlocklistFile {
  return store.get();
}

export function writeBlocklist(data: BlocklistFile): void {
  store.write(data);
}

export function flushBlocklist(): void {
  store.flush();
}
