export {
  isStandaloneShellInitialized,
  isStandaloneWebViewReady,
  markStandaloneShellLoaded,
  onStandaloneSidebarReady,
  postToStandalone,
  setPendingStandaloneFocus,
  setStandaloneCoordinator,
  takePendingStandaloneFocus,
} from "./state";
export type { StandaloneFocus } from "./state";

import {
  isStandaloneBridgeInstalled,
  markStandaloneBridgeInstalled,
} from "./state";
import {
  registerStandaloneInboundHandlers,
  registerStandaloneReadyHandler,
} from "./handlers";

export function installStandaloneBridge(): void {
  if (isStandaloneBridgeInstalled()) {
    return;
  }
  markStandaloneBridgeInstalled();
  registerStandaloneReadyHandler();
  registerStandaloneInboundHandlers();
}
