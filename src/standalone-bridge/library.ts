import { handleLibraryAction, type LibraryAction } from "../library/handlers";
import { fetchTranscript } from "../transcript";
import { getBookmarksForVideo } from "../browse/store/bookmarks";
import { getLastWatchUrl } from "../preferences";
import { getYouTubeVideoId } from "../youtube";
import { postToStandalone } from "./state";

export function registerStandaloneLibraryHandlers(
  proxyToPlayer: (action: string, data: unknown) => void,
): void {
  const { standaloneWindow } = iina;

  standaloneWindow.onMessage("libraryAction", (data: LibraryAction) => {
    handleLibraryAction(data, postToStandalone);
  });

  standaloneWindow.onMessage("requestTranscript", (data: { watchUrl?: string }) => {
    void handleStandaloneTranscript(data?.watchUrl);
  });

  standaloneWindow.onMessage("requestBookmarks", (data: { videoId?: string }) => {
    const videoId = data?.videoId || "";
    if (!videoId) {
      return;
    }
    postToStandalone("bookmarks", {
      videoId,
      items: getBookmarksForVideo(videoId),
    });
  });

  standaloneWindow.onMessage("setPlaybackSpeed", (data: { speed?: number }) => {
    proxyToPlayer("setPlaybackSpeed", data);
  });

  standaloneWindow.onMessage("setSleepTimer", (data: { minutes?: number }) => {
    proxyToPlayer("setSleepTimer", data);
  });
}

async function handleStandaloneTranscript(watchUrl?: string): Promise<void> {
  const url = watchUrl?.trim() || getLastWatchUrl();
  const videoId = getYouTubeVideoId(url) || "";
  if (!videoId) {
    postToStandalone("transcript", { videoId: "", cues: [], error: "No video" });
    return;
  }
  postToStandalone("transcript", { videoId, loading: true });
  try {
    const cues = await fetchTranscript(url);
    postToStandalone("transcript", { videoId, cues });
  } catch (err) {
    postToStandalone("transcript", { videoId, cues: [], error: String(err) });
  }
}
