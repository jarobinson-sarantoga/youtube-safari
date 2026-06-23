import fs from "node:fs";

export function readCookieHeader(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const p = l.split("\t");
      return { domain: p[0], name: p[5], value: p[6] };
    })
    .filter((c) => c.domain?.includes("youtube.com"))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

export function sectionCounts(items) {
  const counts = {};
  for (const item of items) {
    const key = item.sectionId || "(none)";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export function firstLine(label, items) {
  const first = items[0];
  if (!first) {
    console.log(`${label}: 0 items`);
    return null;
  }
  console.log(
    `${label}: ${items.length} items — first: ${first.title.slice(0, 60)} (${first.videoId})` +
      (first.sectionId ? ` [${first.sectionId}]` : ""),
  );
  return first;
}

export function runFeedChecks({
  loginWall,
  homeItems,
  subsItems,
  subsSections,
  shortsItems,
  searchItems,
  homeFirst,
  subsFirst,
  shortsFirst,
  relatedFirst,
}) {
  console.log("\n--- checks ---");
  let failed = 0;
  const check = (ok, msg) => {
    console.log(`${ok ? "PASS" : "FAIL"}: ${msg}`);
    if (!ok) failed += 1;
  };
  const skip = (msg) => console.log(`SKIP: ${msg}`);

  check(searchItems.length > 0, `search has items (${searchItems.length})`);

  if (loginWall) {
    skip(
      "authenticated feeds (home/subscriptions/shorts) — Safari cookies are logged out; run refresh-cookies",
    );
  } else {
    check(homeItems.length > 0, `home has items (${homeItems.length})`);
    check(subsItems.length > 0, `subscriptions has items (${subsItems.length})`);
    check(
      subsSections.relevant > 0 || subsSections.uploads > 0,
      "subscriptions has relevant or uploads section",
    );
    check(shortsItems.length > 0, `shorts has items (${shortsItems.length})`);

    if (homeFirst && subsFirst) {
      check(
        homeFirst.videoId !== subsFirst.videoId,
        "home first ≠ subscriptions first",
      );
    }
    if (subsFirst && shortsFirst) {
      check(
        subsFirst.videoId !== shortsFirst.videoId ||
          subsFirst.sectionId !== shortsFirst.sectionId,
        "subscriptions first differs from shorts first (id or section)",
      );
    }
    if (relatedFirst) {
      check(relatedFirst.videoId !== homeFirst?.videoId, "related excludes source video");
    }
  }

  return failed;
}
