#!/usr/bin/env node
/**
 * Smoke test: InnerTube browse FEsubscriptions with cookies + client variants.
 * Usage: node scripts/test-innertube-subs.mjs [cookies.txt path]
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const COOKIES_PATH =
  process.argv[2] ||
  path.join(process.env.HOME, ".config/yt-dlp/cookies.txt");
const YT_ORIGIN = "https://www.youtube.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

const LATEST_PARAMS = "EgIIAhgBIhMCCAE%3D";
const LATEST_PARAMS_DECODED = decodeURIComponent(LATEST_PARAMS);

const YOUTUBE_DOMAINS = new Set([
  ".youtube.com",
  "youtube.com",
  ".www.youtube.com",
  "www.youtube.com",
  ".m.youtube.com",
  ".google.com",
  ".googlevideo.com",
]);

function parseNetscapeCookies(text) {
  const cookies = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split("\t");
    if (parts.length < 7) continue;
    cookies.push({
      domain: parts[0],
      name: parts[5],
      value: parts[6],
    });
  }
  return cookies;
}

function buildCookieHeader(cookies, scope = "all") {
  const filtered = cookies.filter((c) => {
    if (scope === "youtube-only") {
      return c.domain.includes("youtube.com");
    }
    return [...YOUTUBE_DOMAINS].some(
      (d) => c.domain === d || c.domain.endsWith(d) || c.domain.endsWith(".youtube.com"),
    );
  });
  return filtered.map((c) => `${c.name}=${c.value}`).join("; ");
}

function cookieMap(cookies) {
  const map = new Map();
  for (const c of cookies) {
    if (c.domain.includes("youtube.com") || c.domain.includes("google.com")) {
      map.set(c.name, c.value);
    }
  }
  return map;
}

function buildSapisidHash(sapisid, origin = YT_ORIGIN) {
  const ts = Math.floor(Date.now() / 1000);
  const input = `${ts} ${sapisid} ${origin}`;
  const hash = crypto.createHash("sha1").update(input).digest("hex");
  return `SAPISIDHASH ${ts}_${hash}`;
}

function scrapeConfig(html) {
  const keyMatch =
    html.match(/"INNERTUBE_API_KEY":"([^"]+)"/) ||
    html.match(/INNERTUBE_API_KEY['"]\s*:\s*['"]([^'"]+)['"]/);
  const versionMatch =
    html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/) ||
    html.match(/INNERTUBE_CLIENT_VERSION['"]\s*:\s*['"]([^'"]+)['"]/);
  if (!keyMatch?.[1]) return null;
  return {
    apiKey: keyMatch[1],
    clientVersion: versionMatch?.[1] || "2.20240101.00.00",
  };
}

const CLIENTS = {
  WEB: { clientName: "WEB", clientId: "1" },
  WEB_REMIX: { clientName: "WEB_REMIX", clientId: "67" },
  ANDROID: {
    clientName: "ANDROID",
    clientId: "3",
    extra: { androidSdkVersion: 30, userAgent: UA },
  },
};

function buildContext(clientKey, clientVersion) {
  const spec = CLIENTS[clientKey];
  const client = {
    clientName: spec.clientName,
    clientVersion,
    hl: "en",
    gl: "US",
    originalUrl: `${YT_ORIGIN}/`,
    platform: clientKey === "ANDROID" ? "MOBILE" : "DESKTOP",
    ...spec.extra,
  };
  return { client, user: {}, request: {} };
}

function countVideoRenderers(node, counts = {}) {
  if (!node) return counts;
  if (Array.isArray(node)) {
    for (const item of node) countVideoRenderers(item, counts);
    return counts;
  }
  if (typeof node !== "object") return counts;

  for (const [key, value] of Object.entries(node)) {
    if (key === "videoRenderer" || key === "gridVideoRenderer" || key === "compactVideoRenderer") {
      counts[key] = (counts[key] || 0) + 1;
    }
    if (value && typeof value === "object") countVideoRenderers(value, counts);
  }
  return counts;
}

function findSignInMessages(node, out = []) {
  if (!node) return out;
  if (Array.isArray(node)) {
    for (const item of node) findSignInMessages(item, out);
    return out;
  }
  if (typeof node !== "object") return out;

  const text =
    node.simpleText ||
    (Array.isArray(node.runs)
      ? node.runs.map((r) => r?.text || "").join("")
      : "");

  if (/sign in/i.test(text)) {
    out.push(text.slice(0, 120));
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === "object") findSignInMessages(value, out);
  }
  return out;
}

function summarizeResponse(data) {
  const counts = countVideoRenderers(data);
  const lockups = JSON.stringify(data).split("lockupViewModel").length - 1;
  const signIn = findSignInMessages(data);
  const loggedIn = data?.responseContext?.serviceTrackingParams
    ?.find((s) => s.service === "GFEEDBACK")
    ?.params?.find((p) => p.key === "logged_in")?.value;
  const loggedOut = data?.responseContext?.mainAppWebResponseContext?.loggedOut;
  const tabs =
    data?.contents?.twoColumnBrowseResultsRenderer?.tabs ||
    data?.contents?.singleColumnBrowseResultsRenderer?.tabs ||
    [];

  const tabTitles = tabs
    .map((t) => {
      const title = t?.tabRenderer?.title;
      return typeof title === "string" ? title : null;
    })
    .filter(Boolean);

  const shelfTitles = [];
  const walkShelves = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.shelfRenderer?.title?.simpleText) {
      shelfTitles.push(node.shelfRenderer.title.simpleText);
    }
    if (Array.isArray(node)) {
      for (const item of node) walkShelves(item);
    } else {
      for (const v of Object.values(node)) walkShelves(v);
    }
  };
  walkShelves(data);

  const topKeys = data && typeof data === "object" ? Object.keys(data) : [];
  const alert = data?.alerts?.[0]?.alertRenderer?.text?.simpleText;

  return {
    counts,
    lockups,
    totalVideos: Object.values(counts).reduce((a, b) => a + b, 0),
    loggedIn,
    loggedOut,
    signIn,
    tabTitles,
    shelfTitles: [...new Set(shelfTitles)].slice(0, 8),
    alert,
    topKeys,
    responseContextVisitorId: data?.responseContext?.visitorData?.slice?.(0, 20),
  };
}

async function innertubeBrowse({
  config,
  cookieHeader,
  authorization,
  clientKey,
  browseId,
  params,
}) {
  const spec = CLIENTS[clientKey];
  const url = `${YT_ORIGIN}/youtubei/v1/browse?key=${config.apiKey}&prettyPrint=false`;
  const body = {
    context: buildContext(clientKey, config.clientVersion),
    browseId,
  };
  if (params) body.params = params;

  const headers = {
    "Content-Type": "application/json",
    "User-Agent": UA,
    Origin: YT_ORIGIN,
    Referer: `${YT_ORIGIN}/feed/subscriptions`,
    "X-YouTube-Client-Name": spec.clientId,
    "X-YouTube-Client-Version": config.clientVersion,
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
  };
  if (cookieHeader) headers.Cookie = cookieHeader;
  if (authorization) headers.Authorization = authorization;
  if (authorization) headers["X-Goog-AuthUser"] = "0";

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _parseError: true, _preview: text.slice(0, 500) };
  }

  return { status: res.status, data, body };
}

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
  const cmap = cookieMap(cookies);
  const cookieHeaderAll = buildCookieHeader(cookies, "all");
  const cookieHeaderYt = buildCookieHeader(cookies, "youtube-only");

  const authNames = ["LOGIN_INFO", "__Secure-1PSID", "SAPISID", "__Secure-3PSID"];
  for (const name of authNames) {
    const onYt = cookies.some(
      (c) => c.name === name && c.domain.includes("youtube.com"),
    );
    console.log(`  ${name} on .youtube.com: ${onYt ? "yes" : "no"}`);
  }
  console.log(
    `  Cookie header entries: all=${cookieHeaderAll.split("; ").length}, youtube-only=${cookieHeaderYt.split("; ").length}\n`,
  );

  const homeRes = await fetch(`${YT_ORIGIN}/`, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
  });
  const homeHtml = await homeRes.text();
  const config = scrapeConfig(homeHtml);
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

  const scenarios = [
    {
      label: "WEB / FEsubscriptions / ALL cookies (plugin default)",
      clientKey: "WEB",
      browseId: "FEsubscriptions",
      params: undefined,
      authorization: null,
      cookieHeader: cookieHeaderAll,
    },
    {
      label: "WEB / FEsubscriptions / youtube-only cookies",
      clientKey: "WEB",
      browseId: "FEsubscriptions",
      params: undefined,
      authorization: null,
      cookieHeader: cookieHeaderYt,
    },
    {
      label: "WEB / FEsubscriptions / youtube-only + SAPISIDHASH",
      clientKey: "WEB",
      browseId: "FEsubscriptions",
      params: undefined,
      authorization: authYt,
      cookieHeader: cookieHeaderYt,
    },
    {
      label: "WEB / FEsubscriptions / latest / youtube-only + SAPISIDHASH",
      clientKey: "WEB",
      browseId: "FEsubscriptions",
      params: LATEST_PARAMS,
      authorization: authYt,
      cookieHeader: cookieHeaderYt,
    },
    {
      label: "WEB / FEsubscriptions / cookies only",
      clientKey: "WEB",
      browseId: "FEsubscriptions",
      params: undefined,
      authorization: null,
      cookieHeader: cookieHeaderAll,
    },
    {
      label: "WEB / FEsubscriptions / cookies + SAPISIDHASH (.youtube.com)",
      clientKey: "WEB",
      browseId: "FEsubscriptions",
      params: undefined,
      authorization: authYt,
      cookieHeader: cookieHeaderAll,
    },
    {
      label: "WEB / FEsubscriptions / cookies + SAPISIDHASH (.google.com)",
      clientKey: "WEB",
      browseId: "FEsubscriptions",
      params: undefined,
      authorization: authGoogle,
      cookieHeader: cookieHeaderAll,
    },
    {
      label: `WEB / FEsubscriptions / latest params (${LATEST_PARAMS}) / cookies only`,
      clientKey: "WEB",
      browseId: "FEsubscriptions",
      params: LATEST_PARAMS,
      authorization: null,
      cookieHeader: cookieHeaderAll,
    },
    {
      label: `WEB / FEsubscriptions / latest params decoded (${LATEST_PARAMS_DECODED}) / cookies only`,
      clientKey: "WEB",
      browseId: "FEsubscriptions",
      params: LATEST_PARAMS_DECODED,
      authorization: null,
      cookieHeader: cookieHeaderAll,
    },
    {
      label: "WEB / FEsubscriptions / latest params / cookies + SAPISIDHASH",
      clientKey: "WEB",
      browseId: "FEsubscriptions",
      params: LATEST_PARAMS,
      authorization: authYt,
      cookieHeader: cookieHeaderAll,
    },
    {
      label: "WEB_REMIX / FEsubscriptions / cookies + SAPISIDHASH",
      clientKey: "WEB_REMIX",
      browseId: "FEsubscriptions",
      params: undefined,
      authorization: authYt,
      cookieHeader: cookieHeaderAll,
    },
    {
      label: "ANDROID / FEsubscriptions / cookies only",
      clientKey: "ANDROID",
      browseId: "FEsubscriptions",
      params: undefined,
      authorization: null,
      cookieHeader: cookieHeaderAll,
    },
    {
      label: "WEB / FEsubscriptions / NO cookies",
      clientKey: "WEB",
      browseId: "FEsubscriptions",
      params: undefined,
      authorization: null,
      noCookies: true,
      cookieHeader: "",
    },
  ];

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

    console.log(`--- ${scenario.label} ---`);
    console.log(`HTTP ${result.status}`);
    console.log(`logged_in=${summary.loggedIn} loggedOut=${summary.loggedOut}`);
    console.log(`Video renderers: ${JSON.stringify(summary.counts)} (total ${summary.totalVideos}) lockups=${summary.lockups}`);
    if (summary.alert) console.log(`Alert: ${summary.alert}`);
    if (summary.signIn.length) console.log(`Sign-in text: ${summary.signIn.join(" | ")}`);
    if (summary.tabTitles.length) console.log(`Tabs: ${summary.tabTitles.join(", ")}`);
    if (summary.shelfTitles.length) console.log(`Shelves: ${summary.shelfTitles.join(", ")}`);
    console.log(`Top keys: ${summary.topKeys.join(", ")}`);
    console.log("");
  }

  const outDir = path.join(path.dirname(COOKIES_PATH), "innertube-test-output");
  fs.mkdirSync(outDir, { recursive: true });

  const pick = (label) =>
    results.find((r) => r.scenario === label);

  const working =
    results.find((r) => r.summary.totalVideos > 0) ||
    results.find((r) => r.summary.shelfTitles.length > 0 && !r.scenario.includes("NO cookies"));

  const pluginDefault = pick("WEB / FEsubscriptions / ALL cookies (plugin default)");
  const withAuth = pick("WEB / FEsubscriptions / youtube-only + SAPISIDHASH");

  if (working) {
    const full = await innertubeBrowse({
      config,
      cookieHeader: cookieHeaderYt,
      authorization: authYt,
      clientKey: "WEB",
      browseId: "FEsubscriptions",
      params: working.scenario.includes("latest") ? LATEST_PARAMS : undefined,
    });
    fs.writeFileSync(
      path.join(outDir, "working-sample.json"),
      JSON.stringify(full.data, null, 2).slice(0, 80000),
    );
  }

  const emptyRes = await innertubeBrowse({
    config,
    cookieHeader: cookieHeaderAll,
    authorization: null,
    clientKey: "WEB",
    browseId: "FEsubscriptions",
  });
  fs.writeFileSync(
    path.join(outDir, "empty-cookies-only-sample.json"),
    JSON.stringify(emptyRes.data, null, 2).slice(0, 80000),
  );

  console.log("=== COMPARISON ===");
  console.log(
    `Plugin default (all cookies): logged_in=${pluginDefault?.summary.loggedIn} lockups=${pluginDefault?.summary.lockups} signIn=${pluginDefault?.summary.signIn.length ?? "?"}`,
  );
  console.log(
    `Fix (yt-only + SAPISIDHASH): logged_in=${withAuth?.summary.loggedIn} lockups=${withAuth?.summary.lockups} signIn=${withAuth?.summary.signIn.length ?? "?"}`,
  );
  console.log(`\nSamples written to ${outDir}/`);

  // Decode latest params protobuf-ish base64 for inspection
  console.log(`\nLatest params raw: ${LATEST_PARAMS_DECODED}`);
  try {
    const buf = Buffer.from(LATEST_PARAMS_DECODED, "base64");
    console.log(`Latest params hex: ${buf.toString("hex")}`);
  } catch (e) {
    console.log(`Latest params decode error: ${e}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});