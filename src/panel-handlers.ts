import type { BrowseRefreshMessage } from "./browse/messages";
import { fetchFeed } from "./browse/feeds/index";
import { getRelatedItems } from "./browse/feeds/related";
import { getLastWatchUrl } from "./preferences";
import { getSelectedHeight, listQualities } from "./qualities";
import {
  DEFAULT_QUALITY_OPTIONS,
  defaultPanelPayload,
  type PanelPayload,
} from "./sidebar-state";
import { appendLog } from "./ytdl";
import { getYouTubeVideoId, isYouTubeWatchURL, youtubeWatchUrl } from "./youtube";

export type PanelPostFn = (name: string, data: unknown) => void;

let relatedRequestSeq = 0;

export function nextRelatedRequestId(): number {
  return ++relatedRequestSeq;
}

export async function handleBrowseRefresh(
  msg: BrowseRefreshMessage,
  post: PanelPostFn,
): Promise<void> {
  const { tab, query, subsFilter, force, requestId, continuation } = msg;
  appendLog(
    `browseRefresh: tab=${tab} filter=${subsFilter || "all"} force=${force ? "yes" : "no"} query=${query || ""} id=${requestId ?? "?"}`,
  );

  try {
    const result = await fetchFeed(tab, query, subsFilter, force, continuation);
    appendLog(
      `feedResult: tab=${tab} id=${requestId ?? "?"} items=${result.items.length}` +
        (result.error ? ` error=${result.error}` : "") +
        (result.emptyHint ? ` hint=${result.emptyHint}` : "") +
        (result.continuation ? " cont=yes" : ""),
    );
    post("feedResult", {
      tab,
      items: result.items,
      error: result.error,
      emptyHint: result.emptyHint,
      subsFilter,
      requestId,
      query: tab === "search" ? query : undefined,
      continuation: result.continuation,
      append: msg.append,
    });
  } catch (err) {
    appendLog(`browseRefresh error: ${err}`);
    post("feedResult", {
      tab,
      items: [],
      error: String(err),
      subsFilter,
      requestId,
      query: tab === "search" ? query : undefined,
    });
  }
}

export function resolvePlayVideoUrl(data: { videoId?: string; url?: string }): string {
  const videoId = data.videoId;
  return data.url || (videoId ? youtubeWatchUrl(videoId) : "");
}

export function resolveRelatedPreviewWatchUrl(
  data?: { watchUrl?: string },
): string {
  const requested = data?.watchUrl?.trim() || "";
  if (requested && isYouTubeWatchURL(requested)) {
    return requested;
  }
  return getLastWatchUrl();
}

export async function buildRefreshPanelPayload(): Promise<PanelPayload> {
  const watchUrl = getLastWatchUrl();
  const selected = getSelectedHeight();

  if (!watchUrl || !isYouTubeWatchURL(watchUrl)) {
    return defaultPanelPayload(selected);
  }

  try {
    const listed = await listQualities(watchUrl);
    return {
      items: listed.items.length ? listed.items : DEFAULT_QUALITY_OPTIONS,
      selected,
      title: listed.title,
      description: listed.description,
      chapters: listed.chapters,
      loading: false,
      watchUrl,
      error: listed.error,
    };
  } catch (err) {
    appendLog(`buildRefreshPanelPayload error: ${err}`);
    const message = err instanceof Error ? err.message : String(err);
    return {
      ...defaultPanelPayload(selected),
      watchUrl,
      error: message,
    };
  }
}

export function postRelatedPreviewClear(post: PanelPostFn): void {
  const requestId = nextRelatedRequestId();
  post("relatedPreview", { videoId: "", items: [], relatedRequestId: requestId });
}

export async function postRelatedPreview(
  watchUrl: string,
  post: PanelPostFn,
  force = false,
): Promise<void> {
  if (!isYouTubeWatchURL(watchUrl)) {
    postRelatedPreviewClear(post);
    return;
  }

  const requestVideoId = getYouTubeVideoId(watchUrl) || "";
  if (!requestVideoId) {
    postRelatedPreviewClear(post);
    return;
  }

  const requestId = nextRelatedRequestId();

  try {
    const result = await getRelatedItems(requestVideoId, force);
    post("relatedPreview", {
      videoId: requestVideoId,
      items: result.items,
      error: result.error,
      relatedRequestId: requestId,
    });
  } catch (err) {
    appendLog(`related preview failed: ${err}`);
    const message = err instanceof Error ? err.message : String(err);
    post("relatedPreview", {
      videoId: requestVideoId,
      items: [],
      error: message,
      relatedRequestId: requestId,
    });
  }
}