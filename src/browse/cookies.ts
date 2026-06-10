import { appendLog } from "../ytdl";

const { file, preferences, utils } = iina;

const YOUTUBE_DOMAINS = new Set([
  ".youtube.com",
  "youtube.com",
  ".www.youtube.com",
  "www.youtube.com",
  ".m.youtube.com",
  ".google.com",
  ".googlevideo.com",
]);

const YOUTUBE_AUTH_COOKIE_NAMES = new Set(["LOGIN_INFO", "__Secure-1PSID"]);

interface NetscapeCookie {
  domain: string;
  name: string;
  value: string;
}

let cachedHeader = "";
let cachedPath = "";
let cachedContentLength = 0;

export function cookiesPath(): string {
  const configured = preferences.get("cookies_path") as string | undefined;
  const fallback = "~/.config/yt-dlp/cookies.txt";
  return utils.resolvePath(configured || fallback);
}

function domainMatches(domain: string): boolean {
  return [...YOUTUBE_DOMAINS].some(
    (d) => domain === d || domain.endsWith(d) || domain.endsWith(".youtube.com"),
  );
}

/** True for youtube.com host cookies (not accounts.google.com, etc.). */
function youtubeDomainMatches(domain: string): boolean {
  return (
    domain === ".youtube.com" ||
    domain === "youtube.com" ||
    domain.endsWith(".youtube.com")
  );
}

function parseNetscapeCookies(text: string): NetscapeCookie[] {
  const cookies: NetscapeCookie[] = [];

  for (const line of text.split(/\r?\n/)) {
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

    cookies.push({ domain, name, value });
  }

  return cookies;
}

function readNetscapeCookies(): NetscapeCookie[] | null {
  const path = cookiesPath();

  if (!file.exists(path)) {
    return null;
  }

  try {
    const text = file.read(path) || "";
    return parseNetscapeCookies(text);
  } catch (err) {
    appendLog(`cookies: read failed: ${err}`);
    return [];
  }
}

export function cookiesFileExists(): boolean {
  return file.exists(cookiesPath());
}

/** Any cookie scoped to youtube.com (not merely google.com / googlevideo.com). */
export function hasYouTubeDomainCookies(): boolean {
  const cookies = readNetscapeCookies();
  if (cookies === null) {
    return false;
  }

  return cookies.some((cookie) => youtubeDomainMatches(cookie.domain));
}

/** True when LOGIN_INFO or __Secure-1PSID is present on a youtube.com domain. */
export function hasYouTubeAuth(): boolean {
  const cookies = readNetscapeCookies();
  if (cookies === null) {
    return false;
  }

  return cookies.some(
    (cookie) =>
      youtubeDomainMatches(cookie.domain) &&
      YOUTUBE_AUTH_COOKIE_NAMES.has(cookie.name) &&
      cookie.value.length > 0,
  );
}

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