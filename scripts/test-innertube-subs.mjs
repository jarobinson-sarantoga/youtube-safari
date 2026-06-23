#!/usr/bin/env node
/**
 * Smoke test: InnerTube browse FEsubscriptions with cookies + client variants.
 * Usage: node scripts/test-innertube-subs.mjs [cookies.txt path]
 */

import fs from "node:fs";
import path from "node:path";
import { innertubeBrowse } from "./lib/innertube-browse.mjs";
import {
  buildCookieHeader,
  buildSapisidHash,
  parseNetscapeCookies,
} from "./lib/innertube-cookies.mjs";
import {
  LATEST_PARAMS_DECODED,
  UA,
  YT_ORIGIN,
} from "./lib/innertube-constants.mjs";
import { scrapeConfig } from "./lib/innertube-config.mjs";
import { summarizeResponse } from "./lib/innertube-response.mjs";
import { buildSubsScenarios } from "./lib/innertube-subs-scenarios.mjs";
import {
  logCookieAuth,
  logLatestParamsDecode,
  printScenarioResult,
  writeSubsSamples,
} from "./lib/innertube-subs-run.mjs";

const COOKIES_PATH =
  process.argv[2] ||
  path.join(process.env.HOME, ".config/yt-dlp/cookies.txt");

async function main() {
  console.log("=== InnerTube FEsubscriptions test ===\n");
  console.log(`Cookies: ${COOKIES_PATH}`);

  if (!fs.existsSync(COOKIES_PATH)) {
    console.error("cookies file not found");
    process.exit(1);
  }

  const raw = fs.readFileSync(COOKIES_PATH, "utf8");
  console.log(`Size: ${raw.length} bytes\n`);

  const cookies = parseNetscapeCookies(raw);
  const cookieHeaderAll = buildCookieHeader(cookies, "all");
  const cookieHeaderYt = buildCookieHeader(cookies, "youtube-only");
  logCookieAuth(cookies, cookieHeaderAll, cookieHeaderYt);

  const homeRes = await fetch(`${YT_ORIGIN}/`, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
  });
  const config = scrapeConfig(await homeRes.text());
  if (!config) {
    console.error("Failed to scrape INNERTUBE_API_KEY");
    process.exit(1);
  }
  console.log(`API key: ${config.apiKey.slice(0, 12)}...`);
  console.log(`Client version: ${config.clientVersion}\n`);

  const sapisidYt = cookies.find(
    (c) => c.name === "SAPISID" && c.domain.includes("youtube.com"),
  )?.value;
  const sapisidGoogle = cookies.find(
    (c) => c.name === "SAPISID" && c.domain === ".google.com",
  )?.value;
  const authYt = sapisidYt ? buildSapisidHash(sapisidYt) : null;
  const authGoogle = sapisidGoogle ? buildSapisidHash(sapisidGoogle) : null;

  const scenarios = buildSubsScenarios({
    cookieHeaderAll,
    cookieHeaderYt,
    authYt,
    authGoogle,
  });

  const results = [];
  for (const scenario of scenarios) {
    const result = await innertubeBrowse({
      config,
      cookieHeader: scenario.noCookies ? "" : scenario.cookieHeader,
      authorization: scenario.authorization,
      clientKey: scenario.clientKey,
      browseId: scenario.browseId,
      params: scenario.params,
    });

    const summary = summarizeResponse(result.data);
    results.push({ scenario: scenario.label, status: result.status, summary });
    printScenarioResult(scenario.label, result.status, summary);
  }

  await writeSubsSamples({
    cookiesPath: COOKIES_PATH,
    results,
    config,
    cookieHeaderAll,
    cookieHeaderYt,
    authYt,
  });
  logLatestParamsDecode(LATEST_PARAMS_DECODED);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
