import { getBookmarksData, writeBookmarks } from "./storage";
import type { VideoBookmark } from "./types";
import { MAX_BOOKMARKS_PER_VIDEO } from "./types";

export { flushBookmarks } from "./storage";
export type { VideoBookmark } from "./types";

function newBookmarkId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getBookmarksForVideo(videoId: string): VideoBookmark[] {
  return getBookmarksData()
    .bookmarks.filter((b) => b.videoId === videoId)
    .sort((a, b) => a.seconds - b.seconds);
}

export function addBookmark(
  videoId: string,
  seconds: number,
  label: string,
): VideoBookmark {
  const data = getBookmarksData();
  const bookmark: VideoBookmark = {
    id: newBookmarkId(),
    videoId,
    seconds: Math.max(0, Math.floor(seconds)),
    label: label.trim() || `Bookmark at ${Math.floor(seconds)}s`,
    createdAt: Date.now(),
  };
  data.bookmarks.push(bookmark);
  const perVideo = data.bookmarks.filter((b) => b.videoId === videoId);
  if (perVideo.length > MAX_BOOKMARKS_PER_VIDEO) {
    const drop = perVideo.length - MAX_BOOKMARKS_PER_VIDEO;
    const dropIds = new Set(perVideo.slice(0, drop).map((b) => b.id));
    data.bookmarks = data.bookmarks.filter((b) => !dropIds.has(b.id));
  }
  writeBookmarks(data);
  return bookmark;
}

export function removeBookmark(id: string): boolean {
  const data = getBookmarksData();
  const before = data.bookmarks.length;
  data.bookmarks = data.bookmarks.filter((b) => b.id !== id);
  if (data.bookmarks.length === before) {
    return false;
  }
  writeBookmarks(data);
  return true;
}
