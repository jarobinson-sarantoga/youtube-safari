import {
  requestBackgroundPlayerWindow,
  restoreForegroundPlayerWindow,
  retireBackgroundPlayerWindow,
} from "../background-play";
import { closeManagedPlayerWindow } from "../player-close";
import { openLinkedUrl } from "../youtube-open";
import {
  bumpPlayGeneration,
  shouldHonorClose,
  syncPlayGeneration,
} from "../lifecycle";
import { pushNowPlayingUpdate, cancelScheduledRefresh } from "../quality-ui";
import { appendLog } from "../ytdl";

const { global } = iina;

type OpenWatchData = {
  url?: string;
  background?: boolean;
  playGeneration?: number;
};

type CloseManagedData = {
  allowWindowQuit?: boolean;
  playGeneration?: number;
};

export type PlayerMessageDeps = {
  bootIdle: boolean;
  setIdleBootstrapDone: (done: boolean) => void;
  setActivePlaybackBackground: (background: boolean) => void;
};

export type PlayerMessageHandlers = {
  openYouTubeWatch: (data: OpenWatchData) => void;
  suppressIdleBootstrap: () => void;
  retireBackgroundPlayer: () => void;
  closeManagedPlayer: (data?: CloseManagedData) => void;
  syncNowPlaying: () => void;
  globalPing: () => void;
};

export function createPlayerMessageHandlers(
  deps: PlayerMessageDeps,
): PlayerMessageHandlers {
  return {
    openYouTubeWatch: (data) => {
      const url = data?.url;
      if (typeof url !== "string" || !url.trim()) {
        return;
      }
      if (typeof data.playGeneration === "number") {
        syncPlayGeneration(data.playGeneration);
      } else {
        bumpPlayGeneration();
      }
      deps.setIdleBootstrapDone(true);
      deps.setActivePlaybackBackground(!!data.background);
      cancelScheduledRefresh();
      if (data.background) {
        requestBackgroundPlayerWindow();
        openLinkedUrl(url.trim());
        return;
      }
      restoreForegroundPlayerWindow();
      openLinkedUrl(url.trim(), { replace: true });
    },

    suppressIdleBootstrap: () => {
      deps.setIdleBootstrapDone(true);
    },

    retireBackgroundPlayer: () => {
      retireBackgroundPlayerWindow();
    },

    closeManagedPlayer: (data) => {
      if (!shouldHonorClose(data?.playGeneration)) {
        appendLog(
          `closeManagedPlayer ignored (stale gen ${data?.playGeneration ?? "?"} < current)`,
        );
        return;
      }
      closeManagedPlayerWindow(data);
    },

    syncNowPlaying: () => {
      pushNowPlayingUpdate();
    },

    globalPing: () => {
      const label =
        typeof global.getLabel === "function" ? global.getLabel() : "";
      global.postMessage("playerReady", { idle: deps.bootIdle, label });
      appendLog(`Posted playerReady (ping, idle=${deps.bootIdle}, label=${label || "default"})`);
    },
  };
}
