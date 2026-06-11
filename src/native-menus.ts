import { queueMpvChapters } from "./chapters-mpv";
import { pickChapters, type DescriptionChapter } from "./description-chapters";
import { type QualityItem } from "./qualities";
import { seekPlayback } from "./youtube-open";
import { appendLog } from "./ytdl";

const { menu } = iina;

const QUALITY_MENU_TITLE = "Quality";
const CHAPTERS_MENU_TITLE = "Chapters";

let lastListedTitle = "";
let lastListedDescription = "";
let lastListedChapters: DescriptionChapter[] = [];
let menuUpdatesEnabled = false;
let menuForceUpdateTimer: ReturnType<typeof setTimeout> | null = null;

/** Defer forceUpdate — calling it during plugin init crashes IINA (recursive libdispatch lock). */
function scheduleMenuForceUpdate(): void {
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

/** IINA typings use addSubMenuItem; runtime may expose addSubmenuItem instead. */
function addSubmenuItemCompat(parent: IINA.MenuItem, item: IINA.MenuItem): void {
  const parentAny = parent as IINA.MenuItem & { addSubmenuItem?: (child: IINA.MenuItem) => void };
  if (typeof parent.addSubMenuItem === "function") {
    parent.addSubMenuItem(item);
    return;
  }
  if (typeof parentAny.addSubmenuItem === "function") {
    parentAny.addSubmenuItem(item);
    return;
  }
  throw new Error("MenuItem has no addSubMenuItem/addSubmenuItem");
}

function findMenuIndex(title: string): number {
  const items = menu.items();
  for (let i = 0; i < items.length; i++) {
    if (items[i].title === title) {
      return i;
    }
  }
  return -1;
}

function findQualityMenuIndex(): number {
  return findMenuIndex(QUALITY_MENU_TITLE);
}

function findChapterMenuIndex(): number {
  return findMenuIndex(CHAPTERS_MENU_TITLE);
}

export function updateListedChapters(
  description: string,
  ytdlpChapters?: DescriptionChapter[],
): void {
  lastListedChapters = pickChapters(ytdlpChapters, description);
  appendLog(`Chapters updated: ${lastListedChapters.length} (desc=${description.length} chars)`);
  queueMpvChapters(lastListedChapters);
}

export function replaceChapterMenu(chapters: DescriptionChapter[]): void {
  const idx = findChapterMenuIndex();
  if (idx >= 0) {
    menu.removeAt(idx);
  }

  const root = menu.item(CHAPTERS_MENU_TITLE);
  if (chapters.length === 0) {
    addSubmenuItemCompat(root, menu.item("No chapters", undefined, { enabled: false }));
  } else {
    for (const chapter of chapters) {
      const label = `${chapter.timestamp} ${chapter.label}`;
      addSubmenuItemCompat(
        root,
        menu.item(label, () => {
          seekPlayback(chapter.seconds, "chapter-menu");
        }),
      );
    }
  }

  menu.addItem(root);
  scheduleMenuForceUpdate();
}

export function replaceQualityMenu(
  qualities: QualityItem[],
  selected: number,
  onSwitchQuality: (height: number) => void,
): void {
  const idx = findQualityMenuIndex();
  if (idx >= 0) {
    menu.removeAt(idx);
  }

  const root = menu.item(QUALITY_MENU_TITLE);
  for (const quality of qualities) {
    addSubmenuItemCompat(
      root,
      menu.item(
        quality.label,
        () => {
          onSwitchQuality(quality.height);
        },
        { selected: quality.height === selected },
      ),
    );
  }

  if (qualities.length === 0) {
    addSubmenuItemCompat(root, menu.item("No YouTube video", undefined, { enabled: false }));
  }

  menu.addItem(root);
  scheduleMenuForceUpdate();
}