import type { FeedItem, FeedTab, SubsFilter } from "./types";
import type { PanelPayload } from "../sidebar-state";

/** Sidebar → plugin: play a YouTube watch URL. */
export interface PlayVideoMessage {
  videoId: string;
  url?: string;
  /** Play audio in a hidden/minimized player window. */
  background?: boolean;
  shortsQueue?: {
    videoIds: string[];
    titles?: string[];
    startIndex: number;
    source: "shorts" | "subs-shorts";
  };
}

/** Sidebar → plugin: refresh a feed tab. */
export interface BrowseRefreshMessage {
  tab: FeedTab;
  query?: string;
  subsFilter?: SubsFilter;
  /** When true, bypass browse cache and fetch live from YouTube. */
  force?: boolean;
  requestId?: number;
  /** reel_watch_sequence continuation for Shorts pagination. */
  continuation?: string;
  /** Append Shorts results instead of replacing the list. */
  append?: boolean;
}

/** Plugin → sidebar: feed results. */
export interface FeedResultMessage {
  tab: FeedTab;
  items: FeedItem[];
  error?: string;
  emptyHint?: string;
  subsFilter?: SubsFilter;
  requestId?: number;
  query?: string;
  continuation?: string;
  append?: boolean;
}

/** Plugin → sidebar: current playback state. */
export interface PlayerStateMessage {
  watchUrl: string;
  title: string;
  position: number;
  duration: number;
  paused: boolean;
}

export type SidebarToPluginMessage =
  | { name: "playVideo"; data: PlayVideoMessage }
  | { name: "browseRefresh"; data: BrowseRefreshMessage }
  | { name: "sidebarReady"; data: Record<string, never> }
  | { name: "selectQuality"; data: { height?: number } }
  | { name: "descriptionSeek"; data: { seconds?: number | string } }
  | { name: "seek"; data: { seconds?: number | string } }
  | { name: "openUrl"; data: { url?: string } }
  | { name: "requestRelatedPreview"; data: { force?: boolean; watchUrl?: string } }
  | { name: "refreshPanel"; data: Record<string, never> }
  | { name: "syncNowPlaying"; data: Record<string, never> }
  | { name: "appendShortsQueue"; data: { videoIds: string[] } }
  | { name: "libraryAction"; data: import("../library/handlers").LibraryAction }
  | { name: "setPlaybackSpeed"; data: { speed?: number } }
  | { name: "setSleepTimer"; data: { minutes?: number } }
  | { name: "requestTranscript"; data: { watchUrl?: string } }
  | { name: "requestBookmarks"; data: { videoId?: string } };

export type PluginToSidebarMessage =
  | { name: "feedResult"; data: FeedResultMessage }
  | { name: "playerState"; data: PlayerStateMessage }
  | { name: "panel"; data: PanelPayload }
  | { name: "focusBrowse"; data: Record<string, never> }
  | { name: "focusPlayer"; data: Record<string, never> }
  | { name: "watchUrlChanged"; data: { watchUrl?: string } }
  | { name: "feedsStale"; data: Record<string, never> }
  | { name: "historyStale"; data: Record<string, never> }
  | { name: "browseReady"; data: Record<string, never> }
  | { name: "relatedPreview"; data: {
      videoId?: string;
      items: FeedItem[];
      error?: string;
      relatedRequestId?: number;
    } }
  | {
      name: "shortsQueueState";
      data: {
        videoId: string;
        index: number;
        source: "shorts" | "subs-shorts";
      };
    }
  | { name: "watchLaterStale"; data: Record<string, never> }
  | { name: "queueStale"; data: Record<string, never> }
  | { name: "blocklistStale"; data: Record<string, never> }
  | { name: "libraryState"; data: {
      watchLater?: { videoId: string; added: boolean };
      queue?: { videoId: string; added: boolean };
    } }
  | { name: "transcript"; data: {
      videoId?: string;
      cues?: { start: number; end: number; text: string }[];
      error?: string;
      loading?: boolean;
    } }
  | { name: "bookmarks"; data: {
      videoId?: string;
      items?: { id: string; seconds: number; label: string }[];
      added?: { id: string; seconds: number; label: string };
    } }
  | { name: "historyExport"; data: { json?: string } }
  | { name: "playbackSpeed"; data: { speed: number } }
  | { name: "sleepTimer"; data: { endsAt: number } }
  | { name: "panelPrefs"; data: { hideRelated?: boolean } };