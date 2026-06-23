import type { PlayerCoordinator } from "../open-url-global";

const { standaloneWindow } = iina;

export type StandaloneFocus = "browse" | "player";

let shellLoaded = false;
let webViewReady = false;
let pendingFocus: StandaloneFocus | null = null;
let bridgeInstalled = false;
let coordinator: PlayerCoordinator | null = null;
let sidebarReadyCallback: (() => void) | null = null;

export function setStandaloneCoordinator(next: PlayerCoordinator): void {
  coordinator = next;
}

export function getStandaloneCoordinator(): PlayerCoordinator | null {
  return coordinator;
}

export function markStandaloneShellLoaded(): void {
  shellLoaded = true;
}

export function isStandaloneShellInitialized(): boolean {
  return shellLoaded;
}

export function isStandaloneWebViewReady(): boolean {
  return webViewReady;
}

export function setStandaloneWebViewReady(ready: boolean): void {
  webViewReady = ready;
}

export function postToStandalone(name: string, data: unknown = {}): void {
  standaloneWindow.postMessage(name, data);
}

export function setPendingStandaloneFocus(view: StandaloneFocus): void {
  pendingFocus = view;
}

export function takePendingStandaloneFocus(): StandaloneFocus | null {
  const previous = pendingFocus;
  pendingFocus = null;
  return previous;
}

export function onStandaloneSidebarReady(callback: () => void): void {
  sidebarReadyCallback = callback;
}

export function runStandaloneSidebarReadyCallback(): void {
  sidebarReadyCallback?.();
}

export function isStandaloneBridgeInstalled(): boolean {
  return bridgeInstalled;
}

export function markStandaloneBridgeInstalled(): void {
  bridgeInstalled = true;
}
