export type PlayerCoordinator = {
  getActivePlayerId: () => number | null;
  setActivePlayerId: (id: number | null) => void;
  isPlayerConfirmedReady: () => boolean;
  setPlayerConfirmedReady: (ready: boolean) => void;
  getLivePlayerCount?: () => number;
};

export type OpenYouTubeWatchOptions = {
  background?: boolean;
};

export type PendingWatchRequest = {
  url: string | null;
  background: boolean;
};
