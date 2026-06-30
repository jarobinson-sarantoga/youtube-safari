import { appendLog } from "../../ytdl";
import { buildBrowseCookieHeader } from "./build-header";
import { parseNetscapeCookies } from "./parse";
import { cookiesPath } from "./path";

const { file } = iina;

let cachedHeader = "";
let cachedPath = "";
let cachedContentLength = 0;

/** Parse Netscape cookies.txt and build a Cookie header for YouTube browse/auth. */
export function buildCookieHeader(force = false): string {
  const path = cookiesPath();

  if (!file.exists(path)) {
    appendLog(`cookies: file not found at ${path}`);
    cachedHeader = "";
    cachedPath = path;
    cachedContentLength = 0;
    return "";
  }

  let text: string;
  try {
    text = file.read(path) || "";
  } catch (err) {
    appendLog(`cookies: read failed: ${err}`);
    return "";
  }

  if (
    !force &&
    path === cachedPath &&
    cachedHeader &&
    text.length === cachedContentLength
  ) {
    return cachedHeader;
  }

  const cookies = parseNetscapeCookies(text);
  cachedHeader = buildBrowseCookieHeader(cookies);
  cachedPath = path;
  cachedContentLength = text.length;

  appendLog(`cookies: built header with ${cookies.length} file entries`);
  return cachedHeader;
}

export function hasCookies(): boolean {
  return buildCookieHeader().length > 0;
}

export function clearCookieCache(): void {
  cachedHeader = "";
  cachedPath = "";
  cachedContentLength = 0;
}

/** Call after Safari cookie refresh so browse requests pick up new session. */
export function invalidateCookieCache(): void {
  clearCookieCache();
}
