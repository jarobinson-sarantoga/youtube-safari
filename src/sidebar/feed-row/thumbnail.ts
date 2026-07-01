import type { FeedItem } from "../../browse/types";
import { youtubeShortThumbnailUrl, youtubeThumbnailUrl } from "../../youtube";
import type { FeedRowBackgroundHandler } from "./types";

interface ThumbnailOptions {
  item: FeedItem;
  index: number;
  showDuration: boolean;
  showResume: boolean;
  showBackgroundPlay: boolean;
  portrait?: boolean;
  onBackgroundPlay?: FeedRowBackgroundHandler;
}

export function createThumbnail(options: ThumbnailOptions): HTMLElement {
  const {
    item,
    index,
    showDuration,
    showResume,
    showBackgroundPlay,
    portrait = false,
    onBackgroundPlay,
  } = options;

  const usePortrait = portrait || !!item.isShort;
  const thumbWrap = document.createElement("div");
  thumbWrap.className = usePortrait ? "thumb-wrap thumb-wrap--portrait" : "thumb-wrap";

  const thumb = document.createElement("img");
  thumb.className = "feed-thumb";
  const landscapeThumb = youtubeThumbnailUrl(item.videoId);
  const portraitThumb = youtubeShortThumbnailUrl(item.videoId);
  const primaryThumb = usePortrait
    ? item.thumbnailUrl || portraitThumb
    : item.thumbnailUrl || landscapeThumb;
  const fallbackThumb = usePortrait ? landscapeThumb : portraitThumb;
  thumb.src = primaryThumb;
  thumb.alt = item.title;
  thumb.loading = "lazy";
  thumb.addEventListener("error", () => {
    if (thumb.src !== fallbackThumb) {
      thumb.src = fallbackThumb;
    }
  });

  thumbWrap.appendChild(thumb);

  const playHint = document.createElement("span");
  playHint.className = "thumb-play-hint";
  playHint.setAttribute("aria-hidden", "true");
  thumbWrap.appendChild(playHint);

  if (showBackgroundPlay && onBackgroundPlay) {
    const actions = document.createElement("div");
    actions.className = "thumb-actions";

    const bgPlay = document.createElement("button");
    bgPlay.type = "button";
    bgPlay.className = "thumb-action-btn thumb-bg-play";
    bgPlay.setAttribute("aria-label", "Listen in background");
    bgPlay.title = "Listen in background (L)";
    bgPlay.tabIndex = -1;
    bgPlay.innerHTML =
      '<span class="thumb-bg-play-icon" aria-hidden="true"></span><span class="thumb-action-label">Listen</span>';
    bgPlay.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onBackgroundPlay(item, index);
    });
    actions.appendChild(bgPlay);

    thumbWrap.appendChild(actions);
  }

  if (showDuration && item.durationLabel) {
    const badge = document.createElement("span");
    badge.className = "duration-badge";
    badge.textContent = item.durationLabel;
    thumbWrap.appendChild(badge);
  }

  if (showResume && typeof item.resumeSeconds === "number" && item.resumeSeconds > 0) {
    const resume = document.createElement("span");
    resume.className = "resume-badge";
    resume.textContent = "Resume";
    thumbWrap.appendChild(resume);
  }

  return thumbWrap;
}
