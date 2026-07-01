import { setPanelHidden } from "../dom";

const STORAGE_KEY = "youtube-safari-shorts-layout";

export type ShortsLayout = "list" | "grid";

export function getShortsLayout(): ShortsLayout {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return value === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

export function setShortsLayout(layout: ShortsLayout): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, layout);
  } catch {
    // ignore
  }
}

export function applyShortsLayoutClass(listEl: HTMLElement, tab: string): void {
  const show = tab === "shorts";
  listEl.classList.toggle("feed-list--shorts-grid", show && getShortsLayout() === "grid");
  listEl.classList.toggle("feed-list--shorts-list", show && getShortsLayout() === "list");
}

export function setupShortsLayoutToggle(onChange: () => void): void {
  const bar = document.getElementById("shorts-layout");
  if (!bar) {
    return;
  }

  const sync = () => {
    const layout = getShortsLayout();
    bar.querySelectorAll<HTMLButtonElement>(".shorts-layout-btn").forEach((btn) => {
      const active = btn.dataset.layout === layout;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-checked", active ? "true" : "false");
    });
  };

  bar.querySelectorAll<HTMLButtonElement>(".shorts-layout-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const layout = btn.dataset.layout as ShortsLayout | undefined;
      if (!layout || layout === getShortsLayout()) {
        return;
      }
      setShortsLayout(layout);
      sync();
      onChange();
    });
  });

  sync();
}

export function updateShortsLayoutVisibility(activeTab: string): void {
  const bar = document.getElementById("shorts-layout");
  if (!bar) {
    return;
  }
  setPanelHidden(bar, activeTab !== "shorts");
}
