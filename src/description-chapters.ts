export interface DescriptionChapter {
  seconds: number;
  timestamp: string;
  label: string;
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

function formatTimestamp(seconds: number): string {
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/** Normalize chapter objects from yt-dlp JSON or other sources. */
export function normalizeChapters(raw: unknown): DescriptionChapter[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const chapters: DescriptionChapter[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const secondsRaw = record.seconds;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    if (typeof secondsRaw !== "number" || !Number.isFinite(secondsRaw) || secondsRaw < 0 || !label) {
      continue;
    }
    const seconds = Math.floor(secondsRaw);
    const timestamp =
      typeof record.timestamp === "string" && record.timestamp.trim()
        ? record.timestamp.trim()
        : formatTimestamp(seconds);
    chapters.push({ seconds, timestamp, label });
  }

  return chapters;
}

/** Prefer yt-dlp chapters; fall back to description timestamp lines. */
export function pickChapters(
  fromYtdlp: DescriptionChapter[] | undefined,
  description: string,
): DescriptionChapter[] {
  if (fromYtdlp && fromYtdlp.length > 0) {
    return fromYtdlp;
  }
  return parseDescriptionChapters(description);
}

/** Parse YouTube-style chapter lines from a video description. */
export function parseDescriptionChapters(description: string): DescriptionChapter[] {
  const chapters: DescriptionChapter[] = [];

  for (const line of description.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const match = /^[\s•\-*]*(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/.exec(trimmed);
    if (!match) {
      continue;
    }

    const seconds = parseTimestampToken(match[1]);
    if (seconds === null) {
      continue;
    }

    chapters.push({
      seconds,
      timestamp: match[1],
      label: match[2].trim(),
    });
  }

  return chapters;
}