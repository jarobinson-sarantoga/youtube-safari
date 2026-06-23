import type { DescriptionChapter } from "../description-chapters";
import type { ResolvedSubtitle } from "../subtitles";

export interface ResolvedStream {
  title: string;
  description: string;
  chapters: DescriptionChapter[];
  subtitles: ResolvedSubtitle[];
  videoUrl: string;
  audioUrl: string | null;
  headers: Record<string, string>;
}

export interface ResolvePayload {
  title?: string;
  description?: string;
  chapters?: unknown;
  subtitles?: unknown;
  video?: string;
  audio?: string;
  ua?: string;
  error?: string;
}

export interface PlaylistEntry {
  id: string;
  title: string;
  url: string;
}

export interface PlaylistListing {
  title: string;
  entries: PlaylistEntry[];
}

export interface PlaylistPayload {
  title?: string;
  entries?: PlaylistEntry[];
  error?: string;
}
