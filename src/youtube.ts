/** Trim and strip optional ytdl:// prefix (IINA Online Media convention). */
export function normalizeMediaURL(url: string): string {
  let u = url.trim();
  if (u.startsWith("ytdl://")) {
    u = u.slice("ytdl://".length).trim();
  }
  return u;
}

export function isGoogleVideoURL(url: string): boolean {
  const u = normalizeMediaURL(url);
  return /googlevideo\.com/i.test(u);
}

/**
 * Match YouTube watch URLs without the browser URL() API — not available in
 * IINA's JavaScriptCore runtime.
 */
export function isYouTubeWatchURL(url: string): boolean {
  const u = normalizeMediaURL(url);
  if (!/^https?:\/\//i.test(u)) {
    return false;
  }

  // youtu.be/VIDEO_ID
  if (/^https?:\/\/youtu\.be\/[\w-]+/i.test(u)) {
    return true;
  }

  const hostMatch = u.match(/^https?:\/\/([^/?#]+)/i);
  if (!hostMatch) {
    return false;
  }

  const host = hostMatch[1].toLowerCase();
  const watchHosts = new Set([
    "www.youtube.com",
    "youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "www.youtube-nocookie.com",
  ]);

  if (!watchHosts.has(host)) {
    return false;
  }

  if (/[?&]v=[\w-]+/i.test(u) && /\/watch\b/i.test(u)) {
    return true;
  }

  if (/\/shorts\/[\w-]+/i.test(u)) {
    return true;
  }

  if (/\/live\/[\w-]+/i.test(u)) {
    return true;
  }

  if (/\/embed\/[\w-]+/i.test(u)) {
    return true;
  }

  return false;
}

/** Decode a percent-encoded query fragment without the browser URL API. */
function decodeQueryComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function parseTimestampToken(raw: string): number | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  if (/[hms]/i.test(value)) {
    let total = 0;
    const hours = value.match(/(\d+)h/i);
    const minutes = value.match(/(\d+)m/i);
    const seconds = value.match(/(\d+)s/i);
    if (hours) {
      total += parseInt(hours[1], 10) * 3600;
    }
    if (minutes) {
      total += parseInt(minutes[1], 10) * 60;
    }
    if (seconds) {
      total += parseInt(seconds[1], 10);
    }
    return total > 0 ? total : null;
  }

  if (value.includes(":")) {
    const parts = value.split(":").map((part) => parseInt(part, 10));
    if (parts.every((part) => !Number.isNaN(part))) {
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
    }
    return null;
  }

  const numeric = parseInt(value.replace(/s$/i, ""), 10);
  return Number.isNaN(numeric) ? null : numeric;
}

/** Parse YouTube start offsets from t=, start=, or time_continue= query params. */
export function parseYouTubeTimestamp(url: string): number | null {
  const normalized = normalizeMediaURL(url);
  const params = ["t", "start", "time_continue"];

  for (const key of params) {
    const match = normalized.match(new RegExp(`[?&]${key}=([^&#]+)`, "i"));
    if (!match) {
      continue;
    }
    const seconds = parseTimestampToken(decodeQueryComponent(match[1]));
    if (seconds !== null && seconds >= 0) {
      return seconds;
    }
  }

  return null;
}

export function getYouTubePlaylistId(url: string): string | null {
  const match = normalizeMediaURL(url).match(/[?&]list=([^&#]+)/i);
  return match ? decodeQueryComponent(match[1]) : null;
}

export function getYouTubeVideoId(url: string): string | null {
  const normalized = normalizeMediaURL(url);

  let match = normalized.match(/[?&]v=([\w-]{6,})/i);
  if (match) {
    return match[1];
  }

  match = normalized.match(/youtu\.be\/([\w-]{6,})/i);
  if (match) {
    return match[1];
  }

  match = normalized.match(/\/shorts\/([\w-]{6,})/i);
  if (match) {
    return match[1];
  }

  match = normalized.match(/\/live\/([\w-]{6,})/i);
  if (match) {
    return match[1];
  }

  return null;
}

export function isYouTubePlaylistURL(url: string): boolean {
  return isYouTubeWatchURL(url) && getYouTubePlaylistId(url) !== null;
}

/** Canonical YouTube watch URL for a video ID. */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** YouTube thumbnail URL for a video ID. */
export function youtubeThumbnailUrl(videoId: string, quality: "hq" | "mq" = "hq"): string {
  const suffix = quality === "hq" ? "hqdefault" : "mqdefault";
  return `https://i.ytimg.com/vi/${videoId}/${suffix}.jpg`;
}