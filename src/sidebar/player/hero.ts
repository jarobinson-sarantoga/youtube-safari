import type { FeedItem } from "../../browse/types";
import { getYouTubeVideoId, youtubeThumbnailUrl, youtubeWatchUrl } from "../../youtube";
import { IDLE_COPY } from "../copy";
import { $ } from "../dom";
import { playerState } from "./state";

export function getCurrentWatchUrl(): string {
  return playerState.currentWatchUrl;
}

export function getDisplayedHeroTitle(): string {
  const title = ($("video-title").textContent || "").trim();
  if (!title || title === "No YouTube video" || title === "YouTube video") {
    return "";
  }
  return title;
}

export function updateHero(title: string, watchUrl: string): void {
  const titleEl = $("video-title");
  const subEl = $("player-hero-sub");
  const thumbEl = $("player-thumb") as HTMLImageElement;
  const resolvedUrl = watchUrl || playerState.currentWatchUrl;
  const videoId = getYouTubeVideoId(resolvedUrl) || "";
  const hasVideo = !!(title || videoId);

  titleEl.textContent = title || (hasVideo ? "YouTube video" : "No YouTube video");

  if (!hasVideo) {
    subEl.textContent = IDLE_COPY.heroSub;
    thumbEl.classList.add("hidden");
    thumbEl.removeAttribute("src");
    thumbEl.alt = "";
    return;
  }

  if (videoId) {
    const thumbUrl = youtubeThumbnailUrl(videoId);
    if (thumbEl.src !== thumbUrl) {
      thumbEl.src = thumbUrl;
    }
    thumbEl.alt = title || "Video thumbnail";
    thumbEl.classList.remove("hidden");
  } else {
    thumbEl.classList.add("hidden");
    thumbEl.removeAttribute("src");
    thumbEl.alt = "";
  }

  subEl.textContent = "Now playing in IINA";
}

export function applyWatchUrlToNowPlaying(watchUrl: string): void {
  if (!watchUrl) {
    return;
  }
  playerState.currentWatchUrl = watchUrl;
  updateHero(getDisplayedHeroTitle(), watchUrl);
}

/** Optimistic Now Playing hero while playback is starting. */
export function previewNowPlayingFromFeed(item: FeedItem): void {
  const watchUrl = youtubeWatchUrl(item.videoId);
  playerState.currentWatchUrl = watchUrl;
  updateHero(item.title, watchUrl);
}
