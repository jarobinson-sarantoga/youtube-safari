import { appendLog, getLogPath } from "./ytdl";

const { core, menu, preferences, utils } = iina;

const DEFAULT_REFRESH_SCRIPT = "~/Projects/youtube-safari/scripts/refresh-cookies.sh";

menu.addItem(
  menu.item("Refresh Safari Cookies", async () => {
    core.osd("Refreshing cookies (Terminal)…");
    appendLog("Refresh Safari Cookies requested");

    const configured = preferences.get("refresh_script") as string | undefined;
    const script = utils.resolvePath(configured || DEFAULT_REFRESH_SCRIPT);
    if (!utils.fileInPath(script)) {
      core.osd("refresh-cookies.sh not found");
      appendLog(`Missing refresh script: ${script}`);
      return;
    }

    // IINA cannot read Safari keychain; run refresh in Terminal (has FDA).
    const cmd = `tell application "Terminal" to do script "bash '${script.replace(/'/g, "'\\''")}'"`;
    const result = await utils.exec("/usr/bin/osascript", ["-e", cmd]);

    if (result.status === 0) {
      core.osd("Cookie refresh started in Terminal");
      appendLog("Opened Terminal for cookie refresh");
    } else {
      core.osd("Could not open Terminal");
      appendLog(`osascript failed: ${result.stderr}`);
    }
  }),
);

menu.addItem(
  menu.item("View Log", async () => {
    const logPath = getLogPath();
    appendLog("View Log opened");
    const result = await utils.exec("/usr/bin/open", ["-t", logPath]);
    if (result.status !== 0) {
      core.osd("Could not open log file");
      appendLog(`open -t failed: ${result.stderr}`);
    }
  }),
);