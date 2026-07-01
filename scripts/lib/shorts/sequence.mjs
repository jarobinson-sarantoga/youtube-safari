import { extractContinuation } from "./continuation.mjs";
import { mapReelSequenceEntries } from "./map-sequence.mjs";
import { pickSeedShortId } from "./seed.mjs";

const MAX_MERGE_PAGES = 8;

async function executeSequence(yt, sequenceParams) {
  return yt.session.actions.execute("/reel/reel_watch_sequence", {
    sequenceParams,
    parse: true,
  });
}

async function fetchInitialSequence(yt) {
  const seed = await pickSeedShortId(yt);
  const info = await yt.getShortsVideoInfo(seed);
  const items = mapReelSequenceEntries(info.watch_next_feed);
  let continuation = null;

  if (info.wn_has_continuation) {
    const bridgeParams = info.watch_next_feed?.at(-1)?.payload?.params;
    if (bridgeParams) {
      const bridge = await executeSequence(yt, bridgeParams);
      continuation = extractContinuation(bridge);
    }
  }

  return { items, continuation };
}

async function mergeUntilLimit(yt, items, continuation, limit) {
  let merged = [...items];
  let token = continuation;
  let pages = 0;

  while (token && merged.length < limit && pages < MAX_MERGE_PAGES) {
    const response = await executeSequence(yt, token);
    const batch = mapReelSequenceEntries(response.entries);
    const seen = new Set(merged.map((item) => item.videoId));
    for (const item of batch) {
      if (!seen.has(item.videoId)) {
        seen.add(item.videoId);
        merged.push(item);
      }
    }
    token = extractContinuation(response);
    pages += 1;
  }

  return { items: merged.slice(0, limit), continuation: token };
}

/** Fetch algorithmic Shorts via reel/reel_watch_sequence. */
export async function fetchShortsSequence(yt, continuation = "", limit = 60) {
  if (continuation) {
    const response = await executeSequence(yt, continuation);
    const items = mapReelSequenceEntries(response.entries);
    return {
      items: items.slice(0, limit),
      continuation: extractContinuation(response),
    };
  }

  const initial = await fetchInitialSequence(yt);
  if (!initial.items.length) {
    return { items: [], continuation: null };
  }

  return mergeUntilLimit(yt, initial.items, initial.continuation, limit);
}
