import { createJsonStore } from "../shared/json-store";
import type { BookmarksFile } from "./types";
import { BOOKMARKS_PATH } from "./types";

const store = createJsonStore<BookmarksFile>(
  BOOKMARKS_PATH,
  () => ({ bookmarks: [] }),
);

export function getBookmarksData(): BookmarksFile {
  return store.get();
}

export function writeBookmarks(data: BookmarksFile): void {
  store.write(data);
}

export function flushBookmarks(): void {
  store.flush();
}
