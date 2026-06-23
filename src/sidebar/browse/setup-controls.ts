import type { FeedTab, SubsFilter } from "../../browse/types";
import {
  getActiveSubsFilter,
  getActiveTab,
  isSubsFilterLoaded,
  refreshCurrentFeed,
  requestFeed,
  switchSegmentTab,
} from "../feed-controller";
import { bindArrowNav } from "../arrow-nav";
import { $ } from "../dom";
import { runSearch } from "./playback";
import { updateSegButtons, updateSubsFilterUI } from "./ui";

let syncSegTabindex: () => void = () => {};
let syncSubsTabindex: () => void = () => {};

export function syncBrowseControls(): void {
  updateSegButtons(getActiveTab());
  updateSubsFilterUI(getActiveTab(), getActiveSubsFilter());
  syncSegTabindex();
  syncSubsTabindex();
}

function activeSegIndex(): number {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>(".segmented .seg-btn")];
  return tabs.findIndex((btn) => btn.classList.contains("active"));
}

function activeSubsIndex(): number {
  const bar = $("subs-filter");
  const tabs = [...bar.querySelectorAll<HTMLButtonElement>(".subs-filter-btn")];
  return tabs.findIndex((btn) => btn.classList.contains("active"));
}

export function setupTabs(): void {
  const segmented = document.querySelector<HTMLElement>(".segmented");
  if (!segmented) {
    return;
  }

  segmented.querySelectorAll<HTMLButtonElement>(".seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab as FeedTab | undefined;
      if (tab) {
        switchSegmentTab(tab);
      }
    });
  });

  ({ syncTabindex: syncSegTabindex } = bindArrowNav({
    container: segmented,
    itemSelector: ".seg-btn",
    getActiveIndex: activeSegIndex,
    rovingTabindex: true,
    onMove: (index) => {
      const tabs = [...document.querySelectorAll<HTMLButtonElement>(".segmented .seg-btn")];
      const tab = tabs[index]?.dataset.tab as FeedTab | undefined;
      if (tab) {
        switchSegmentTab(tab);
      }
    },
  }));
}

export function setupSubsFilter(): void {
  const bar = $("subs-filter");
  bar.querySelectorAll<HTMLButtonElement>(".subs-filter-btn").forEach((btn) => {
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

  ({ syncTabindex: syncSubsTabindex } = bindArrowNav({
    container: bar,
    itemSelector: ".subs-filter-btn",
    getActiveIndex: activeSubsIndex,
    rovingTabindex: true,
    onMove: (index) => {
      if (getActiveTab() !== "subscriptions") {
        return;
      }
      const tabs = [...bar.querySelectorAll<HTMLButtonElement>(".subs-filter-btn")];
      const filter = tabs[index]?.dataset.subsFilter as SubsFilter | undefined;
      if (!filter) {
        return;
      }
      if (filter === getActiveSubsFilter() && isSubsFilterLoaded(filter)) {
        return;
      }
      requestFeed("subscriptions", "", filter);
    },
  }));
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
