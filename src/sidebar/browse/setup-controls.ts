import type { FeedTab, SubsFilter } from "../../browse/types";
import {
  getActiveSubsFilter,
  getActiveTab,
  isSubsFilterLoaded,
  refreshCurrentFeed,
  requestFeed,
  switchSegmentTab,
} from "../feed-controller";
import { $ } from "../dom";
import { runSearch } from "./playback";
import { updateSegButtons, updateSubsFilterUI } from "./ui";

export function syncBrowseControls(): void {
  updateSegButtons(getActiveTab());
  updateSubsFilterUI(getActiveTab(), getActiveSubsFilter());
}

export function setupTabs(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".segmented .seg-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab as FeedTab | undefined;
      if (tab) {
        switchSegmentTab(tab);
      }
    });
  });

  const segmented = document.querySelector<HTMLElement>(".segmented");
  segmented?.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    const tabs = [...document.querySelectorAll<HTMLButtonElement>(".segmented .seg-btn")];
    const currentIndex = tabs.findIndex((btn) => btn.classList.contains("active"));
    if (currentIndex < 0) {
      return;
    }
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = currentIndex + delta;
    if (nextIndex < 0 || nextIndex >= tabs.length) {
      return;
    }
    const tab = tabs[nextIndex].dataset.tab as FeedTab | undefined;
    if (tab) {
      switchSegmentTab(tab);
      tabs[nextIndex].focus();
    }
  });
}

export function setupSubsFilter(): void {
  const bar = $("subs-filter");
  const buttons = bar.querySelectorAll<HTMLButtonElement>(".subs-filter-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.subsFilter as SubsFilter | undefined;
      if (!filter || getActiveTab() !== "subscriptions") {
        return;
      }
      if (filter === getActiveSubsFilter() && isSubsFilterLoaded(filter)) {
        return;
      }
      requestFeed("subscriptions", "", filter);
    });
  });

  bar.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    if (getActiveTab() !== "subscriptions") {
      return;
    }

    const tabs = [...bar.querySelectorAll<HTMLButtonElement>(".subs-filter-btn")];
    const currentIndex = tabs.findIndex((btn) => btn.classList.contains("active"));
    if (currentIndex < 0) {
      return;
    }

    event.preventDefault();
    const nextIndex = currentIndex + (event.key === "ArrowRight" ? 1 : -1);
    if (nextIndex < 0 || nextIndex >= tabs.length) {
      return;
    }
    const filter = tabs[nextIndex].dataset.subsFilter as SubsFilter | undefined;
    if (!filter) {
      return;
    }
    if (filter === getActiveSubsFilter() && isSubsFilterLoaded(filter)) {
      tabs[nextIndex].focus();
      return;
    }
    requestFeed("subscriptions", "", filter);
    tabs[nextIndex].focus();
  });
}

export function setupSearch(): void {
  const input = $("search-input") as HTMLInputElement;
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      input.blur();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      runSearch(syncBrowseControls);
    }
  });
}

export function setupRefresh(): void {
  $("feed-refresh").addEventListener("click", () => refreshCurrentFeed());
}
