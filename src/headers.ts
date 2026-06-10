const { console, mpv, preferences } = iina;

function optionWasSet(name: string): boolean {
  return mpv.getFlag(`"option-info/${name}/set-from-commandline"`);
}

export function setHTTPHeaders(headers: Record<string, string> | undefined): void {
  if (!headers) {
    headers = {};
  }

  const ua = headers["User-Agent"];
  if (ua && !optionWasSet("user-agent")) {
    mpv.set("user-agent", ua);
    mpv.set("file-local-options/user-agent", ua);
  }

  const mpvHeaders: string[] = [];
  for (const field of ["Cookie", "X-Forwarded-For"]) {
    const value = headers[field];
    if (value) {
      mpvHeaders.push(`${field}: ${value}`);
    }
  }

  const forcedReferer = (preferences.get("force_referer") as string) || "https://www.youtube.com/";
  mpvHeaders.push(`Referer: ${forcedReferer}`);

  if (mpvHeaders.length > 0 && !optionWasSet("http-header-fields")) {
    mpv.set("http-header-fields", mpvHeaders);
    mpv.set("file-local-options/http-header-fields", mpvHeaders);
    console.log(`Applied HTTP headers: ${mpvHeaders.map((h) => h.split(":")[0]).join(", ")}`);
  }
}

/** Apply Referer (and optional yt-dlp headers) for stream playback. */
export function applyStreamHeaders(headers?: Record<string, string>): void {
  setHTTPHeaders(headers || {});
}