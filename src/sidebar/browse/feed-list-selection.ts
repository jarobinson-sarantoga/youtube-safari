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
    const card = row.querySelector<HTMLElement>(".shorts-grid-card");
    if (card) {
      card.classList.toggle("selected", isSelected);
      card.setAttribute("aria-selected", isSelected ? "true" : "false");
    }
    if (row instanceof HTMLButtonElement || row.getAttribute("role") === "row" || row.getAttribute("role") === "option") {
      row.tabIndex = -1;
    }
    if (isSelected) {
      if (row.getAttribute("role") === "option" || row.getAttribute("role") === "row") {
        row.setAttribute("aria-selected", "true");
      }
      activeId = row.id || null;
    } else if (row.getAttribute("role") === "option" || row.getAttribute("role") === "row") {
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
