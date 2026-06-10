import { sha1Hex } from "./sha1";

const YT_ORIGIN = "https://www.youtube.com";

/** Build YouTube InnerTube Authorization header from .youtube.com SAPISID. */
export function buildSapisidAuthorization(sapisid: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const hash = sha1Hex(`${ts} ${sapisid} ${YT_ORIGIN}`);
  return `SAPISIDHASH ${ts}_${hash}`;
}