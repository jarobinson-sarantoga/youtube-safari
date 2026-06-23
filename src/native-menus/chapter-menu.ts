import { seekPlayback } from "../youtube-open";
import type { DescriptionChapter } from "../description-chapters";
import { scheduleMenuForceUpdate } from "./state";
import {
  addSubmenuItemCompat,
  CHAPTERS_MENU_TITLE,
  findMenuIndex,
} from "./menu-utils";

const { menu } = iina;

export function replaceChapterMenu(chapters: DescriptionChapter[]): void {
  const idx = findMenuIndex(CHAPTERS_MENU_TITLE);
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
