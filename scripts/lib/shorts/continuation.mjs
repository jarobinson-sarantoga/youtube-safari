/** Extract reel_watch_sequence continuation token from a parsed InnerTube response. */
export function extractContinuation(response) {
  const token = response?.continuation_endpoint?.token;
  if (typeof token === "string" && token.trim().length > 0) {
    return token.trim();
  }
  const endpoint = response?.continuationEndpoint;
  const seq = endpoint?.reelWatchSequenceEndpoint?.sequenceParams;
  if (typeof seq === "string" && seq.trim().length > 0) {
    return seq.trim();
  }
  const cmd = endpoint?.continuationCommand?.token;
  if (typeof cmd === "string" && cmd.trim().length > 0) {
    return cmd.trim();
  }
  return null;
}
