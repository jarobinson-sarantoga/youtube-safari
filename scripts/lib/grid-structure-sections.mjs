import { gridContents } from "./grid-structure-client.mjs";

export function sectionIds(data) {
  const grid = gridContents(data);
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

export function parseBySection(data) {
  const grid = gridContents(data);
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
