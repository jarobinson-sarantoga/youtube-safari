import type { FeedItem } from "../browse/types";
import type { PlayerStateMessage } from "../browse/messages";
import type { DescriptionChapter } from "../description-chapters";
import type { QualityItem } from "../qualities";
import type { PanelPayload } from "../sidebar-state";
import { DEFAULT_QUALITY_OPTIONS } from "../sidebar-state";
import { getYouTubeVideoId, youtubeThumbnailUrl, youtubeWatchUrl } from "../youtube";
import { $, escapeHtml, formatClock } from "./dom";
import { createFeedRow, createSkeletonRows } from "./feed-row";
import { onPluginMessage, postToPlugin } from "./messaging";

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, "&#39;");
}

function trimUrlTrailingPunctuation(url: string): string {
  return url.replace(/[),.;:!?]+$/g, "");
}

function formatInlineRich(text: string): string {
  let out = "";
  const re = /(https?:\/\/[^\s<]+)|(^|[^\w/])(#[\w\u00C0-\u024F\u0400-\u04FF]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    out += escapeHtml(text.slice(last, match.index));
    if (match[1]) {
      const rawUrl = trimUrlTrailingPunctuation(match[1]);
      const trimmed = match[1].length - rawUrl.length;
      if (trimmed > 0) {
        re.lastIndex -= trimmed;
      }
      out += `<a class="desc-link" href="#" data-url="${escapeAttr(rawUrl)}">${escapeHtml(rawUrl)}</a>`;
    } else if (match[3]) {
      const tagUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(match[3])}`;
      out += `${escapeHtml(match[2])}<a class="desc-tag desc-link" href="#" data-url="${escapeAttr(tagUrl)}">${escapeHtml(match[3])}</a>`;
    }
    last = re.lastIndex;
  }

  out += escapeHtml(text.slice(last));
  return out;
}

function bindDescriptionLinks(root: HTMLElement): void {
  const links = root.querySelectorAll<HTMLElement>(".desc-link");
  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const url = link.getAttribute("data-url") || "";
      if (url) {
        postToPlugin("openUrl", { url });
      }
    });
  });
}

function renderChapters(chapters: DescriptionChapter[], hasVideo: boolean): void {
  const sectionEl = $("chapters-section");
  const selectEl = $("chapter-list") as HTMLSelectElement;
  selectEl.innerHTML = "";

  if (!chapters.length) {
    sectionEl.classList.add("hidden");
    const option = document.createElement("option");
    option.value = "";
    option.textContent = hasVideo
      ? "No chapters in this description."
      : "Open a video in IINA to see chapters.";
    selectEl.appendChild(option);
    selectEl.disabled = true;
    return;
  }

  sectionEl.classList.remove("hidden");

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Jump to chapter…";
  selectEl.appendChild(placeholder);

  for (const chapter of chapters) {
    const option = document.createElement("option");
    option.value = String(chapter.seconds);
    option.textContent = `${chapter.timestamp} ${chapter.label}`;
    selectEl.appendChild(option);
  }

  selectEl.disabled = false;
  selectEl.value = "";
}

function renderDescription(description: string): void {
  const descriptionEl = $("description");
  descriptionEl.innerHTML = "";

  if (!description) {
    descriptionEl.textContent = "No description available.";
    descriptionEl.classList.add("empty");
    return;
  }

  descriptionEl.classList.remove("empty");
  const lines = description.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) {
      descriptionEl.appendChild(document.createElement("br"));
      continue;
    }
    const lineEl = document.createElement("div");
    lineEl.className = "desc-line";
    lineEl.innerHTML = formatInlineRich(line);
    descriptionEl.appendChild(lineEl);
  }

  bindDescriptionLinks(descriptionEl);
}

function updateDescriptionSection(description: string, hasVideo: boolean): void {
  const sectionEl = $("description-section");

  if (!description && !hasVideo) {
    sectionEl.classList.remove("hidden");
    const descriptionEl = $("description");
    descriptionEl.textContent = "Open a video in IINA to see its description.";
    descriptionEl.classList.add("empty");
    return;
  }

  sectionEl.classList.remove("hidden");

  if (description) {
    renderDescription(description);
    return;
  }

  const descriptionEl = $("description");
  descriptionEl.textContent = "No description available.";
  descriptionEl.classList.add("empty");
}

function renderQualities(items: QualityItem[], selected: number, loading = false): void {
  const selectEl = $("quality-list") as HTMLSelectElement;
  selectEl.innerHTML = "";

  for (const item of items) {
    const option = document.createElement("option");
    option.value = String(item.height);
    option.textContent = item.label;
    if (item.height === selected) {
      option.selected = true;
    }
    selectEl.appendChild(option);
  }

  selectEl.disabled = items.length === 0 || loading;
  if (loading) {
    selectEl.setAttribute("aria-busy", "true");
  } else {
    selectEl.removeAttribute("aria-busy");
  }
}

let currentWatchUrl = "";
let renderedRelatedVideoId = "";
let renderedRelatedHasItems = false;

export function getCurrentWatchUrl(): string {
  return currentWatchUrl;
}

export function hasCachedRelatedPreview(watchUrl: string): boolean {
  const videoId = getYouTubeVideoId(watchUrl) || "";
  return !!videoId && videoId === renderedRelatedVideoId && renderedRelatedHasItems;
}

export function resetRelatedPreviewCache(): void {
  renderedRelatedVideoId = "";
  renderedRelatedHasItems = false;
}

export function beginRelatedPreviewLoad(): void {
  const el = $("related-preview");
  el.innerHTML = "";
  el.classList.remove("empty");
  el.appendChild(createSkeletonRows(2));
}

function updateHero(title: string, watchUrl: string): void {
  const titleEl = $("video-title");
  const subEl = $("player-hero-sub");
  const thumbEl = $("player-thumb") as HTMLImageElement;
  const resolvedUrl = watchUrl || currentWatchUrl;
  const videoId = getYouTubeVideoId(resolvedUrl) || "";
  const hasVideo = !!(title || videoId);

  titleEl.textContent = title || (hasVideo ? "YouTube video" : "No YouTube video");

  if (!hasVideo) {
    subEl.textContent = "Open a video in IINA to see details";
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

function updateProgress(position: number, duration: number, paused: boolean): void {
  const block = $("player-progress-block");
  const track = $("progress-track");
  const fill = $("progress-fill");
  const posEl = $("player-time-pos");
  const durEl = $("player-time-dur");

  if (duration <= 0) {
    block.classList.add("hidden");
    track.removeAttribute("role");
    track.removeAttribute("aria-label");
    track.removeAttribute("aria-valuemin");
    track.removeAttribute("aria-valuemax");
    track.removeAttribute("aria-valuenow");
    return;
  }

  block.classList.remove("hidden");
  const pct = Math.min(100, Math.max(0, (position / duration) * 100));
  fill.style.width = `${pct}%`;
  posEl.textContent = formatClock(position);
  durEl.textContent = formatClock(duration);

  track.setAttribute("role", "progressbar");
  track.setAttribute("aria-label", "Playback progress");
  track.setAttribute("aria-valuemin", "0");
  track.setAttribute("aria-valuemax", String(Math.floor(duration)));
  track.setAttribute("aria-valuenow", String(Math.floor(position)));

  const subEl = $("player-hero-sub");
  subEl.textContent = paused ? "Paused" : "Playing";
}

export function renderRelatedPreview(videoId: string, items: FeedItem[]): void {
  const currentVideoId = getYouTubeVideoId(currentWatchUrl) || "";
  if (videoId && currentVideoId && videoId !== currentVideoId) {
    return;
  }

  const el = $("related-preview");
  el.innerHTML = "";
  renderedRelatedVideoId = videoId || currentVideoId;
  renderedRelatedHasItems = items.length > 0;

  if (!items.length) {
    el.textContent = "Open a video in IINA to see related videos.";
    el.classList.add("empty");
    return;
  }

  el.classList.remove("empty");

  for (const item of items) {
    const row = createFeedRow({
      item,
      rowClassName: "feed-row related-row",
      showDuration: false,
      showResume: false,
      showExtra: false,
      onClick: (clickedItem) => {
        postToPlugin("playVideo", {
          videoId: clickedItem.videoId,
          url: youtubeWatchUrl(clickedItem.videoId),
        });
      },
    });

    el.appendChild(row);
  }
}

function renderPanel(data: PanelPayload): void {
  const statusEl = $("quality-status");

  const title = data.title || "";
  const description = data.description || "";
  const chapters = data.chapters || [];
  const items = data.items?.length ? data.items : DEFAULT_QUALITY_OPTIONS;
  const selected = typeof data.selected === "number" ? data.selected : 0;
  const loading = !!data.loading;
  const watchUrl = data.watchUrl || "";
  currentWatchUrl = watchUrl;
  const watchVideoId = getYouTubeVideoId(watchUrl) || "";

  if (watchVideoId && watchVideoId !== renderedRelatedVideoId) {
    beginRelatedPreviewLoad();
  }

  updateHero(title, watchUrl);

  renderChapters(chapters, !!title);
  updateDescriptionSection(description, !!title);

  if (loading) {
    statusEl.textContent = "Updating…";
    statusEl.classList.add("visible");
  } else {
    statusEl.textContent = "";
    statusEl.classList.remove("visible");
  }

  renderQualities(items, selected, loading);
}

function handlePlayerState(state: PlayerStateMessage): void {
  const title = state.title || "";
  const watchUrl = state.watchUrl || "";
  const position = typeof state.position === "number" ? state.position : 0;
  const duration = typeof state.duration === "number" ? state.duration : 0;
  const paused = !!state.paused;

  if (title || watchUrl || currentWatchUrl) {
    updateHero(title, watchUrl || currentWatchUrl);
  }

  updateProgress(position, duration, paused);
}

function setupQualitySelect(): void {
  const selectEl = $("quality-list") as HTMLSelectElement;
  selectEl.addEventListener("change", () => {
    const height = Number.parseInt(selectEl.value, 10);
    if (!Number.isNaN(height)) {
      postToPlugin("selectQuality", { height });
    }
  });
}

function setupChapterSelect(): void {
  const selectEl = $("chapter-list") as HTMLSelectElement;
  selectEl.addEventListener("change", () => {
    const seconds = Number.parseInt(selectEl.value, 10);
    if (!Number.isNaN(seconds) && seconds >= 0) {
      postToPlugin("descriptionSeek", { seconds });
    }
    selectEl.value = "";
  });
}

export function initPlayerPanel(): void {
  setupQualitySelect();
  setupChapterSelect();

  onPluginMessage("panel", (raw) => {
    renderPanel((raw || {}) as PanelPayload);
  });

  onPluginMessage("playerState", (raw) => {
    handlePlayerState((raw || {}) as PlayerStateMessage);
  });

  onPluginMessage("relatedPreview", (raw) => {
    const data = (raw || {}) as { videoId?: string; items?: FeedItem[] };
    renderRelatedPreview(data.videoId || "", data.items || []);
  });

  onPluginMessage("feedsStale", () => {
    resetRelatedPreviewCache();
    beginRelatedPreviewLoad();
    postToPlugin("requestRelatedPreview", { force: true });
  });

  onPluginMessage("watchUrlChanged", () => {
    resetRelatedPreviewCache();
  });

  renderPanel({
    items: DEFAULT_QUALITY_OPTIONS,
    selected: 0,
    title: "",
    description: "",
    chapters: [],
    loading: false,
  });
}