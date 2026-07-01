import { getLastWatchUrl } from "../preferences";
import { getSelectedHeight } from "../qualities";
import { DEFAULT_QUALITY_OPTIONS, defaultPanelPayload } from "../sidebar-state";
import { suppressNextWatchEnd } from "../browse/store/history";
import { heightLabel } from "../format";
import { replaceQualityMenu } from "../native-menus";
import { appendLog } from "../ytdl";
import { isYouTubeWatchURL } from "../youtube";
import { setPendingSeek } from "../youtube-open";
import { buildPanelPayload, postSidebarPanel } from "../sidebar-host";
import { exitShortsQueue, getActiveShortsQueue, openShortsQueue } from "../shorts-queue";
import { scheduleRefreshQualityUI } from "./refresh";

const { core, mpv, preferences } = iina;

export async function switchQuality(height: number): Promise<void> {
  const watchUrl = getLastWatchUrl();

  preferences.set("quality_height", height);
  preferences.sync();
  appendLog(`Quality switched to ${heightLabel(height)} (${height})`);

  if (!watchUrl || !isYouTubeWatchURL(watchUrl)) {
    core.osd(`Default quality: ${heightLabel(height)}`);
    replaceQualityMenu(DEFAULT_QUALITY_OPTIONS, height, (h) => {
      void switchQuality(h);
    });
    postSidebarPanel(defaultPanelPayload(height));
    return;
  }

  const position = mpv.getNumber("time-pos") || 0;
  const duration = mpv.getNumber("duration") || 0;
  const resumeAt =
    duration > 0 ? Math.min(position, Math.max(0, duration - 0.5)) : position;
  if (resumeAt > 0) {
    setPendingSeek(resumeAt);
    appendLog(`Quality reload will resume at ${resumeAt}s`);
  }

  core.osd(`Quality: ${heightLabel(height)}`);
  suppressNextWatchEnd();

  const active = getActiveShortsQueue();
  if (active) {
    const pos = Math.max(0, mpv.getNumber("playlist-pos") || 0);
    const index = Math.min(pos, active.videoIds.length - 1);
    exitShortsQueue();
    openShortsQueue(active.videoIds, index, active.source);
    scheduleRefreshQualityUI();
    return;
  }

  mpv.command("loadfile", [watchUrl, "replace"]);
  scheduleRefreshQualityUI();
}
