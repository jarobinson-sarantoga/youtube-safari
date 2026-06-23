import type { QualityItem } from "../../qualities";
import { $ } from "../dom";
import { postToPlugin } from "../messaging";

export function renderQualities(items: QualityItem[], selected: number, loading = false): void {
  const selectEl = $("quality-list") as HTMLSelectElement;
  selectEl.innerHTML = "";

  for (const item of items) {
    const option = document.createElement("option");
    option.value = String(item.height);
    option.textContent = item.label;
    if (item.height === selected) {
      option.selected = true;
    }
    selectEl.appendChild(option);
  }

  selectEl.disabled = items.length === 0 || loading;
  if (loading) {
    selectEl.setAttribute("aria-busy", "true");
  } else {
    selectEl.removeAttribute("aria-busy");
  }
}

export function setupQualitySelect(): void {
  const selectEl = $("quality-list") as HTMLSelectElement;
  selectEl.addEventListener("change", () => {
    const height = Number.parseInt(selectEl.value, 10);
    if (!Number.isNaN(height)) {
      postToPlugin("selectQuality", { height });
    }
  });
}
