import { $, setPanelHidden } from "../dom";
import { getActiveTab } from "../feed-controller";
import { applySearchDurationFilter, getSearchDurationFilter, setSearchDurationFilter } from "./search-filter-state";

const FILTERS = [
  { id: "any", label: "Any length" },
  { id: "short", label: "< 4 min" },
  { id: "medium", label: "4–20 min" },
  { id: "long", label: "> 20 min" },
] as const;

export function setupSearchFilters(onChange: () => void): void {
  const bar = $("search-filters");
  bar.innerHTML = "";
  for (const filter of FILTERS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "search-filter-btn";
    btn.dataset.duration = filter.id;
    btn.textContent = filter.label;
    btn.setAttribute("role", "radio");
    btn.addEventListener("click", () => {
      setSearchDurationFilter(filter.id);
      syncSearchFilterButtons();
      onChange();
    });
    bar.appendChild(btn);
  }
  syncSearchFilterButtons();
}

export function syncSearchFilterVisibility(): void {
  setPanelHidden($("search-filters"), getActiveTab() !== "search");
}

function syncSearchFilterButtons(): void {
  const active = getSearchDurationFilter();
  $("search-filters").querySelectorAll<HTMLButtonElement>(".search-filter-btn").forEach((btn) => {
    const isActive = btn.dataset.duration === active;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-checked", isActive ? "true" : "false");
  });
}

export { applySearchDurationFilter };
