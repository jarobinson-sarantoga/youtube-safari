import { mapHomeFeed } from "../youtubejs-map-feeds.mjs";

const FALLBACK_SEED = "RXpkF-Wbhjo";

/** Pick a seed short ID from the home feed or fall back to a known short. */
export async function pickSeedShortId(yt) {
  try {
    const home = await yt.getHomeFeed();
    if (home.memo) {
      for (const node of home.memo.getType("ShortsLockupView", "ReelItem")) {
        const payload = node.on_tap_endpoint?.payload;
        const id =
          node.id ||
          payload?.videoId ||
          payload?.reelWatchEndpoint?.videoId ||
          node.entity_id?.replace(/^shorts-shelf-item-/, "");
        if (id) return id;
      }
    }
    const mapped = mapHomeFeed(home);
    const short = mapped.find((item) => item.isShort);
    if (short?.videoId) return short.videoId;
  } catch {
    // fall through
  }
  return FALLBACK_SEED;
}
