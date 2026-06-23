#!/usr/bin/env node
/**
 * Compare InnerTube browse responses: Latest vs Subs vs other browseIds.
 * Usage: node scripts/test-latest-vs-subs.mjs [cookies.txt]
 */

import fs from "node:fs";
import path from "node:path";
import { webBrowse } from "./lib/innertube-browse.mjs";
import {
  buildCookieHeader,
  buildSapisidHash,
  parseNetscapeCookies,
} from "./lib/innertube-cookies.mjs";
import { LATEST_PARAMS, UA, YT_ORIGIN } from "./lib/innertube-constants.mjs";
import { scrapeConfigSimple } from "./lib/innertube-config.mjs";
import {
  extractStructure,
  extractVideoIds,
  overlapPercent,
} from "./lib/innertube-extract.mjs";
import { LATEST_VS_SUBS_SCENARIOS } from "./lib/innertube-latest-scenarios.mjs";

const COOKIES_PATH =
  process.argv[2] || path.join(process.env.HOME, ".config/yt-dlp/cookies.txt");

function printScenario(scenario, status, structure, videos) {
  console.log(`--- ${scenario.label} ---`);
  console.log(`HTTP ${status} logged_in=${structure.loggedIn} loggedOut=${structure.loggedOut}`);
  if (structure.alert) console.log(`Alert: ${structure.alert}`);
  console.log(`Videos extracted: ${videos.length}`);
  if (videos[0]) console.log(`  First: [${videos[0].id}] ${videos[0].title?.slice(0, 60)}`);
  if (videos[1]) console.log(`  Second: [${videos[1].id}] ${videos[1].title?.slice(0, 60)}`);
  if (structure.tabs.length) {
    console.log(
      `Tabs: ${structure.tabs.map((t) => `${t.title}${t.selected ? "*" : ""}${t.params ? ` (${t.params.slice(0, 20)}…)` : ""}`).join(", ")}`,
    );
  }
  if (structure.chipBar.length) {
    console.log(
      `Chips: ${structure.chipBar.map((c) => `${c.text}${c.selected ? "*" : ""}${c.params ? ` [${c.params}]` : ""}`).join(", ")}`,
    );
  }
  if (structure.shelves.length) {
    console.log(`Shelves: ${structure.shelves.map((s) => s.title).join(" | ")}`);
  }
  if (structure.richSections.length) {
    console.log(`Rich sections: ${structure.richSections.join(" | ")}`);
  }
  console.log("");
}

async function main() {
  console.log("=== Latest vs Subs InnerTube comparison ===\n");

  if (!fs.existsSync(COOKIES_PATH)) {
    console.error(`No cookies at ${COOKIES_PATH}`);
    process.exit(1);
  }

  const cookies = parseNetscapeCookies(fs.readFileSync(COOKIES_PATH, "utf8"));
  const cookieHeader = buildCookieHeader(cookies);
  const sapisid = cookies.find(
    (c) => c.name === "SAPISID" && c.domain.includes("youtube.com"),
  )?.value;
  if (!sapisid) {
    console.error("SAPISID missing on .youtube.com");
    process.exit(1);
  }
  const auth = buildSapisidHash(sapisid);

  const home = await fetch(`${YT_ORIGIN}/`, { headers: { "User-Agent": UA } });
  const config = scrapeConfigSimple(await home.text());
  if (!config) {
    console.error("Failed to scrape config");
    process.exit(1);
  }

  const results = {};

  for (const scenario of LATEST_VS_SUBS_SCENARIOS) {
    const { status, data } = await webBrowse(config, scenario, cookieHeader, auth);
    const structure = extractStructure(data);
    const videos = extractVideoIds(data);

    results[scenario.id] = { scenario, status, structure, videos, data };
    printScenario(scenario, status, structure, videos);
  }

  const subs = results.subs_all?.videos || [];
  const latest = results.latest?.videos || [];

  console.log("=== OVERLAP: subs_all vs latest ===");
  const ov = overlapPercent(subs, latest);
  console.log(`Intersection: ${ov.intersection} / Union: ${ov.union} (${ov.pct}% overlap)`);
  console.log(`Same first video: ${ov.firstMatch}`);
  console.log(`First 10 subs:   ${subs.slice(0, 10).map((v) => v.id).join(", ")}`);
  console.log(`First 10 latest: ${latest.slice(0, 10).map((v) => v.id).join(", ")}`);

  const onlyInSubs = subs.filter((v) => !latest.some((l) => l.id === v.id)).slice(0, 5);
  const onlyInLatest = latest.filter((v) => !subs.some((s) => s.id === v.id)).slice(0, 5);
  console.log(`\nOnly in subs (first 5): ${onlyInSubs.map((v) => v.id).join(", ") || "(none)"}`);
  console.log(`Only in latest (first 5): ${onlyInLatest.map((v) => v.id).join(", ") || "(none)"}`);

  console.log("\n=== Latest params protobuf decode ===");
  try {
    const buf = Buffer.from(decodeURIComponent(LATEST_PARAMS), "base64");
    console.log(`Hex: ${buf.toString("hex")}`);
    console.log(`ASCII-ish: ${buf.toString("binary").replace(/[^\x20-\x7e]/g, ".")}`);
  } catch (e) {
    console.log(`Decode error: ${e}`);
  }

  const outDir = path.join(path.dirname(COOKIES_PATH), "latest-vs-subs-output");
  fs.mkdirSync(outDir, { recursive: true });
  for (const id of ["subs_all", "latest"]) {
    if (results[id]) {
      fs.writeFileSync(
        path.join(outDir, `${id}.json`),
        JSON.stringify(results[id].data, null, 2).slice(0, 200000),
      );
    }
  }
  fs.writeFileSync(
    path.join(outDir, "summary.json"),
    JSON.stringify(
      Object.fromEntries(
        Object.entries(results).map(([k, r]) => [
          k,
          {
            label: r.scenario.label,
            videoCount: r.videos.length,
            firstIds: r.videos.slice(0, 15).map((v) => v.id),
            structure: r.structure,
          },
        ]),
      ),
      null,
      2,
    ),
  );
  console.log(`\nSamples: ${outDir}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
