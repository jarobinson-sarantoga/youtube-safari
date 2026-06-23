import { normalizeMediaURL } from "./normalize";
import { decodeQueryComponent } from "./query";

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
