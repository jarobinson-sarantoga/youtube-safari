import { onPluginMessage, postToPlugin } from "./messaging";
import { setActiveView } from "./views";

interface QualityItem {
  height: number;
  label: string;
}

interface DescriptionChapter {
  timestamp: string;
  label: string;
  seconds: number;
}

interface PanelPayload {
  items: QualityItem[];
  selected: number;
  title: string;
  description: string;
  chapters: DescriptionChapter[];
  loading: boolean;
  watchUrl?: string;
}

interface PlayerStateMessage {
  watchUrl?: string;
  title?: string;
  position?: number;
  duration?: number;
  paused?: boolean;
}

interface RelatedPreviewItem {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
}

const DEFAULT_ITEMS: QualityItem[] = [
  { height: 0, label: "Auto (up to 4K)" },
  { height: 2160, label: "4K (2160p)" },
  { height: 1440, label: "1440p" },
  { height: 1080, label: "1080p" },
  { height: 720, label: "720p" },
  { height: 480, label: "480p" },
  { height: 360, label: "360p" },
];

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing element #${id}`);
  }
  return el;
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, "&#39;");
}

function trimUrlTrailingPunctuation(url: string): string {
  return url.replace(/[),.;:!?]+$/g, "");
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function videoIdFromUrl(url: string): string {
  if (!url) {
    return "";
  }

  let match = url.match(/[?&]v=([\w-]{6,})/i);
  if (match) {
    return match[1];
  }

  match = url.match(/youtu\.be\/([\w-]{6,})/i);
  if (match) {
    return match[1];
  }

  match = url.match(/\/shorts\/([\w-]{6,})/i);
  if (match) {
    return match[1];
  }

  match = url.match(/\/live\/([\w-]{6,})/i);
  if (match) {
    return match[1];
  }

  return "";
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
      : "Open a YouTube video to see chapters.";
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

function updateDescriptionSection(
  description: string,
  chapters: DescriptionChapter[],
  hasVideo: boolean,
): void {
  const sectionEl = $("description-section");

  if (!chapters.length) {
    sectionEl.classList.add("hidden");
    return;
  }

  sectionEl.classList.remove("hidden");

  if (description) {
    renderDescription(description);
    return;
  }

  const descriptionEl = $("description");
  if (hasVideo) {
    descriptionEl.textContent = "No description available.";
    descriptionEl.classList.add("empty");
  } else {
    descriptionEl.textContent = "Open a YouTube video to see its description.";
    descriptionEl.classList.add("empty");
  }
}

function renderQualities(items: QualityItem[], selected: number): void {
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

  selectEl.disabled = items.length === 0;
}

let currentWatchUrl = "";
let cachedRelatedVideoId = "";
let cachedRelatedItems: RelatedPreviewItem[] = [];

export function getCurrentWatchUrl(): string {
  return currentWatchUrl;
}

export function hasCachedRelatedPreview(watchUrl: string): boolean {
  const videoId = videoIdFromUrl(watchUrl);
  return (
    !!videoId &&
    videoId === cachedRelatedVideoId &&
    cachedRelatedItems.length > 0
  );
}

export function beginRelatedPreviewLoad(): void {
  const el = $("related-preview");
  el.innerHTML = "";
  el.textContent = "Loading related…";
  el.classList.add("empty");
}

function updateHero(title: string, watchUrl: string): void {
  const titleEl = $("video-title");
  const subEl = $("player-hero-sub");
  const thumbEl = $("player-thumb") as HTMLImageElement;
  const resolvedUrl = watchUrl || currentWatchUrl;
  const videoId = videoIdFromUrl(resolvedUrl);
  const hasVideo = !!(title || videoId);

  titleEl.textContent = title || (hasVideo ? "YouTube video" : "No YouTube video");

  if (!hasVideo) {
    subEl.textContent = "Open a video to see details";
    thumbEl.classList.add("hidden");
    thumbEl.removeAttribute("src");
    return;
  }

  if (videoId) {
    const thumbUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    if (thumbEl.src !== thumbUrl) {
      thumbEl.src = thumbUrl;
    }
    thumbEl.classList.remove("hidden");
  } else {
    thumbEl.classList.add("hidden");
    thumbEl.removeAttribute("src");
  }

  subEl.textContent = "Now playing in IINA";
}

function updateProgress(position: number, duration: number, paused: boolean): void {
  const block = $("player-progress-block");
  const fill = $("progress-fill");
  const posEl = $("player-time-pos");
  const durEl = $("player-time-dur");

  if (duration <= 0) {
    block.classList.add("hidden");
    return;
  }

  block.classList.remove("hidden");
  const pct = Math.min(100, Math.max(0, (position / duration) * 100));
  fill.style.width = `${pct}%`;
  posEl.textContent = formatClock(position);
  durEl.textContent = formatClock(duration);

  const subEl = $("player-hero-sub");
  subEl.textContent = paused ? "Paused" : "Playing";
}

export function renderRelatedPreview(items: RelatedPreviewItem[]): void {
  const el = $("related-preview");
  el.innerHTML = "";
  cachedRelatedItems = items;
  cachedRelatedVideoId = videoIdFromUrl(currentWatchUrl);

  if (!items.length) {
    el.textContent = "Play a video to see related videos.";
    el.classList.add("empty");
    return;
  }

  el.classList.remove("empty");

  for (const item of items) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "feed-row related-row";

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "thumb-wrap";

    const img = document.createElement("img");
    const fallback = `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
    img.className = "feed-thumb";
    img.src = item.thumbnailUrl || fallback;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", () => {
      if (img.src !== fallback) {
        img.src = fallback;
      }
    });

    thumbWrap.appendChild(img);

    const meta = document.createElement("div");
    meta.className = "feed-meta";

    const title = document.createElement("p");
    title.className = "feed-title";
    title.textContent = item.title;

    const channel = document.createElement("p");
    channel.className = "feed-channel";
    channel.textContent = item.channelTitle;

    meta.appendChild(title);
    meta.appendChild(channel);

    row.appendChild(thumbWrap);
    row.appendChild(meta);
    row.addEventListener("click", () => {
      postToPlugin("playVideo", {
        videoId: item.videoId,
        url: `https://www.youtube.com/watch?v=${item.videoId}`,
      });
    });

    el.appendChild(row);
  }
}

function renderPanel(data: PanelPayload): void {
  const statusEl = $("quality-status");

  const title = data.title || "";
  const description = data.description || "";
  const chapters = data.chapters || [];
  const items = data.items?.length ? data.items : DEFAULT_ITEMS;
  const selected = typeof data.selected === "number" ? data.selected : 0;
  const loading = !!data.loading;
  const watchUrl = data.watchUrl || "";
  currentWatchUrl = watchUrl;
  const watchVideoId = videoIdFromUrl(watchUrl);

  if (watchVideoId !== cachedRelatedVideoId) {
    cachedRelatedVideoId = watchVideoId;
    cachedRelatedItems = [];
    renderRelatedPreview([]);
  }

  updateHero(title, watchUrl);

  renderChapters(chapters, !!title);
  updateDescriptionSection(description, chapters, !!title);

  if (loading) {
    statusEl.classList.add("visible");
  } else {
    statusEl.classList.remove("visible");
  }

  renderQualities(items, selected);
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
    const data = (raw || {}) as { items?: RelatedPreviewItem[] };
    renderRelatedPreview(data.items || []);
  });

  renderPanel({
    items: DEFAULT_ITEMS,
    selected: 0,
    title: "",
    description: "",
    chapters: [],
    loading: false,
  });
}