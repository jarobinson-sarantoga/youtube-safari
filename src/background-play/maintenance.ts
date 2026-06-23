import { appendLog } from "../ytdl";
import { MAINTENANCE_DURATION_MS, MAINTENANCE_INTERVAL_MS } from "./constants";
import { hidePlayerWindow } from "./hide";
import { backgroundPlayState } from "./state";

const { event } = iina;

export function stopBackgroundMaintenance(): void {
  backgroundPlayState.backgroundSessionActive = false;
  if (backgroundPlayState.maintenanceTimer) {
    clearInterval(backgroundPlayState.maintenanceTimer);
    backgroundPlayState.maintenanceTimer = null;
  }
  if (backgroundPlayState.maintenanceStopTimer) {
    clearTimeout(backgroundPlayState.maintenanceStopTimer);
    backgroundPlayState.maintenanceStopTimer = null;
  }
}

export function startBackgroundMaintenance(): void {
  stopBackgroundMaintenance();
  backgroundPlayState.backgroundSessionActive = true;

  backgroundPlayState.deminiaturizedToken = event.on("iina.window-deminiaturized", () => {
    hidePlayerWindow("deminiaturized-maintain", { force: true });
  });
  backgroundPlayState.movedToken = event.on("iina.window-moved", () => {
    hidePlayerWindow("moved-maintain", { force: true });
  });

  backgroundPlayState.maintenanceTimer = setInterval(() => {
    hidePlayerWindow("maintenance", { force: true });
  }, MAINTENANCE_INTERVAL_MS);

  backgroundPlayState.maintenanceStopTimer = setTimeout(() => {
    stopBackgroundMaintenance();
    appendLog("Background play: hide maintenance ended");
  }, MAINTENANCE_DURATION_MS);
}
