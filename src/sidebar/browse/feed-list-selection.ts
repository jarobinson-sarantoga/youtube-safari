import { $ } from "../dom";
import { getSelectedIndex } from "../feed-controller";

export function updateFeedSelection(): void {
  const listEl = $("feed-list");
  const selectedIndex = getSelectedIndex();
  let activeId: string | null = null;

  document.querySelectorAll<HTMLElement>("[data-index]").forEach((row) => {
    const index = Number.parseInt(row.dataset.index || "", 10);
    const isSelected = index === selectedIndex;
    row.classList.toggle("selected", isSelected);
    if (row instanceof HTMLButtonElement || row.getAttribute("role") === "row") {
      row.tabIndex = -1;
    }
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

export function scrollSelectedIntoView(): void {
  const row = document.querySelector<HTMLElement>(`[data-index="${getSelectedIndex()}"]`);
  row?.scrollIntoView({ block: "nearest" });
}
