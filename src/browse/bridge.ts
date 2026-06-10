import type { BrowseRefreshMessage, HttpRequestMessage } from "./messages";
import { fetchFeed } from "./feeds/index";
import { httpOptions } from "./http-options";
import { openLinkedUrl } from "../youtube-open";
import { appendLog } from "../ytdl";

const { http, sidebar } = iina;

async function handleHttpRequest(msg: HttpRequestMessage): Promise<void> {
  const { id, method, url, headers, body } = msg;

  try {
    let data: Record<string, unknown> = {};
    if (body) {
      try {
        const parsed = JSON.parse(body) as unknown;
        data =
          parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : { body: parsed };
      } catch {
        data = { body };
      }
    }
    const options = httpOptions(headers || {}, data);

    let response: IINA.HTTPResponse;
    switch (method) {
      case "GET":
        response = await http.get(url, options);
        break;
      case "POST":
        response = await http.post(url, options);
        break;
      case "PUT":
        response = await http.put(url, options);
        break;
      case "PATCH":
        response = await http.patch(url, options);
        break;
      case "DELETE":
        response = await http.delete(url, options);
        break;
      default:
        sidebar.postMessage("httpResponse", {
          id,
          status: 0,
          body: "",
          error: `Unsupported method: ${method}`,
        });
        return;
    }

    sidebar.postMessage("httpResponse", {
      id,
      status: response.statusCode,
      body: response.text || "",
    });
  } catch (err) {
    appendLog(`httpRequest bridge error: ${err}`);
    sidebar.postMessage("httpResponse", {
      id,
      status: 0,
      body: "",
      error: String(err),
    });
  }
}

async function handleBrowseRefresh(msg: BrowseRefreshMessage): Promise<void> {
  const { tab, query, subsFilter, force, requestId } = msg;
  appendLog(
    `browseRefresh: tab=${tab} filter=${subsFilter || "all"} force=${force ? "yes" : "no"} query=${query || ""} id=${requestId ?? "?"}`,
  );

  try {
    const result = await fetchFeed(tab, query, subsFilter, force);
    appendLog(
      `feedResult: tab=${tab} id=${requestId ?? "?"} items=${result.items.length}` +
        (result.error ? ` error=${result.error}` : "") +
        (result.emptyHint ? ` hint=${result.emptyHint}` : ""),
    );
    sidebar.postMessage("feedResult", {
      tab,
      items: result.items,
      error: result.error,
      emptyHint: result.emptyHint,
      subsFilter,
      requestId,
    });
  } catch (err) {
    appendLog(`browseRefresh error: ${err}`);
    sidebar.postMessage("feedResult", {
      tab,
      items: [],
      error: String(err),
      subsFilter,
      requestId,
    });
  }
}

function handlePlayVideo(data: { videoId?: string; url?: string }): void {
  const videoId = data.videoId;
  const url =
    data.url ||
    (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "");

  if (!url) {
    return;
  }

  openLinkedUrl(url);
}

/** Register browse bridge handlers on the sidebar channel (call after each loadFile). */
export function registerBrowseSidebarHandlers(): void {
  sidebar.onMessage("httpRequest", (data: HttpRequestMessage) => {
    void handleHttpRequest(data);
  });

  sidebar.onMessage("browseRefresh", (data: BrowseRefreshMessage) => {
    void handleBrowseRefresh(data);
  });

  sidebar.onMessage("playVideo", (data: { videoId?: string; url?: string }) => {
    handlePlayVideo(data);
  });
}

/** @deprecated Use registerBrowseSidebarHandlers */
export function installBrowseBridge(): void {
  registerBrowseSidebarHandlers();
  appendLog("Browse bridge installed");
}