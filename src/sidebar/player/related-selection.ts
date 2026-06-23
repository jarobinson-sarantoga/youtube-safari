import { $ } from "../dom";
import { playerState } from "./state";

export function updateRelatedSelection(): void {
  const listEl = $("related-preview");
  const rows = document.querySelectorAll<HTMLElement>(".related-row");
  let activeId: string | null = null;

  rows.forEach((row, index) => {
    const isSelected = index === playerState.relatedSelectedIndex;
    row.classList.toggle("selected", isSelected);
    row.tabIndex = -1;
    if (isSelected) {
      row.setAttribute("aria-selected", "true");
      activeId = row.id || null;
    } else {
      row.removeAttribute("aria-selected");
    }
  });

  if (activeId) {
    listEl.setAttribute("aria-activedescendant", activeId);
  } else {
    listEl.removeAttribute("aria-activedescendant");
  }
}
