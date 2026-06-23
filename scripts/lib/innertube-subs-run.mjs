import fs from "node:fs";
import path from "node:path";
import { innertubeBrowse } from "./innertube-browse.mjs";
import { LATEST_PARAMS } from "./innertube-constants.mjs";

export function printScenarioResult(scenario, status, summary) {
  console.log(`--- ${scenario} ---`);
  console.log(`HTTP ${status}`);
  console.log(`logged_in=${summary.loggedIn} loggedOut=${summary.loggedOut}`);
  console.log(
    `Video renderers: ${JSON.stringify(summary.counts)} (total ${summary.totalVideos}) lockups=${summary.lockups}`,
  );
  if (summary.alert) console.log(`Alert: ${summary.alert}`);
  if (summary.signIn.length) console.log(`Sign-in text: ${summary.signIn.join(" | ")}`);
  if (summary.tabTitles.length) console.log(`Tabs: ${summary.tabTitles.join(", ")}`);
  if (summary.shelfTitles.length) console.log(`Shelves: ${summary.shelfTitles.join(", ")}`);
  console.log(`Top keys: ${summary.topKeys.join(", ")}`);
  console.log("");
}

export function logCookieAuth(cookies, cookieHeaderAll, cookieHeaderYt) {
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
}

export async function writeSubsSamples({
  cookiesPath,
  results,
  config,
  cookieHeaderAll,
  cookieHeaderYt,
  authYt,
}) {
  const outDir = path.join(path.dirname(cookiesPath), "innertube-test-output");
  fs.mkdirSync(outDir, { recursive: true });

  const pick = (label) => results.find((r) => r.scenario === label);

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
  return outDir;
}

export function logLatestParamsDecode(latestParamsDecoded) {
  console.log(`\nLatest params raw: ${latestParamsDecoded}`);
  try {
    const buf = Buffer.from(latestParamsDecoded, "base64");
    console.log(`Latest params hex: ${buf.toString("hex")}`);
  } catch (e) {
    console.log(`Latest params decode error: ${e}`);
  }
}
