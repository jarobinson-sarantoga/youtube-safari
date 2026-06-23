import { backgroundPlayState } from "./state";

const { event } = iina;

export function clearHideListeners(): void {
  if (backgroundPlayState.windowLoadedToken) {
    event.off("iina.window-loaded", backgroundPlayState.windowLoadedToken);
    backgroundPlayState.windowLoadedToken = null;
  }
  if (backgroundPlayState.fileLoadedToken) {
    event.off("iina.file-loaded", backgroundPlayState.fileLoadedToken);
    backgroundPlayState.fileLoadedToken = null;
  }
  if (backgroundPlayState.deminiaturizedToken) {
    event.off("iina.window-deminiaturized", backgroundPlayState.deminiaturizedToken);
    backgroundPlayState.deminiaturizedToken = null;
  }
  if (backgroundPlayState.movedToken) {
    event.off("iina.window-moved", backgroundPlayState.movedToken);
    backgroundPlayState.movedToken = null;
  }
  for (const timer of backgroundPlayState.retryTimers) {
    clearTimeout(timer);
  }
  backgroundPlayState.retryTimers = [];
  if (backgroundPlayState.watchdogTimer) {
    clearTimeout(backgroundPlayState.watchdogTimer);
    backgroundPlayState.watchdogTimer = null;
  }
}
