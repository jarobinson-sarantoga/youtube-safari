import { getLastWatchUrl } from "../preferences";
import { appendLog } from "../ytdl";
import { isYouTubeWatchURL } from "../youtube";
import { openLinkedUrl, seekPlayback } from "../youtube-open";
import { postRelatedPreview } from "../related-preview-bridge";
import { pushNowPlayingUpdate } from "../quality-ui";
import { handlePanelProxy } from "../quality-ui/panel-proxy";
import { sidebarHostState } from "./state";

const { sidebar } = iina;

/** IINA clears sidebar.onMessage listeners when loadFile runs — re-register after each load. */
export function registerPluginSidebarListeners(): void {
  sidebar.onMessage("selectQuality", (data: { height?: number }) => {
    appendLog(`selectQuality received: ${JSON.stringify(data)}`);
    const height = data?.height;
    if (typeof height === "number") {
      sidebarHostState.handlers?.onSelectQuality(height);
    }
  });

  function handleDescriptionSeek(data: { seconds?: number | string } | undefined): void {
    appendLog(`descriptionSeek received: ${JSON.stringify(data)}`);
    let seconds = data?.seconds;
    if (typeof seconds === "string") {
      seconds = Number.parseFloat(seconds);
    }
    if (typeof seconds !== "number" || seconds < 0 || !Number.isFinite(seconds)) {
      appendLog("descriptionSeek ignored: invalid seconds");
      return;
    }
    seekPlayback(seconds, "description");
  }

  sidebar.onMessage("descriptionSeek", handleDescriptionSeek);
  sidebar.onMessage("seek", handleDescriptionSeek);

  sidebar.onMessage("openUrl", (data: { url?: string }) => {
    const url = data?.url;
    if (typeof url !== "string") {
      return;
    }
    openLinkedUrl(url);
  });

  sidebar.onMessage("requestRelatedPreview", (data: {
    force?: boolean;
    watchUrl?: string;
  } | undefined) => {
    const requested = data?.watchUrl?.trim() || "";
    const watchUrl =
      requested && isYouTubeWatchURL(requested) ? requested : getLastWatchUrl();
    postRelatedPreview(watchUrl, !!data?.force);
  });

  sidebar.onMessage("refreshPanel", () => {
    sidebarHostState.handlers?.onRefreshPanel();
  });

  sidebar.onMessage("syncNowPlaying", () => {
    pushNowPlayingUpdate();
  });

  sidebar.onMessage("setPlaybackSpeed", (data: { speed?: number }) => {
    handlePanelProxy({ action: "setPlaybackSpeed", data });
  });

  sidebar.onMessage("setSleepTimer", (data: { minutes?: number }) => {
    handlePanelProxy({ action: "setSleepTimer", data });
  });

  sidebar.onMessage("libraryAction", (data: unknown) => {
    handlePanelProxy({ action: "libraryAction", data });
  });

  sidebar.onMessage("requestTranscript", (data: unknown) => {
    handlePanelProxy({ action: "requestTranscript", data });
  });

  sidebar.onMessage("requestBookmarks", (data: unknown) => {
    handlePanelProxy({ action: "requestBookmarks", data });
  });
}
