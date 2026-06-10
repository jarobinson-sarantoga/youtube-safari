#!/usr/bin/env node
/**
 * Compare InnerTube browse responses: Latest vs Subs vs other browseIds.
 * Usage: node scripts/test-latest-vs-subs.mjs [cookies.txt]
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const COOKIES_PATH =
  process.argv[2] || path.join(process.env.HOME, ".config/yt-dlp/cookies.txt");
const YT_ORIGIN = "https://www.youtube.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

const LATEST_PARAMS = "EgIIAhgBIhMCCAE%3D";

const SCENARIOS = [
  { id: "subs_all", label: "Subs — FEsubscriptions (no params)", browseId: "FEsubscriptions" },
  {
    id: "latest",
    label: "Latest — FEsubscriptions + EgIIAhgBIhMCCAE%3D",
    browseId: "FEsubscriptions",
    params: LATEST_PARAMS,
  },
  {
    id: "subs_alt1",
    label: "Alt — FEsubscriptions + EgIIAhgBIhMCCAE%3D decoded",
    browseId: "FEsubscriptions",
    params: decodeURIComponent(LATEST_PARAMS),
  },
  { id: "memberships", label: "FEmemberships", browseId: "FEmemberships" },
  { id: "spunlimited", label: "SPunlimited", browseId: "SPunlimited" },
  {
    id: "subs_referer_latest",
    label: "Subs browseId, Referer /feed/subscriptions?flow=2",
    browseId: "FEsubscriptions",
    referer: `${YT_ORIGIN}/feed/subscriptions?flow=2`,
  },
];

function parseNetscapeCookies(text) {
  const cookies = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split("\t");
    if (parts.length < 7) continue;
    cookies.push({ domain: parts[0], name: parts[5], value: parts[6] });
  }
  return cookies;
}

function buildCookieHeader(cookies) {
  return cookies
    .filter((c) => c.domain.includes("youtube.com"))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

function buildSapisidHash(sapisid) {
  const ts = Math.floor(Date.now() / 1000);
  const hash = crypto
    .createHash("sha1")
    .update(`${ts} ${sapisid} ${YT_ORIGIN}`)
    .digest("hex");
  return `SAPISIDHASH ${ts}_${hash}`;
}

function scrapeConfig(html) {
  const key = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  const ver = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1];
  if (!key) return null;
  return { apiKey: key, clientVersion: ver || "2.20240101.00.00" };
}

function walk(node, visitor) {
  if (!node || typeof node !== "object") return;
  visitor(node);
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visitor);
  } else {
    for (const v of Object.values(node)) walk(v, visitor);
  }
}

function extractVideoIds(data) {
  const ids = [];
  const seen = new Set();

  walk(data, (node) => {
    if (node.lockupViewModel?.contentId) {
      const id = node.lockupViewModel.contentId;
      if (!seen.has(id)) {
        seen.add(id);
        ids.push({ id, type: "lockupViewModel", title: getLockupTitle(node.lockupViewModel) });
      }
    }
    for (const key of ["videoRenderer", "gridVideoRenderer", "compactVideoRenderer"]) {
      if (node[key]?.videoId) {
        const id = node[key].videoId;
        if (!seen.has(id)) {
          seen.add(id);
          ids.push({ id, type: key, title: textFromRuns(node[key].title) });
        }
      }
    }
  });

  return ids;
}

function textFromRuns(node) {
  if (!node) return "";
  if (typeof node.simpleText === "string") return node.simpleText;
  if (Array.isArray(node.runs)) return node.runs.map((r) => r?.text || "").join("");
  return "";
}

function getLockupTitle(lockup) {
  const meta = lockup?.metadata?.lockupMetadataViewModel;
  const title = meta?.title;
  if (typeof title?.content === "string") return title.content;
  return textFromRuns(title);
}

function extractStructure(data) {
  const tabs = [];
  const shelves = [];
  const chipBar = [];
  const richSections = [];

  const tabList =
    data?.contents?.twoColumnBrowseResultsRenderer?.tabs ||
    data?.contents?.singleColumnBrowseResultsRenderer?.tabs ||
    [];

  for (const t of tabList) {
    const tr = t?.tabRenderer;
    if (tr?.title) {
      tabs.push({
        title: tr.title,
        selected: !!tr.selected,
        endpoint: tr.endpoint?.browseEndpoint || tr.endpoint?.commandMetadata?.webCommandMetadata,
        params: tr.endpoint?.browseEndpoint?.params,
      });
    }
  }

  walk(data, (node) => {
    if (node.shelfRenderer?.title) {
      shelves.push({
        title: textFromRuns(node.shelfRenderer.title),
        subtitle: textFromRuns(node.shelfRenderer.subtitle),
      });
    }
    if (node.richSectionRenderer?.title) {
      richSections.push(textFromRuns(node.richSectionRenderer.title));
    }
    if (node.chipCloudChipRenderer?.text) {
      chipBar.push({
        text: textFromRuns(node.chipCloudChipRenderer.text),
        selected: !!node.chipCloudChipRenderer.isSelected,
        params: node.chipCloudChipRenderer.navigationEndpoint?.browseEndpoint?.params,
      });
    }
    if (node.feedFilterChipBarRenderer?.contents) {
      for (const c of node.feedFilterChipBarRenderer.contents) {
        const chip = c?.chipCloudChipRenderer;
        if (chip) {
          chipBar.push({
            text: textFromRuns(chip.text),
            selected: !!chip.isSelected,
            params: chip.navigationEndpoint?.browseEndpoint?.params,
          });
        }
      }
    }
  });

  const loggedIn = data?.responseContext?.serviceTrackingParams
    ?.find((s) => s.service === "GFEEDBACK")
    ?.params?.find((p) => p.key === "logged_in")?.value;

  return {
    loggedIn,
    loggedOut: data?.responseContext?.mainAppWebResponseContext?.loggedOut,
    tabs,
    shelves: [...new Map(shelves.map((s) => [s.title, s])).values()],
    richSections: [...new Set(richSections)],
    chipBar,
    topKeys: Object.keys(data || {}),
    alert: data?.alerts?.[0]?.alertRenderer?.text?.simpleText,
  };
}

function overlapPercent(a, b) {
  const setA = new Set(a.map((x) => x.id));
  const setB = new Set(b.map((x) => x.id));
  if (setA.size === 0 && setB.size === 0) return 100;
  const intersection = [...setA].filter((id) => setB.has(id)).length;
  const union = new Set([...setA, ...setB]).size;
  return { intersection, union, pct: union ? Math.round((intersection / union) * 100) : 0, firstMatch: a[0]?.id === b[0]?.id };
}

async function browse(config, { browseId, params, referer }, cookieHeader, auth) {
  const url = `${YT_ORIGIN}/youtubei/v1/browse?key=${config.apiKey}&prettyPrint=false`;
  const body = {
    context: {
      client: {
        clientName: "WEB",
        clientVersion: config.clientVersion,
        hl: "en",
        gl: "US",
        originalUrl: `${YT_ORIGIN}/feed/subscriptions`,
        platform: "DESKTOP",
      },
      user: {},
      request: {},
    },
    browseId,
  };
  if (params) body.params = params;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
      Origin: YT_ORIGIN,
      Referer: referer || `${YT_ORIGIN}/feed/subscriptions`,
      "X-YouTube-Client-Name": "1",
      "X-YouTube-Client-Version": config.clientVersion,
      Cookie: cookieHeader,
      Authorization: auth,
      "X-Goog-AuthUser": "0",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  console.log("=== Latest vs Subs InnerTube comparison ===\n");

  if (!fs.existsSync(COOKIES_PATH)) {
    console.error(`No cookies at ${COOKIES_PATH}`);
    process.exit(1);
  }

  const cookies = parseNetscapeCookies(fs.readFileSync(COOKIES_PATH, "utf8"));
  const cookieHeader = buildCookieHeader(cookies);
  const sapisid = cookies.find((c) => c.name === "SAPISID" && c.domain.includes("youtube.com"))?.value;
  if (!sapisid) {
    console.error("SAPISID missing on .youtube.com");
    process.exit(1);
  }
  const auth = buildSapisidHash(sapisid);

  const home = await fetch(`${YT_ORIGIN}/`, { headers: { "User-Agent": UA } });
  const config = scrapeConfig(await home.text());
  if (!config) {
    console.error("Failed to scrape config");
    process.exit(1);
  }

  const results = {};

  for (const scenario of SCENARIOS) {
    const { status, data } = await browse(config, scenario, cookieHeader, auth);
    const structure = extractStructure(data);
    const videos = extractVideoIds(data);

    results[scenario.id] = { scenario, status, structure, videos, data };

    console.log(`--- ${scenario.label} ---`);
    console.log(`HTTP ${status} logged_in=${structure.loggedIn} loggedOut=${structure.loggedOut}`);
    if (structure.alert) console.log(`Alert: ${structure.alert}`);
    console.log(`Videos extracted: ${videos.length}`);
    if (videos[0]) console.log(`  First: [${videos[0].id}] ${videos[0].title?.slice(0, 60)}`);
    if (videos[1]) console.log(`  Second: [${videos[1].id}] ${videos[1].title?.slice(0, 60)}`);
    if (structure.tabs.length) {
      console.log(`Tabs: ${structure.tabs.map((t) => `${t.title}${t.selected ? "*" : ""}${t.params ? ` (${t.params.slice(0, 20)}…)` : ""}`).join(", ")}`);
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

  // Decode latest params
  console.log("\n=== Latest params protobuf decode ===");
  try {
    const buf = Buffer.from(decodeURIComponent(LATEST_PARAMS), "base64");
    console.log(`Hex: ${buf.toString("hex")}`);
    console.log(`ASCII-ish: ${buf.toString("binary").replace(/[^\x20-\x7e]/g, ".")}`);
  } catch (e) {
    console.log(`Decode error: ${e}`);
  }

  // Write samples for manual inspection
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