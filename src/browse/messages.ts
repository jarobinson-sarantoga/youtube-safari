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
  | { name: "appendShortsQueue"; data: { videoIds: string[] } };

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
    };