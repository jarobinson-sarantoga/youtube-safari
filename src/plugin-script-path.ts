import { appendLog } from "./ytdl";

const { file, preferences, utils } = iina;

const PLUGIN_ROOT_FILE = "@data/plugin-root";

/** True when the path already uses an absolute, home, or IINA pseudo prefix. */
function needsResolvePath(path: string): boolean {
  return path.startsWith("/") || path.startsWith("~") || path.startsWith("@");
}

function joinWithPluginRoot(relativePath: string): string {
  const marker = utils.resolvePath(PLUGIN_ROOT_FILE);
  if (!file.exists(marker)) {
    appendLog(`plugin-root marker missing: ${marker}`);
    return relativePath;
  }
  const root = (file.read(marker) || "").trim();
  if (!root) {
    appendLog(`plugin-root marker empty: ${marker}`);
    return relativePath;
  }
  return `${root.replace(/\/$/, "")}/${relativePath}`;
}

/**
 * Resolve a bash script path from a preference or plugin-root relative default.
 * IINA utils.resolvePath/fileInPath require absolute paths for exec().
 */
export function pluginScriptPath(prefKey: string, relativeDefault: string): string {
  const configured = (preferences.get(prefKey) as string | undefined)?.trim();
  if (configured) {
    return needsResolvePath(configured)
      ? utils.resolvePath(configured)
      : joinWithPluginRoot(configured);
  }
  return joinWithPluginRoot(relativeDefault);
}
