export interface PlayerUiState {
  currentWatchUrl: string;
  lastRenderedDescription: string;
  renderedRelatedVideoId: string;
  renderedRelatedHasItems: boolean;
  lastAcceptedRelatedRequestId: number;
  relatedSelectedIndex: number;
  relatedLoadVideoId: string;
  lastPosition: number;
}

export const playerState: PlayerUiState = {
  currentWatchUrl: "",
  lastRenderedDescription: "",
  renderedRelatedVideoId: "",
  renderedRelatedHasItems: false,
  lastAcceptedRelatedRequestId: 0,
  relatedSelectedIndex: -1,
  relatedLoadVideoId: "",
  lastPosition: 0,
};

export function resetRelatedPreviewCache(): void {
  playerState.renderedRelatedVideoId = "";
  playerState.renderedRelatedHasItems = false;
  playerState.relatedSelectedIndex = -1;
}
