export function walk(node, visitor) {
  if (!node || typeof node !== "object") return;
  visitor(node);
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visitor);
  } else {
    for (const v of Object.values(node)) walk(v, visitor);
  }
}

export function textFromRuns(node) {
  if (!node) return "";
  if (typeof node.simpleText === "string") return node.simpleText;
  if (Array.isArray(node.runs)) return node.runs.map((r) => r?.text || "").join("");
  return "";
}

export function getLockupTitle(lockup) {
  const meta = lockup?.metadata?.lockupMetadataViewModel;
  const title = meta?.title;
  if (typeof title?.content === "string") return title.content;
  return textFromRuns(title);
}

export function extractVideoIds(data) {
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

export function extractStructure(data) {
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

export function overlapPercent(a, b) {
  const setA = new Set(a.map((x) => x.id));
  const setB = new Set(b.map((x) => x.id));
  if (setA.size === 0 && setB.size === 0) return 100;
  const intersection = [...setA].filter((id) => setB.has(id)).length;
  const union = new Set([...setA, ...setB]).size;
  return {
    intersection,
    union,
    pct: union ? Math.round((intersection / union) * 100) : 0,
    firstMatch: a[0]?.id === b[0]?.id,
  };
}
