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
  return null;
}
