import { execBashJsonLine } from "../ytdlp-script";
import { buildPlaylistArgs } from "./scripts";
import type { PlaylistEntry, PlaylistListing, PlaylistPayload } from "./types";

export async function listYouTubePlaylist(url: string): Promise<PlaylistListing> {
  const args = buildPlaylistArgs(url);
  const result = await execBashJsonLine<PlaylistPayload>(args, "Listing playlist");

  if (!result.ok || !result.data) {
    throw new Error(result.error || "playlist listing failed");
  }

  const payload = result.data;

  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  if (!entries.length) {
    throw new Error(payload.error || "playlist has no entries");
  }

  return {
    title: payload.title || "YouTube Playlist",
    entries: entries.filter(
      (entry): entry is PlaylistEntry =>
        typeof entry?.url === "string" &&
        typeof entry?.id === "string" &&
        typeof entry?.title === "string",
    ),
  };
}
