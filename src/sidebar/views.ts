import { ensureBrowseFeedLoaded } from "./browse";
import { isPanelBooting, queueBootView } from "./boot";
import { $ } from "./dom";
import { onPluginMessage, postToPlugin } from "./messaging";
import { requestRelatedPreviewForCurrentWatch } from "./player";

export type ShellView = "browse" | "player";

export type SetActiveViewOptions = {
  /** Skip panel metadata refresh (e.g. right after play — player pushes updates). */
  skipPanelRefresh?: boolean;
};

let activeView: ShellView = "player";

export function getActiveView(): ShellView {
  return activeView;
}

function schedulePanelRefresh(): void {
  window.setTimeout(() => {
    postToPlugin("refreshPanel", {});
  }, 0);
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
  });

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
  const buttons = document.querySelectorAll<HTMLButtonElement>(".view-btn");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view as ShellView | undefined;
      if (view === "browse" || view === "player") {
        setActiveView(view);
      }
    });
  });

  nav?.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    const tabs = [...document.querySelectorAll<HTMLButtonElement>(".view-btn")];
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

    const view = tabs[nextIndex].dataset.view as ShellView | undefined;
    if (view === "browse" || view === "player") {
      setActiveView(view);
      tabs[nextIndex].focus();
    }
  });
}