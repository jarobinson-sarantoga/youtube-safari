import type { FeedItem } from "../types";
import { cookiesPath } from "../cookies";
import { appendLog } from "../../ytdl";

const { preferences, utils } = iina;

const DEFAULT_SCRIPT = "~/Projects/youtube-safari/scripts/youtubejs-feed.sh";

interface FeedScriptResult {
  items?: FeedItem[];
  error?: string;
  emptyHint?: string;
}

function scriptPath(): string {
  const configured = preferences.get("youtubejs_feed_script") as string | undefined;
  return utils.resolvePath(configured || DEFAULT_SCRIPT);
}

async function runFeedScript(args: string[]): Promise<FeedScriptResult> {
  const script = scriptPath();
  if (!utils.fileInPath(script)) {
    appendLog(`youtubejs-feed script missing: ${script}`);
    return { items: [], error: "Browse feed script not found" };
  }

  const execArgs = [script, ...args, "--cookies", cookiesPath()];
  appendLog(`youtubejs-feed: bash ${execArgs.join(" ")}`);

  const result = await utils.exec("/bin/bash", execArgs);
  const line =
    result.stdout
      .trim()
      .split("\n")
      .map((row) => row.trim())
      .filter((row) => row.startsWith("{"))
      .pop() || "";

  if (!line) {
    appendLog(
      `youtubejs-feed empty stdout (status=${result.status}): ${result.stderr || result.stdout}`,
    );
    return {
      items: [],
      error: result.stderr || "Browse feed script returned no output",
    };
  }

  try {
    const payload = JSON.parse(line) as FeedScriptResult;
    const items = Array.isArray(payload.items) ? payload.items : [];
    appendLog(`youtubejs-feed: ${items.length} items`);
    return {
      items,
      error: payload.error,
      emptyHint: payload.emptyHint,
    };
  } catch (err) {
    appendLog(`youtubejs-feed JSON parse error: ${err}; stdout=${line.slice(0, 200)}`);
    return { items: [], error: String(err) };
  }
}

export async function fetchHomeItems(): Promise<{
  items: FeedItem[];
  emptyHint?: string;
  error?: string;
}> {
  const result = await runFeedScript(["--tab", "home"]);
  return {
    items: result.items || [],
    emptyHint: result.emptyHint,
    error: result.error,
  };
}

export async function fetchSubscriptionsItems(): Promise<{
  items: FeedItem[];
  emptyHint?: string;
  error?: string;
}> {
  const result = await runFeedScript(["--tab", "subscriptions"]);
  return {
    items: result.items || [],
    emptyHint: result.emptyHint,
    error: result.error,
  };
}

export async function fetchShortsItems(): Promise<{
  items: FeedItem[];
  emptyHint?: string;
  error?: string;
}> {
  const result = await runFeedScript(["--tab", "shorts"]);
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