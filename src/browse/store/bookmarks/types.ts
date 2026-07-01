export const BOOKMARKS_PATH = "@data/video-bookmarks.json";
export const MAX_BOOKMARKS_PER_VIDEO = 50;

export interface VideoBookmark {
  id: string;
  videoId: string;
  seconds: number;
  label: string;
  createdAt: number;
}

export interface BookmarksFile {
  bookmarks: VideoBookmark[];
}
