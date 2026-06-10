import { $ } from "./dom";
import { postToPlugin } from "./messaging";
import { beginRelatedPreviewLoad, getCurrentWatchUrl, hasCachedRelatedPreview } from "./player";

export type ShellView = "browse" | "player";

let activeView: ShellView = "player";

export function getActiveView(): ShellView {
  return activeView;
}

export function setActiveView(view: ShellView): void {
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
  } else {
    playerView.classList.add("active");
    playerView.hidden = false;
    browseView.classList.remove("active");
    browseView.hidden = true;
    const watchUrl = getCurrentWatchUrl();
    if (!hasCachedRelatedPreview(watchUrl)) {
      beginRelatedPreviewLoad();
      postToPlugin("requestRelatedPreview", {});
    }
  }
}

export function setupViewNav(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".view-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view as ShellView | undefined;
      if (view === "browse" || view === "player") {
        setActiveView(view);
      }
    });
  });
}