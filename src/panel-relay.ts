const { global, sidebar } = iina;

let sidebarReadyCheck: () => boolean = () => false;

export function setSidebarRelayReadyCheck(check: () => boolean): void {
  sidebarReadyCheck = check;
}

/** Player → global (and sidebar when loaded) panel updates. */
export function postPanelMessage(name: string, data: unknown = {}): void {
  global.postMessage("panelRelay", { name, data });
}

export function postSidebarPanelMessage(name: string, data: unknown = {}): void {
  if (sidebarReadyCheck()) {
    sidebar.postMessage(name, data);
  }
  postPanelMessage(name, data);
}