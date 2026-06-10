import type { FeedItem } from "../types";
import { httpOptions } from "../http-options";
import { appendLog } from "../../ytdl";

const { http } = iina;

interface DataApiSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    channelId?: string;
    publishedAt?: string;
    thumbnails?: {
      medium?: { url?: string };
      high?: { url?: string };
      default?: { url?: string };
    };
  };
}

interface DataApiSearchResponse {
  items?: DataApiSearchItem[];
  error?: { message?: string };
}

function formatPublishedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) {
    const hours = Math.floor(diff / 3600000);
    return hours < 1 ? "Today" : `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function thumbnailFromSnippet(
  snippet: DataApiSearchItem["snippet"],
): string {
  return (
    snippet?.thumbnails?.medium?.url ||
    snippet?.thumbnails?.high?.url ||
    snippet?.thumbnails?.default?.url ||
    ""
  );
}

export async function searchWithDataApi(
  query: string,
  apiKey: string,
  maxResults = 25,
): Promise<FeedItem[]> {
  const params = [
    ["part", "snippet"],
    ["type", "video"],
    ["q", query],
    ["maxResults", String(maxResults)],
    ["key", apiKey],
  ]
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
  const res = await http.get(url, httpOptions({ Accept: "application/json" }));
  const data = (
    res.data && typeof res.data === "object"
      ? res.data
      : JSON.parse(res.text || "{}")
  ) as DataApiSearchResponse;

  if (res.statusCode < 200 || res.statusCode >= 300) {
    const msg = data.error?.message || `Data API HTTP ${res.statusCode}`;
    appendLog(`data api search error: ${msg}`);
    throw new Error(msg);
  }

  const items: FeedItem[] = [];
  for (const entry of data.items || []) {
    const videoId = entry.id?.videoId;
    if (!videoId) {
      continue;
    }
    const snippet = entry.snippet;
    items.push({
      videoId,
      title: snippet?.title || "Untitled",
      channelTitle: snippet?.channelTitle || "Unknown channel",
      channelId: snippet?.channelId,
      thumbnailUrl: thumbnailFromSnippet(snippet),
      publishedAt: snippet?.publishedAt
        ? formatPublishedAt(snippet.publishedAt)
        : undefined,
    });
  }

  return items;
}