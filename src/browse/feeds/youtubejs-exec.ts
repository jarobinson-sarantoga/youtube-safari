import type { FeedItem } from "../types";
import { cookiesPath } from "../cookies";
import { pluginScriptPath } from "../../plugin-script-path";
import { appendLog } from "../../ytdl";
import { execBashScriptJson } from "../../ytdlp-script";

const DEFAULT_SCRIPT = "scripts/youtubejs-feed.sh";

interface FeedScriptResult {
  items?: FeedItem[];
  error?: string;
  emptyHint?: string;
  continuation?: string;
}

function scriptPath(): string {
  return pluginScriptPath("youtubejs_feed_script", DEFAULT_SCRIPT);
}

async function runFeedScript(args: string[]): Promise<FeedScriptResult> {
  const script = scriptPath();
  const execArgs = [script, ...args, "--cookies", cookiesPath()];
  const result = await execBashScriptJson<FeedScriptResult>(execArgs, "youtubejs-feed");

  if (!result.ok || !result.data) {
    return {
      items: [],
      error: result.error || "Browse feed script returned no output",
    };
  }

  const payload = result.data;
  const items = Array.isArray(payload.items) ? payload.items : [];
  appendLog(`youtubejs-feed: ${items.length} items`);
  return {
    items,
    error: payload.error,
    emptyHint: payload.emptyHint,
    continuation: payload.continuation,
  };
}

export type YoutubeJsFeedTab = "home" | "subscriptions" | "subs-shorts" | "shorts";

export async function fetchShortsItems(continuation = ""): Promise<{
  items: FeedItem[];
  emptyHint?: string;
  error?: string;
  continuation?: string;
}> {
  const args = ["--tab", "shorts"];
  if (continuation) {
    args.push("--continuation", continuation);
  }
  const result = await runFeedScript(args);
  return {
    items: result.items || [],
    emptyHint: result.emptyHint,
    error: result.error,
    continuation: result.continuation,
  };
}

export async function fetchTabItems(tab: YoutubeJsFeedTab): Promise<{
  items: FeedItem[];
  emptyHint?: string;
  error?: string;
}> {
  const result = await runFeedScript(["--tab", tab]);
  return {
    items: result.items || [],
    emptyHint: result.emptyHint,
    error: result.error,
  };
}

export async function fetchSearchItems(query: string): Promise<{
  items: FeedItem[];
  error?: string;
}> {
  const result = await runFeedScript(["--tab", "search", "--query", query]);
  return {
    items: result.items || [],
    error: result.error,
  };
}

export async function fetchRelatedItems(videoId: string): Promise<{
  items: FeedItem[];
  emptyHint?: string;
  error?: string;
}> {
  const result = await runFeedScript(["--tab", "related", "--video-id", videoId]);
  return {
    items: result.items || [],
    emptyHint: result.emptyHint,
    error: result.error,
  };
}