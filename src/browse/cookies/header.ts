import { appendLog } from "../../ytdl";
import { domainMatches } from "./parse";
import { cookiesPath } from "./path";

const { file } = iina;

let cachedHeader = "";
let cachedPath = "";
let cachedContentLength = 0;

/** Parse Netscape cookies.txt and build a Cookie header for YouTube domains. */
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

  const pairs: string[] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const parts = trimmed.split("\t");
    if (parts.length < 7) {
      continue;
    }

    const domain = parts[0];
    const name = parts[5];
    const value = parts[6];

    if (!name || value === undefined) {
      continue;
    }

    if (!domainMatches(domain)) {
      continue;
    }

    pairs.push(`${name}=${value}`);
  }

  cachedHeader = pairs.join("; ");
  cachedPath = path;
  cachedContentLength = text.length;

  appendLog(`cookies: built header with ${pairs.length} entries`);
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
