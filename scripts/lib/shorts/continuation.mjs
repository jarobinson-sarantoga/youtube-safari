/** Extract reel_watch_sequence continuation token from a parsed InnerTube response. */
export function extractContinuation(response) {
  const token = response?.continuation_endpoint?.token;
  if (typeof token === "string" && token.length > 0) {
    return token;
  }
  const endpoint = response?.continuationEndpoint;
  const seq = endpoint?.reelWatchSequenceEndpoint?.sequenceParams;
  if (typeof seq === "string" && seq.length > 0) {
    return seq;
  }
  const cmd = endpoint?.continuationCommand?.token;
  if (typeof cmd === "string" && cmd.length > 0) {
    return cmd;
  }
  const entries = response?.entries;
  if (Array.isArray(entries) && entries.length > 0) {
    const last = entries[entries.length - 1];
    const params =
      last?.command?.reelWatchEndpoint?.sequenceParams ||
      last?.payload?.params;
    if (typeof params === "string" && params.length > 0) {
      return params;
    }
  }
  return null;
}
