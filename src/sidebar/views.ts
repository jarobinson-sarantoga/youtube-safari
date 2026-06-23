import { ensureBrowseFeedLoaded } from "./browse";
import { isPanelBooting, queueBootView } from "./boot";
import { bindArrowNav } from "./arrow-nav";
import { $ } from "./dom";
import { onPluginMessage, postToPlugin } from "./messaging";
import { requestRelatedPreviewForCurrentWatch } from "./player";

export type ShellView = "browse" | "player";

export type SetActiveViewOptions = {
  /** Skip panel metadata refresh (e.g. right after play — player pushes updates). */
  skipPanelRefresh?: boolean;
};

let activeView: ShellView = "player";
let syncViewTabindex: () => void = () => {};

export function getActiveView(): ShellView {
  return activeView;
}

function schedulePanelRefresh(): void {
  window.setTimeout(() => {
    postToPlugin("refreshPanel", {});
  }, 0);
}

function activeViewIndex(): number {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>(".view-btn")];
  return tabs.findIndex((btn) => btn.classList.contains("active"));
}

export function setActiveView(view: ShellView, options?: SetActiveViewOptions): void {
  if (isPanelBooting()) {
    queueBootView(view);
    return;
  }
  activeView = view;

  const buttons = document.querySelectorAll<HTMLButtonElement>(".view-btn");
  buttons.forEach((btn) => {
    const isActive = btn.dataset.view === view;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
    btn.setAttribute(
      "aria-controls",
      btn.dataset.view === "browse" ? "browse-view" : "player-view",
    );
  });
  syncViewTabindex();

  const browseView = $("browse-view");
  const playerView = $("player-view");

  if (view === "browse") {
    browseView.classList.add("active");
    browseView.hidden = false;
    playerView.classList.remove("active");
    playerView.hidden = true;
    ensureBrowseFeedLoaded();
  } else {
    playerView.classList.add("active");
    playerView.hidden = false;
    browseView.classList.remove("active");
    browseView.hidden = true;
    if (!options?.skipPanelRefresh) {
      schedulePanelRefresh();
    }
    requestRelatedPreviewForCurrentWatch();
  }
}

export function setupViewNav(): void {
  onPluginMessage("focusPlayer", () => {
    if (isPanelBooting()) {
      queueBootView("player");
      return;
    }
    setActiveView("player");
    const qualityList = $("quality-list") as HTMLSelectElement;
    qualityList.focus();
  });

  const nav = document.querySelector<HTMLElement>(".view-nav");
  if (!nav) {
    return;
  }

  const buttons = document.querySelectorAll<HTMLButtonElement>(".view-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view as ShellView | undefined;
      if (view === "browse" || view === "player") {
        setActiveView(view);
      }
    });
  });

  ({ syncTabindex: syncViewTabindex } = bindArrowNav({
    container: nav,
    itemSelector: ".view-btn",
    getActiveIndex: activeViewIndex,
    rovingTabindex: true,
    onMove: (index) => {
      const tabs = [...document.querySelectorAll<HTMLButtonElement>(".view-btn")];
      const view = tabs[index]?.dataset.view as ShellView | undefined;
      if (view === "browse" || view === "player") {
        setActiveView(view);
      }
    },
  }));
}
