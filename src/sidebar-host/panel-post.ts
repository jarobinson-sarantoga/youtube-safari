import type { PanelPayload } from "../sidebar-state";
import { postPanelMessage, postSidebarPanelMessage } from "../panel-relay";
import { sidebarHostState } from "./state";

const { sidebar } = iina;

export function postSidebarPanel(payload: PanelPayload): void {
  sidebarHostState.lastPanelPayload = payload;
  postPanelMessage("panel", payload);
  if (!sidebarHostState.sidebarHtmlLoaded) {
    return;
  }
  sidebar.postMessage("panel", payload);
  sidebarHostState.lastPushedPanelJson = JSON.stringify(payload);
}

export function schedulePanelPush(): void {
  if (!sidebarHostState.lastPanelPayload) {
    return;
  }

  const payloadJson = JSON.stringify(sidebarHostState.lastPanelPayload);
  if (payloadJson === sidebarHostState.lastPushedPanelJson) {
    return;
  }

  if (sidebarHostState.panelPushTimer !== null) {
    clearTimeout(sidebarHostState.panelPushTimer);
  }

  sidebarHostState.panelPushTimer = setTimeout(() => {
    sidebarHostState.panelPushTimer = null;
    if (!sidebarHostState.lastPanelPayload) {
      return;
    }
    const json = JSON.stringify(sidebarHostState.lastPanelPayload);
    if (json === sidebarHostState.lastPushedPanelJson) {
      return;
    }
    if (sidebarHostState.sidebarHtmlLoaded) {
      postSidebarPanelMessage("panel", sidebarHostState.lastPanelPayload);
    } else {
      postPanelMessage("panel", sidebarHostState.lastPanelPayload);
    }
    sidebarHostState.lastPushedPanelJson = json;
  }, 300);
}
