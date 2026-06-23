export function countVideoRenderers(node, counts = {}) {
  if (!node) return counts;
  if (Array.isArray(node)) {
    for (const item of node) countVideoRenderers(item, counts);
    return counts;
  }
  if (typeof node !== "object") return counts;

  for (const [key, value] of Object.entries(node)) {
    if (
      key === "videoRenderer" ||
      key === "gridVideoRenderer" ||
      key === "compactVideoRenderer"
    ) {
      counts[key] = (counts[key] || 0) + 1;
    }
    if (value && typeof value === "object") countVideoRenderers(value, counts);
  }
  return counts;
}

export function findSignInMessages(node, out = []) {
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

export function summarizeResponse(data) {
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
