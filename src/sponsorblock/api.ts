import { appendLog } from "../ytdl";
import { isSponsorBlockEnabled } from "../preferences";
import type { SponsorCategory, SponsorSegment } from "./types";
import { DEFAULT_SPONSOR_CATEGORIES } from "./types";

const { http } = iina;

const API_BASE = "https://sponsor.ajay.app/api/skipSegments";

export async function fetchSponsorSegments(
  videoId: string,
): Promise<SponsorSegment[]> {
  if (!isSponsorBlockEnabled() || !videoId) {
    return [];
  }

  const categories = JSON.stringify(DEFAULT_SPONSOR_CATEGORIES);
  const url = `${API_BASE}?videoID=${encodeURIComponent(videoId)}&categories=${encodeURIComponent(categories)}`;

  try {
    const res = await http.get(url, {
      headers: { Accept: "application/json" },
    });
    const body = typeof res.body === "string" ? res.body : "";
    if (!body) {
      return [];
    }
    const parsed = JSON.parse(body) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const segments: SponsorSegment[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const record = entry as Record<string, unknown>;
      const segment = record.segment;
      if (!Array.isArray(segment) || segment.length < 2) {
        continue;
      }
      const start = Number(segment[0]);
      const end = Number(segment[1]);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        continue;
      }
      segments.push({
        start,
        end,
        category: String(record.category || "sponsor") as SponsorCategory,
        votes: Number(record.votes) || 0,
      });
    }
    segments.sort((a, b) => a.start - b.start);
    appendLog(`SponsorBlock: ${segments.length} segments for ${videoId}`);
    return segments;
  } catch (err) {
    appendLog(`SponsorBlock fetch failed: ${err}`);
    return [];
  }
}
