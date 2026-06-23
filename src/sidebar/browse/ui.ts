import type { FeedTab, SubsFilter } from "../../browse/types";
import { $ } from "../dom";
import { createSkeletonRows } from "../feed-row";

const SECTION_LABELS: Record<string, string> = {
  relevant: "Most relevant",
  shorts: "Shorts",
  uploads: "All uploads",
};

export function sectionLabel(sectionId: string): string {
  return SECTION_LABELS[sectionId] || sectionId;
}

export function formatFeedCount(count: number): string {
  return `${count} video${count === 1 ? "" : "s"}`;
}

export function setFeedRefreshSpinning(spinning: boolean): void {
  const btn = $("feed-refresh");
  btn.classList.toggle("spinning", spinning);
  if (spinning) {
    btn.setAttribute("aria-busy", "true");
  } else {
    btn.removeAttribute("aria-busy");
  }
}

export function setStatus(text: string, isError = false): void {
  const el = $("feed-status");
  el.textContent = text;
  el.classList.toggle("error", isError);
}

export function clearStatus(): void {
  setStatus("");
}

export function setFeedBusy(busy: boolean): void {
  const listEl = $("feed-list");
  if (busy) {
    listEl.setAttribute("aria-busy", "true");
  } else {
    listEl.removeAttribute("aria-busy");
  }
}

export function setSearchBusy(busy: boolean): void {
  const searchRow = document.querySelector(".search-row");
  if (busy) {
    searchRow?.setAttribute("aria-busy", "true");
  } else {
    searchRow?.removeAttribute("aria-busy");
  }
}

export function updateSegButtons(activeTab: FeedTab): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".segmented .seg-btn");
  buttons.forEach((btn) => {
    const tab = btn.dataset.tab as FeedTab | undefined;
    const isActive = tab === activeTab;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

export function updateSubsFilterUI(activeTab: FeedTab, activeFilter: SubsFilter): void {
  const bar = $("subs-filter");
  const show = activeTab === "subscriptions";
  bar.classList.toggle("hidden", !show);

  const buttons = bar.querySelectorAll<HTMLButtonElement>(".subs-filter-btn");
  buttons.forEach((btn) => {
    const filter = btn.dataset.subsFilter as SubsFilter | undefined;
    const isActive = filter === activeFilter;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

export function renderSkeleton(): void {
  const listEl = $("feed-list");
  listEl.innerHTML = "";
  listEl.appendChild(createSkeletonRows(5));
}
