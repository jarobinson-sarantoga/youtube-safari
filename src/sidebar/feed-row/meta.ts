import type { FeedItem } from "../../browse/types";
import { formatDuration } from "../dom";

interface FeedMetaOptions {
  item: FeedItem;
  showExtra: boolean;
}

export function createFeedMeta(options: FeedMetaOptions): HTMLElement {
  const { item, showExtra } = options;
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

  return meta;
}
