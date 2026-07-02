import { getStandaloneCoordinator } from "./standalone-bridge";
import { openStandalonePanel } from "./standalone-host";

const { global } = iina;

export type PanelFocus = "browse" | "player";

/** Open docked player sidebar when a player is ready; otherwise the standalone window. */
export function openYouTubePanelSmart(focus: PanelFocus = "browse"): void {
  const coordinator = getStandaloneCoordinator();
  const playerId = coordinator?.getActivePlayerId() ?? null;

  if (playerId !== null && coordinator?.isPlayerConfirmedReady()) {
    global.postMessage(playerId, "openYouTubeBrowse", { focus });
    return;
  }

  openStandalonePanel();
}
