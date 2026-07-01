import { notifyCookiesRefreshed, registerBrowseHandlers } from "../browse/init";
import { primePanelCookiesOnFirstLoad } from "../youtube-refresh";
import { getLastWatchUrl } from "../preferences";
import { getSelectedHeight } from "../qualities";
import { defaultPanelPayload } from "../sidebar-state";
import { postSidebarPanelMessage, setSidebarRelayReadyCheck } from "../panel-relay";
import { postRelatedPreview } from "../related-preview-bridge";
import { appendLog } from "../ytdl";
import { isYouTubeWatchURL } from "../youtube";
import { registerPluginSidebarListeners } from "./listeners";
import { postSidebarPanel, schedulePanelPush } from "./panel-post";
import { buildPanelPrefsPayload } from "../panel-prefs";
import { sidebarHostState, type SidebarRevealView } from "./state";

const { sidebar } = iina;

setSidebarRelayReadyCheck(
  () => sidebarHostState.sidebarHtmlLoaded && sidebarHostState.sidebarWebViewReady,
);

function applyPendingSidebarReveal(): void {
  if (
    sidebarHostState.pendingSidebarReveal === null ||
    !sidebarHostState.sidebarHtmlLoaded ||
    !sidebarHostState.sidebarWebViewReady
  ) {
    return;
  }

  const view = sidebarHostState.pendingSidebarReveal;
  sidebarHostState.pendingSidebarReveal = null;

  sidebar.show();
  if (view === "browse") {
    postSidebarPanelMessage("focusBrowse", {});
  } else {
    postSidebarPanelMessage("focusPlayer", {});
  }
  schedulePanelPush();
  appendLog(`YouTube panel shown (${view})`);
}

function registerSidebarMessageHandlers(): void {
  sidebar.onMessage("sidebarReady", () => {
    void (async () => {
      sidebarHostState.sidebarWebViewReady = true;
      appendLog("Sidebar ready");

      const refreshed = await primePanelCookiesOnFirstLoad();
      if (refreshed) {
        notifyCookiesRefreshed();
      }

      registerBrowseHandlers();
      registerPluginSidebarListeners();
      postSidebarPanelMessage("browseReady", {});
      postSidebarPanelMessage("panelPrefs", buildPanelPrefsPayload());

      if (sidebarHostState.lastPanelPayload) {
        postSidebarPanelMessage("panel", sidebarHostState.lastPanelPayload);
        sidebarHostState.lastPushedPanelJson = JSON.stringify(sidebarHostState.lastPanelPayload);
      } else {
        postSidebarPanel(defaultPanelPayload(getSelectedHeight()));
      }
      schedulePanelPush();

      const watchUrl = getLastWatchUrl();
      if (isYouTubeWatchURL(watchUrl)) {
        void postRelatedPreview(watchUrl);
      }

      applyPendingSidebarReveal();
    })();
  });
}

function loadSidebarHtml(): void {
  if (sidebarHostState.sidebarHtmlLoaded) {
    schedulePanelPush();
    applyPendingSidebarReveal();
    return;
  }
  sidebar.loadFile("sidebar/shell.html");
  registerSidebarMessageHandlers();
  registerPluginSidebarListeners();
  sidebarHostState.sidebarHtmlLoaded = true;
  appendLog("Sidebar HTML loaded");
  schedulePanelPush();
}

/** Load sidebar shell if needed, then show the panel (defers until window-loaded). */
export function revealYouTubePanel(view: SidebarRevealView = "player"): void {
  sidebarHostState.pendingSidebarReveal = view;
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
