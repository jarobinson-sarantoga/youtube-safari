import { queueMpvChapters } from "../chapters-mpv";
import { pickChapters, type DescriptionChapter } from "../description-chapters";
import { appendLog } from "../ytdl";

const { menu } = iina;

let lastListedTitle = "";
let lastListedDescription = "";
let lastListedChapters: DescriptionChapter[] = [];
let menuUpdatesEnabled = false;
let menuForceUpdateTimer: ReturnType<typeof setTimeout> | null = null;
let playerMenuSeparatorInstalled = false;

/** Defer forceUpdate — calling it during plugin init crashes IINA (recursive libdispatch lock). */
export function scheduleMenuForceUpdate(): void {
  if (!menuUpdatesEnabled) {
    return;
  }
  if (menuForceUpdateTimer !== null) {
    return;
  }
  menuForceUpdateTimer = setTimeout(() => {
    menuForceUpdateTimer = null;
    try {
      menu.forceUpdate();
    } catch (err) {
      appendLog(`menu.forceUpdate failed: ${err}`);
    }
  }, 0);
}

export function getListedTitle(): string {
  return lastListedTitle;
}

export function getListedDescription(): string {
  return lastListedDescription;
}

export function getListedChapters(): DescriptionChapter[] {
  return lastListedChapters;
}

export function setListedTitle(title: string): void {
  lastListedTitle = title;
}

export function setListedDescription(description: string): void {
  lastListedDescription = description;
}

export function clearListedMetadata(): void {
  lastListedTitle = "";
  lastListedDescription = "";
  lastListedChapters = [];
}

export function enableNativeMenuUpdates(): void {
  if (menuUpdatesEnabled) {
    return;
  }
  menuUpdatesEnabled = true;
  appendLog("Menu updates enabled");
}

export function isNativeMenuUpdatesEnabled(): boolean {
  return menuUpdatesEnabled;
}

/** Install after iina.window-loaded — sync menu work during plugin init hangs IINA. */
export function installPlayerMenuSeparator(): void {
  if (playerMenuSeparatorInstalled) {
    return;
  }
  playerMenuSeparatorInstalled = true;
  menu.addItem(menu.separator());
}

export function updateListedChapters(
  description: string,
  ytdlpChapters?: DescriptionChapter[],
): void {
  lastListedChapters = pickChapters(ytdlpChapters, description);
  appendLog(`Chapters updated: ${lastListedChapters.length} (desc=${description.length} chars)`);
  queueMpvChapters(lastListedChapters);
}
