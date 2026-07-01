/** Quality UI bootstrap: sidebar handlers, panel proxy, window lifecycle.
 *  @see panel-proxy.ts — standalone panelProxy routing
 *  @see refresh.ts, switch-quality.ts — panel updates
 */
import { appendLog } from "../ytdl";
import {
  enableNativeMenuUpdates,
  installPlayerMenuSeparator,
  isNativeMenuUpdatesEnabled,
} from "../native-menus";
import {
  ensureSidebarLoaded,
  isSidebarHtmlLoaded,
  postSidebarPanel,
  revealYouTubePanel,
  setSidebarHandlers,
} from "../sidebar-host";
import { getSelectedHeight } from "../qualities";
import { defaultPanelPayload } from "../sidebar-state";
import { setRelatedPreviewReadyCheck } from "../related-preview-bridge";
import { handlePanelProxy } from "./panel-proxy";
import { refreshQualityUI, scheduleRefreshQualityUI, cancelScheduledRefresh } from "./refresh";
import { switchQuality } from "./switch-quality";

const { event, global } = iina;

export { revealYouTubePanel };

export function initQualityUI(): void {
  setRelatedPreviewReadyCheck(isSidebarHtmlLoaded);
  setSidebarHandlers({
    onSelectQuality: (height) => {
      void switchQuality(height);
    },
    onRefreshPanel: () => {
      void refreshQualityUI();
    },
  });

  function enableMenuUpdates(): void {
    if (isNativeMenuUpdatesEnabled()) {
      return;
    }
    enableNativeMenuUpdates();
    scheduleRefreshQualityUI();
  }

  global.onMessage("openYouTubeBrowse", () => {
    revealYouTubePanel("player");
    appendLog("Open YouTube panel triggered");
  });

  global.onMessage("panelProxy", handlePanelProxy);

  event.on("iina.window-loaded", () => {
    installPlayerMenuSeparator();
    enableMenuUpdates();
    try {
      ensureSidebarLoaded();
    } catch (err) {
      appendLog(`Sidebar load on window-loaded failed: ${err}`);
    }
  });

  event.on("iina.window-will-close", () => {
    cancelScheduledRefresh();
  });

  postSidebarPanel(defaultPanelPayload(getSelectedHeight()));
}
