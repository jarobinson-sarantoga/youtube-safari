#!/usr/bin/env node
/**
 * Fetch a browse feed via YouTube.js (runs outside IINA).
 * Usage: node scripts/youtubejs-feed.mjs --tab home [--cookies PATH] [--query Q] [--video-id ID] [--limit N]
 */
import fs from "node:fs";
import {
  authEmptyHint,
  REFRESH_COOKIES_HINT,
} from "./lib/youtubejs-feed-auth.mjs";
import { fetchTabItems, parseArgs } from "./lib/youtubejs-feed-lib.mjs";
import {
  getYouTubeClient,
  hasBrowseAuth,
  hasYouTubeAuth,
  resetYouTubeClient,
} from "./lib/youtubejs-client.mjs";

function emit(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.tab) {
    emit({ items: [], error: "missing --tab" });
    process.exit(2);
  }

  if (!fs.existsSync(args.cookies)) {
    emit({ items: [], emptyHint: REFRESH_COOKIES_HINT });
    return;
  }

  if (!hasYouTubeAuth(args.cookies) || !hasBrowseAuth(args.cookies)) {
    emit({ items: [], emptyHint: authEmptyHint(args.cookies) });
    return;
  }

  try {
    resetYouTubeClient();
    const yt = await getYouTubeClient(args.cookies);
    const result = await fetchTabItems(yt, args);
    if (result.exitCode) {
      emit(result);
      process.exit(result.exitCode);
    }
    emit(result);
  } catch (err) {
    emit({ items: [], error: String(err), emptyHint: REFRESH_COOKIES_HINT });
    process.exit(1);
  }
}

void main();
