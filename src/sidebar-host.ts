import { registerBrowseHandlers } from "./browse/init";
import { getLastWatchUrl } from "./preferences";
import { getSelectedHeight } from "./qualities";
import {
  DEFAULT_QUALITY_OPTIONS,
  defaultPanelPayload,
  type PanelPayload,
} from "./sidebar-state";
import {
  getListedChapters,
  getListedDescription,
  getListedTitle,
} from "./native-menus";
import { postRelatedPreview } from "./related-preview-bridge";
import { openLinkedUrl, seekPlayback } from "./youtube-open";
import { appendLog } from "./ytdl";
import { isYouTubeWatchURL } from "./youtube";

const { sidebar } = iina;

let lastPanelPayload: PanelPayload | null = null;
let sidebarHtmlLoaded = false;
let sidebarWebViewReady = false;
let panelPushTimer: ReturnType<typeof setTimeout> | null = null;
let lastPushedPanelJson: string | null = null;

type SidebarRevealView = "browse" | "player";

let pendingSidebarReveal: SidebarRevealView | null = null;

export interface SidebarHandlers {
  onSelectQuality: (height: number) => void;
  onRefreshPanel: () => void;
}

let handlers: SidebarHandlers | null = null;

export function setSidebarHandlers(next: SidebarHandlers): void {
  handlers = next;
}

export function isSidebarHtmlLoaded(): boolean {
  return sidebarHtmlLoaded;
}

export function getLastPanelPayload(): PanelPayload | null {
  return lastPanelPayload;
}

export function buildPanelPayload(
  items: import("./qualities").QualityItem[],
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

export function postSidebarPanel(payload: PanelPayload): void {
  lastPanelPayload = payload;
  if (!sidebarHtmlLoaded) {
    return;
  }
  sidebar.postMessage("panel", payload);
  lastPushedPanelJson = JSON.stringify(payload);
}

export function schedulePanelPush(): void {
  if (!sidebarHtmlLoaded || !lastPanelPayload) {
    return;
  }

  const payloadJson = JSON.stringify(lastPanelPayload);
  if (payloadJson === lastPushedPanelJson) {
    return;
  }

  if (panelPushTimer !== null) {
    clearTimeout(panelPushTimer);
  }

  panelPushTimer = setTimeout(() => {
    panelPushTimer = null;
    if (!sidebarHtmlLoaded || !lastPanelPayload) {
      return;
    }
    const json = JSON.stringify(lastPanelPayload);
    if (json === lastPushedPanelJson) {
      return;
    }
    sidebar.postMessage("panel", lastPanelPayload);
    lastPushedPanelJson = json;
  }, 300);
}

/** IINA clears sidebar.onMessage listeners when loadFile runs — re-register after each load. */
function registerPluginSidebarListeners(): void {
  sidebar.onMessage("selectQuality", (data: { height?: number }) => {
    appendLog(`selectQuality received: ${JSON.stringify(data)}`);
    const height = data?.height;
    if (typeof height === "number") {
      handlers?.onSelectQuality(height);
    }
  });

  function handleDescriptionSeek(data: { seconds?: number | string } | undefined): void {
    appendLog(`descriptionSeek received: ${JSON.stringify(data)}`);
    let seconds = data?.seconds;
    if (typeof seconds === "string") {
      seconds = Number.parseFloat(seconds);
    }
    if (typeof seconds !== "number" || seconds < 0 || !Number.isFinite(seconds)) {
      appendLog("descriptionSeek ignored: invalid seconds");
      return;
    }
    seekPlayback(seconds, "description");
  }

  sidebar.onMessage("descriptionSeek", handleDescriptionSeek);
  sidebar.onMessage("seek", handleDescriptionSeek);

  sidebar.onMessage("openUrl", (data: { url?: string }) => {
    const url = data?.url;
    if (typeof url !== "string") {
      return;
    }
    openLinkedUrl(url);
  });

  sidebar.onMessage("requestRelatedPreview", (data: { force?: boolean } | undefined) => {
    const watchUrl = getLastWatchUrl();
    postRelatedPreview(watchUrl, !!data?.force);
  });

  sidebar.onMessage("refreshPanel", () => {
    handlers?.onRefreshPanel();
  });
}

function registerSidebarMessageHandlers(): void {
  sidebar.onMessage("sidebarReady", () => {
    sidebarWebViewReady = true;
    appendLog("Sidebar ready");
    registerBrowseHandlers();
    registerPluginSidebarListeners();
    sidebar.postMessage("browseReady", {});

    if (lastPanelPayload) {
      sidebar.postMessage("panel", lastPanelPayload);
      lastPushedPanelJson = JSON.stringify(lastPanelPayload);
    } else {
      postSidebarPanel(defaultPanelPayload(getSelectedHeight()));
    }
    schedulePanelPush();

    const watchUrl = getLastWatchUrl();
    if (isYouTubeWatchURL(watchUrl)) {
      void postRelatedPreview(watchUrl);
    }

    applyPendingSidebarReveal();
  });
}

function applyPendingSidebarReveal(): void {
  if (pendingSidebarReveal === null || !sidebarHtmlLoaded || !sidebarWebViewReady) {
    return;
  }

  const view = pendingSidebarReveal;
  pendingSidebarReveal = null;

  sidebar.show();
  if (view === "browse") {
    sidebar.postMessage("focusBrowse", {});
  } else {
    sidebar.postMessage("focusPlayer", {});
  }
  schedulePanelPush();
  appendLog(`YouTube panel shown (${view})`);
}

function loadSidebarHtml(): void {
  if (sidebarHtmlLoaded) {
    schedulePanelPush();
    applyPendingSidebarReveal();
    return;
  }
  sidebar.loadFile("sidebar/shell.html");
  registerSidebarMessageHandlers();
  registerPluginSidebarListeners();
  sidebarHtmlLoaded = true;
  appendLog("Sidebar HTML loaded");
  schedulePanelPush();
}

/** Load sidebar shell if needed, then show the panel (defers until window-loaded). */
export function revealYouTubePanel(view: SidebarRevealView = "player"): void {
  pendingSidebarReveal = view;
  try {
    loadSidebarHtml();
  } catch (err) {
    appendLog(`revealYouTubePanel deferred until window-loaded: ${err}`);
  }
}

export function ensureSidebarLoaded(): void {
  try {
    loadSidebarHtml();
  } catch (err) {
    appendLog(`Sidebar load failed: ${err}`);
  }
}