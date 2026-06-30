import { cookiesPath, hasBrowseAuth, hasYouTubeAuth } from "./browse/cookies";
import { appendLog } from "./ytdl";

const { core, file } = iina;

export type CookieHealth = "ok" | "missing" | "unauthenticated" | "partial";

export function getCookieHealth(): CookieHealth {
  const path = cookiesPath();
  if (!file.exists(path)) {
    return "missing";
  }
  if (!hasYouTubeAuth()) {
    return "unauthenticated";
  }
  if (!hasBrowseAuth()) {
    return "partial";
  }
  return "ok";
}

function messageFor(health: CookieHealth): string {
  if (health === "missing") {
    return "YouTube cookies missing — Plugin → Refresh YouTube";
  }
  if (health === "unauthenticated") {
    return "YouTube cookies need refresh — Plugin → Refresh YouTube";
  }
  if (health === "partial") {
    return "YouTube cookies incomplete — sign in via Safari, then Plugin → Refresh YouTube";
  }
  return "";
}

let playerOsdShown = false;

/** Log unhealthy cookies; optionally show one OSD per player instance. */
export function notifyCookieHealthIfNeeded(options?: { osd?: boolean }): void {
  const health = getCookieHealth();
  if (health === "ok") {
    return;
  }

  const msg = messageFor(health);
  appendLog(`Cookie health: ${health} (${cookiesPath()}) — ${msg}`);

  if (!options?.osd || playerOsdShown) {
    return;
  }

  playerOsdShown = true;
  core.osd(msg);
}
