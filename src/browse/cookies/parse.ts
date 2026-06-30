import { appendLog } from "../../ytdl";
import { isYoutubeDomain, type NetscapeCookie } from "./constants";
import { cookiesPath } from "./path";

const { file } = iina;

export function domainMatches(domain: string): boolean {
  return isYoutubeDomain(domain);
}

/** True for youtube.com host cookies (not accounts.google.com, etc.). */
export function youtubeDomainMatches(domain: string): boolean {
  return isYoutubeDomain(domain);
}

export function parseNetscapeCookies(text: string): NetscapeCookie[] {
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

export function readNetscapeCookies(): NetscapeCookie[] | null {
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
