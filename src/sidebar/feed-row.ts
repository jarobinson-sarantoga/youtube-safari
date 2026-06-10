import type { FeedItem } from "../browse/types";
import { youtubeThumbnailUrl } from "../youtube";
import { formatDuration } from "./dom";

export type FeedRowClickHandler = (item: FeedItem, index: number) => void;

export interface FeedRowOptions {
  item: FeedItem;
  index?: number;
  selected?: boolean;
  rowClassName?: string;
  showDuration?: boolean;
  showResume?: boolean;
  showExtra?: boolean;
  onClick: FeedRowClickHandler;
}

export function createFeedRow(options: FeedRowOptions): HTMLButtonElement {
  const {
    item,
    index = -1,
    selected = false,
    rowClassName = "feed-row",
    showDuration = true,
    showResume = true,
    showExtra = true,
    onClick,
  } = options;

  const row = document.createElement("button");
  row.type = "button";
  row.className = `${rowClassName}${selected ? " selected" : ""}`;
  row.setAttribute("aria-label", item.title);
  if (index >= 0) {
    row.dataset.index = String(index);
  }

  const thumbWrap = document.createElement("div");
  thumbWrap.className = "thumb-wrap";

  const thumb = document.createElement("img");
  thumb.className = "feed-thumb";
  const fallbackThumb = youtubeThumbnailUrl(item.videoId);
  thumb.src = item.thumbnailUrl || fallbackThumb;
  thumb.alt = item.title;
  thumb.loading = "lazy";
  thumb.addEventListener("error", () => {
    if (thumb.src !== fallbackThumb) {
      thumb.src = fallbackThumb;
    }
  });

  thumbWrap.appendChild(thumb);

  if (showDuration && item.durationLabel) {
    const badge = document.createElement("span");
    badge.className = "duration-badge";
    badge.textContent = item.durationLabel;
    thumbWrap.appendChild(badge);
  }

  if (
    showResume &&
    typeof item.resumeSeconds === "number" &&
    item.resumeSeconds > 0
  ) {
    const resume = document.createElement("span");
    resume.className = "resume-badge";
    resume.textContent = "Resume";
    thumbWrap.appendChild(resume);
  }

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

  if (showExtra) {
    const parts: string[] = [];
    if (typeof item.resumeSeconds === "number" && item.resumeSeconds > 0) {
      parts.push(`Resume at ${formatDuration(item.resumeSeconds)}`);
    }
    if (item.publishedAt) {
      parts.push(item.publishedAt);
    }
    if (parts.length) {
      const extra = document.createElement("p");
      extra.className = "feed-extra";
      extra.textContent = parts.join(" · ");
      meta.appendChild(extra);
    }
  }

  row.appendChild(thumbWrap);
  row.appendChild(meta);

  row.addEventListener("click", () => {
    onClick(item, index);
  });

  return row;
}

export function createSkeletonRows(count: number): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "skeleton-rows";
  wrap.setAttribute("aria-hidden", "true");

  for (let i = 0; i < count; i++) {
    const row = document.createElement("div");
    row.className = "skeleton-row";

    const thumb = document.createElement("div");
    thumb.className = "skeleton-block skeleton-thumb";

    const lines = document.createElement("div");
    lines.className = "skeleton-lines";

    for (const cls of ["wide", "mid", "narrow"]) {
      const line = document.createElement("div");
      line.className = `skeleton-block skeleton-line ${cls}`;
      lines.appendChild(line);
    }

    row.appendChild(thumb);
    row.appendChild(lines);
    wrap.appendChild(row);
  }

  return wrap;
}