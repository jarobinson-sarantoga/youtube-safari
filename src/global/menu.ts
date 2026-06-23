import { BROWSE_KEY_BINDING } from "../keybindings";
import { invalidateBrowseSessionCaches } from "../browse/session-invalidate";
import { refreshYouTubeCookies } from "../youtube-refresh";
import { appendLog, getLogPath } from "../ytdl";
import { openStandalonePanel } from "../standalone-host";
import { notifyPlayersCookiesRefreshed } from "./cookies";
import { notifyStandaloneFeedsStale } from "../standalone-host";

const { menu, utils } = iina;

const globalMenuState = { installed: false };

export function installGlobalMenuItems(): boolean {
  if (globalMenuState.installed) {
    return true;
  }

  try {
    menu.addItem(
      menu.item(
        "Open YouTube Panel",
        () => {
          appendLog(`Open YouTube panel (${BROWSE_KEY_BINDING} menu action)`);
          openStandalonePanel();
        },
        { keyBinding: BROWSE_KEY_BINDING },
      ),
    );

    menu.addItem(
      menu.item("Refresh YouTube", () => {
        void (async () => {
          appendLog("Refresh YouTube requested");
          const ok = await refreshYouTubeCookies();
          if (!ok) {
            return;
          }
          invalidateBrowseSessionCaches();
          notifyPlayersCookiesRefreshed();
          notifyStandaloneFeedsStale();
        })();
      }),
    );

    menu.addItem(
      menu.item("View Log", () => {
        void (async () => {
          const logPath = getLogPath();
          appendLog("View Log opened");
          const result = await utils.exec("/usr/bin/open", ["-t", logPath]);
          if (result.status !== 0) {
            appendLog(`open -t failed: ${result.stderr}`);
          }
        })();
      }),
    );

    globalMenuState.installed = true;
    appendLog(`Global plugin menu installed (${BROWSE_KEY_BINDING})`);
    return true;
  } catch (err) {
    appendLog(`Global plugin menu install failed: ${err}`);
    return false;
  }
}
