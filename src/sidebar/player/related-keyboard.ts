import { $ } from "../dom";
import { updateRelatedSelection } from "./related-selection";
import { playerState } from "./state";

export function setupRelatedKeyboard(): void {
  const relatedEl = $("related-preview");

  relatedEl.addEventListener("keydown", (event) => {
    if (document.activeElement !== relatedEl) {
      return;
    }

    const rows = relatedEl.querySelectorAll<HTMLElement>(".related-row");
    if (!rows.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      playerState.relatedSelectedIndex = Math.min(
        rows.length - 1,
        playerState.relatedSelectedIndex + 1,
      );
      updateRelatedSelection();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      playerState.relatedSelectedIndex = Math.max(
        0,
        playerState.relatedSelectedIndex < 0 ? 0 : playerState.relatedSelectedIndex - 1,
      );
      updateRelatedSelection();
    } else if (event.key === "Enter" && playerState.relatedSelectedIndex >= 0) {
      event.preventDefault();
      rows[playerState.relatedSelectedIndex]?.click();
    } else if (
      (event.key === "l" || event.key === "L") &&
      playerState.relatedSelectedIndex >= 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      event.preventDefault();
      const bgBtn =
        rows[playerState.relatedSelectedIndex]?.querySelector<HTMLButtonElement>(".thumb-action-btn");
      bgBtn?.click();
    }
  });

  relatedEl.addEventListener("focus", () => {
    const rows = relatedEl.querySelectorAll<HTMLElement>(".related-row");
    if (!rows.length) {
      return;
    }
    if (playerState.relatedSelectedIndex < 0) {
      playerState.relatedSelectedIndex = 0;
      updateRelatedSelection();
    }
  });
}
