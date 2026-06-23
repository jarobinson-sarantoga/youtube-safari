import type { PlayerStateMessage } from "../../browse/messages";
import type { PanelPayload } from "../../sidebar-state";
import { DEFAULT_QUALITY_OPTIONS } from "../../sidebar-state";
import { getYouTubeVideoId } from "../../youtube";
import { $ , createRetryButton } from "../dom";
import { postToPlugin } from "../messaging";
import { renderChapters } from "./chapters";
import { updateDescriptionSection } from "./description";
import { getDisplayedHeroTitle, updateHero } from "./hero";
import { coercePlaybackSeconds } from "./playback-time";
import { updateProgress } from "./progress";
import { renderQualities } from "./quality";
import { requestRelatedPreviewForCurrentWatch } from "./related-request";
import { playerState } from "./state";

export function renderPanel(data: PanelPayload): void {
  const statusEl = $("quality-status");

  const title = data.title || "";
  const description = data.description || "";
  const chapters = data.chapters || [];
  const items = data.items?.length ? data.items : DEFAULT_QUALITY_OPTIONS;
  const selected = typeof data.selected === "number" ? data.selected : 0;
  const loading = !!data.loading;
  const watchUrl = data.watchUrl || "";
  playerState.currentWatchUrl = watchUrl;
  const watchVideoId = getYouTubeVideoId(watchUrl) || "";

  if (watchVideoId && watchVideoId !== playerState.renderedRelatedVideoId) {
    requestRelatedPreviewForCurrentWatch();
  }

  updateHero(title, watchUrl);
  renderChapters(chapters, !!title);
  updateDescriptionSection(description, !!title);

  statusEl.innerHTML = "";
  statusEl.classList.remove("error");
  if (loading) {
    statusEl.textContent = "Updating…";
    statusEl.classList.add("visible");
  } else if (data.error) {
    statusEl.classList.add("visible", "error");
    statusEl.textContent = data.error;
    statusEl.appendChild(document.createTextNode(" "));
    statusEl.appendChild(createRetryButton(() => postToPlugin("refreshPanel", {}), "quality-retry feed-retry"));
  } else {
    statusEl.classList.remove("visible");
  }

  renderQualities(items, selected, loading);
}

export function handlePlayerState(state: PlayerStateMessage): void {
  const title = state.title || "";
  const watchUrl = state.watchUrl || "";
  const position = coercePlaybackSeconds(state.position);
  const duration = coercePlaybackSeconds(state.duration);
  const paused = !!state.paused;

  if (watchUrl) {
    playerState.currentWatchUrl = watchUrl;
  }

  const resolvedTitle = title || getDisplayedHeroTitle();
  if (resolvedTitle || watchUrl || playerState.currentWatchUrl) {
    updateHero(resolvedTitle, watchUrl || playerState.currentWatchUrl);
  }

  updateProgress(position, duration, paused);
}
