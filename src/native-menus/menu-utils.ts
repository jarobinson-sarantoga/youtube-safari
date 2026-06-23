const { menu } = iina;

export const QUALITY_MENU_TITLE = "Quality";
export const CHAPTERS_MENU_TITLE = "Chapters";

/** IINA typings use addSubMenuItem; runtime may expose addSubmenuItem instead. */
export function addSubmenuItemCompat(parent: IINA.MenuItem, item: IINA.MenuItem): void {
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

export function findMenuIndex(title: string): number {
  const items = menu.items();
  for (let i = 0; i < items.length; i++) {
    if (items[i].title === title) {
      return i;
    }
  }
  return -1;
}
