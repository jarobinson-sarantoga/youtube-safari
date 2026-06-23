import { gridContents } from "./grid-structure-client.mjs";

export function analyze(data, label) {
  const grid = gridContents(data);

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
