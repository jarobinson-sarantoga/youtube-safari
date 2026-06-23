export function scrapeConfig(html) {
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

export function scrapeConfigSimple(html) {
  const key = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  const ver = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1];
  if (!key) return null;
  return { apiKey: key, clientVersion: ver || "2.20240101.00.00" };
}
