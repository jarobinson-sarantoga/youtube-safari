import { appendLog } from "./ytdl";

const { preferences, utils } = iina;

const DEFAULT_REFRESH_SCRIPT = "~/Projects/youtube-safari/scripts/refresh-cookies.sh";

let refreshInFlight: Promise<boolean> | null = null;
let panelCookiesPrimed = false;

async function execRefreshScript(script: string): Promise<{
  status: number;
  stdout: string;
  stderr: string;
}> {
  appendLog(`Running YouTube refresh: bash ${script}`);
  return utils.exec("/bin/bash", [script]);
}

/** Export Safari YouTube cookies for yt-dlp. Returns true on success. */
export async function refreshYouTubeCookies(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const configured = preferences.get("refresh_script") as string | undefined;
    const script = utils.resolvePath(configured || DEFAULT_REFRESH_SCRIPT);
    if (!utils.fileInPath(script)) {
      appendLog(`Missing refresh script: ${script}`);
      return false;
    }

    const result = await execRefreshScript(script);
    if (result.status !== 0) {
      const detail = (result.stderr || result.stdout || "unknown error").trim();
      appendLog(`YouTube refresh failed (${result.status}): ${detail}`);
      return false;
    }

    const output = (result.stdout || "").trim();
    appendLog(output ? `YouTube refresh OK: ${output}` : "YouTube refresh OK");
    return true;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

/** Refresh cookies once per IINA session when a panel webview first becomes ready. */
export async function primePanelCookiesOnFirstLoad(): Promise<boolean> {
  if (panelCookiesPrimed) {
    return false;
  }
  panelCookiesPrimed = true;
  appendLog("Panel first load — refreshing YouTube session");
  return refreshYouTubeCookies();
}