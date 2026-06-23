import { getLastWatchUrl } from "../preferences";
import type { PanelPayload } from "../sidebar-state";
import {
  getListedChapters,
  getListedDescription,
  getListedTitle,
} from "../native-menus";
import { isYouTubeWatchURL } from "../youtube";

export type SidebarRevealView = "browse" | "player";

export interface SidebarHandlers {
  onSelectQuality: (height: number) => void;
  onRefreshPanel: () => void;
}

export const sidebarHostState = {
  lastPanelPayload: null as PanelPayload | null,
  sidebarHtmlLoaded: false,
  sidebarWebViewReady: false,
  panelPushTimer: null as ReturnType<typeof setTimeout> | null,
  lastPushedPanelJson: null as string | null,
  pendingSidebarReveal: null as SidebarRevealView | null,
  handlers: null as SidebarHandlers | null,
};

export function setSidebarHandlers(next: SidebarHandlers): void {
  sidebarHostState.handlers = next;
}

export function isSidebarHtmlLoaded(): boolean {
  return sidebarHostState.sidebarHtmlLoaded;
}

export function getLastPanelPayload(): PanelPayload | null {
  return sidebarHostState.lastPanelPayload;
}

export function buildPanelPayload(
  items: import("../qualities").QualityItem[],
  selected: number,
  loading: boolean,
  error?: string,
): PanelPayload {
  const watchUrl = getLastWatchUrl();
  return {
    items,
    selected,
    title: getListedTitle(),
    description: getListedDescription(),
    chapters: getListedChapters(),
    loading,
    watchUrl: isYouTubeWatchURL(watchUrl) ? watchUrl : "",
    error: error || undefined,
  };
}
