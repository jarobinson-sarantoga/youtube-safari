#!/usr/bin/env node
import {
  analyze,
  createBrowseClient,
  fetchInnerTubeContext,
  loadYouTubeCookies,
  parseBySection,
  sectionIds,
} from "./lib/grid-structure.mjs";

const { cookieHeader, auth } = loadYouTubeCookies();
const { key, ver } = await fetchInnerTubeContext();
const browse = createBrowseClient({ key, ver, cookieHeader, auth });

const subs = await browse();
const latest = await browse("EgIIAhgBIhMCCAE%3D");

analyze(subs, "FEsubscriptions (no params)");
analyze(latest, "FEsubscriptions + Latest params");

const s1 = sectionIds(subs);
const s2 = sectionIds(latest);
console.log("=== Section comparison ===");
console.log(`Latest loose: subs=${s1.latestLoose.length} latest_params=${s2.latestLoose.length}`);
console.log(`Most relevant: subs=${s1.mostRelevant.length} latest_params=${s2.mostRelevant.length}`);
console.log(`Latest first IDs subs: ${s1.latestLoose.slice(0, 5).join(", ")}`);
console.log(`Latest first IDs latest: ${s2.latestLoose.slice(0, 5).join(", ")}`);
console.log(`Most relevant first subs: ${s1.mostRelevant.slice(0, 5).join(", ")}`);
console.log(`Most relevant first latest: ${s2.mostRelevant.slice(0, 5).join(", ")}`);

const ps = parseBySection(subs);
console.log("\n=== Section-aware parse (subs, no params) ===");
console.log(`Latest-only chronological: ${ps.latest.length} (first: ${ps.latest.slice(0, 5).join(", ")})`);
console.log(`Activity (Most relevant + other): ${ps.activity.length} (first: ${ps.activity.slice(0, 5).join(", ")})`);
console.log(`Overlap latest vs activity IDs: ${ps.latest.filter((id) => ps.activity.includes(id)).length}`);
