#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";

const raw = fs.readFileSync(`${process.env.HOME}/.config/yt-dlp/cookies.txt`, "utf8");
const cookies = raw
  .split(/\r?\n/)
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => {
    const p = l.split("\t");
    return { domain: p[0], name: p[5], value: p[6] };
  });
const cookieHeader = cookies
  .filter((c) => c.domain.includes("youtube.com"))
  .map((c) => `${c.name}=${c.value}`)
  .join("; ");
const sapisid = cookies.find((c) => c.name === "SAPISID" && c.domain.includes("youtube.com"))?.value;
const ts = Math.floor(Date.now() / 1000);
const auth = `SAPISIDHASH ${ts}_${crypto.createHash("sha1").update(`${ts} ${sapisid} https://www.youtube.com`).digest("hex")}`;

const home = await fetch("https://www.youtube.com/");
const html = await home.text();
const key = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
const ver = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1];

async function browse(params) {
  const body = {
    context: { client: { clientName: "WEB", clientVersion: ver, hl: "en", gl: "US" } },
    browseId: "FEsubscriptions",
  };
  if (params) body.params = params;
  const res = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${key}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
      Authorization: auth,
      "X-Goog-AuthUser": "0",
      Origin: "https://www.youtube.com",
      Referer: "https://www.youtube.com/feed/subscriptions",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

function analyze(data, label) {
  const grid =
    data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
      ?.richGridRenderer?.contents || [];

  console.log(`=== ${label} (grid items: ${grid.length}) ===`);

  let looseCount = 0;
  const looseIds = [];

  for (const item of grid) {
    const shelfTitle = item.richSectionRenderer?.content?.shelfRenderer?.title?.runs?.[0]?.text;
    if (shelfTitle) {
      console.log(`  [header shelf] "${shelfTitle}"`);
      continue;
    }

    const richShelf = item.richSectionRenderer?.content?.richShelfRenderer;
    if (richShelf) {
      const title = richShelf.title?.runs?.[0]?.text;
      const ids = (richShelf.contents || [])
        .map((c) => c.richItemRenderer?.content?.lockupViewModel?.contentId)
        .filter(Boolean);
      console.log(`  [richShelf] "${title}" — ${ids.length} videos, first: ${ids.slice(0, 3).join(", ")}`);
      continue;
    }

    const id = item.richItemRenderer?.content?.lockupViewModel?.contentId;
    if (id) {
      looseCount++;
      looseIds.push(id);
    }
  }

  if (looseCount) {
    console.log(`  [loose items after Latest header] ${looseCount} videos, first: ${looseIds.slice(0, 5).join(", ")}`);
  }

  const chips = [];
  function walk(n) {
    if (!n || typeof n !== "object") return;
    if (n.chipCloudChipRenderer) {
      chips.push({
        text: n.chipCloudChipRenderer.text?.simpleText || n.chipCloudChipRenderer.text?.runs?.[0]?.text,
        selected: n.chipCloudChipRenderer.isSelected,
        params: n.chipCloudChipRenderer.navigationEndpoint?.browseEndpoint?.params,
        browseId: n.chipCloudChipRenderer.navigationEndpoint?.browseEndpoint?.browseId,
      });
    }
    if (Array.isArray(n)) n.forEach(walk);
    else Object.values(n).forEach(walk);
  }
  walk(data?.header);
  if (chips.length) {
    console.log("  Header chips:", chips);
  }
  console.log("");
}

const subs = await browse();
const latest = await browse("EgIIAhgBIhMCCAE%3D");

analyze(subs, "FEsubscriptions (no params)");
analyze(latest, "FEsubscriptions + Latest params");

// Compare section-level IDs
function sectionIds(data) {
  const grid =
    data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
      ?.richGridRenderer?.contents || [];
  const out = { latestLoose: [], mostRelevant: [] };
  let inLatest = false;
  for (const item of grid) {
    const shelfTitle = item.richSectionRenderer?.content?.shelfRenderer?.title?.runs?.[0]?.text;
    if (shelfTitle === "Latest") {
      inLatest = true;
      continue;
    }
    const richShelf = item.richSectionRenderer?.content?.richShelfRenderer;
    if (richShelf) {
      const title = richShelf.title?.runs?.[0]?.text;
      const ids = (richShelf.contents || [])
        .map((c) => c.richItemRenderer?.content?.lockupViewModel?.contentId)
        .filter(Boolean);
      if (title === "Most relevant") out.mostRelevant = ids;
      inLatest = false;
      continue;
    }
    const id = item.richItemRenderer?.content?.lockupViewModel?.contentId;
    if (id && inLatest) out.latestLoose.push(id);
  }
  return out;
}

const s1 = sectionIds(subs);
const s2 = sectionIds(latest);
console.log("=== Section comparison ===");
console.log(`Latest loose: subs=${s1.latestLoose.length} latest_params=${s2.latestLoose.length}`);
console.log(`Most relevant: subs=${s1.mostRelevant.length} latest_params=${s2.mostRelevant.length}`);
console.log(`Latest first IDs subs: ${s1.latestLoose.slice(0, 5).join(", ")}`);
console.log(`Latest first IDs latest: ${s2.latestLoose.slice(0, 5).join(", ")}`);
console.log(`Most relevant first subs: ${s1.mostRelevant.slice(0, 5).join(", ")}`);
console.log(`Most relevant first latest: ${s2.mostRelevant.slice(0, 5).join(", ")}`);

// Simulate section-aware vs flat parser
function parseBySection(data) {
  const grid =
    data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
      ?.richGridRenderer?.contents || [];
  const latest = [];
  const activity = [];
  let mode = null;

  for (const item of grid) {
    const shelfTitle = item.richSectionRenderer?.content?.shelfRenderer?.title?.runs?.[0]?.text;
    if (shelfTitle === "Latest") {
      mode = "latest";
      continue;
    }
    const richShelf = item.richSectionRenderer?.content?.richShelfRenderer;
    if (richShelf) {
      const title = richShelf.title?.runs?.[0]?.text;
      const ids = (richShelf.contents || [])
        .map((c) => c.richItemRenderer?.content?.lockupViewModel?.contentId)
        .filter(Boolean);
      if (title === "Most relevant") activity.push(...ids);
      mode = title?.toLowerCase() || "section";
      continue;
    }
    const id = item.richItemRenderer?.content?.lockupViewModel?.contentId;
    if (id) {
      if (mode === "latest") latest.push(id);
      else activity.push(id);
    }
  }
  return { latest, activity, full: [...new Set([...activity, ...latest])] };
}

const ps = parseBySection(subs);
console.log("\n=== Section-aware parse (subs, no params) ===");
console.log(`Latest-only chronological: ${ps.latest.length} (first: ${ps.latest.slice(0, 5).join(", ")})`);
console.log(`Activity (Most relevant + other): ${ps.activity.length} (first: ${ps.activity.slice(0, 5).join(", ")})`);
console.log(`Overlap latest vs activity IDs: ${ps.latest.filter((id) => ps.activity.includes(id)).length}`);