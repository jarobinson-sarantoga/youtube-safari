import { openYouTubePanelSmart } from "./open-panel-router";
import { appendLog } from "./ytdl";

const { file, utils } = iina;

const OPEN_PANEL_QUEUE = "@data/open-panel.pending";

let panelQueuePoller: ReturnType<typeof setInterval> | null = null;

/** Poll a CLI-written queue file (scripts/open-panel.sh). */
export function startOpenPanelQueuePoller(): void {
  if (panelQueuePoller) {
    return;
  }
  panelQueuePoller = setInterval(() => {
    try {
      const path = utils.resolvePath(OPEN_PANEL_QUEUE);
      if (!file.exists(path)) {
        return;
      }
      try {
        file.delete(path);
      } catch {
        file.write(path, "");
      }
      appendLog("Open YouTube panel (open-panel queue)");
      openYouTubePanelSmart("browse");
    } catch (err) {
      appendLog(`open-panel queue error: ${err}`);
    }
  }, 400);
}