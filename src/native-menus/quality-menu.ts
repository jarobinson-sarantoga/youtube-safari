import type { QualityItem } from "../qualities";
import { scheduleMenuForceUpdate } from "./state";
import {
  addSubmenuItemCompat,
  findMenuIndex,
  QUALITY_MENU_TITLE,
} from "./menu-utils";

const { menu } = iina;

export function replaceQualityMenu(
  qualities: QualityItem[],
  selected: number,
  onSwitchQuality: (height: number) => void,
): void {
  const idx = findMenuIndex(QUALITY_MENU_TITLE);
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
