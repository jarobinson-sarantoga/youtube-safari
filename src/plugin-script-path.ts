const { preferences, utils } = iina;

/** True when the path already uses an absolute, home, or IINA pseudo prefix. */
function needsResolvePath(path: string): boolean {
  return path.startsWith("/") || path.startsWith("~") || path.startsWith("@");
}

/**
 * Resolve a bash script path from a preference or plugin-root relative default.
 * Plugin-relative paths (e.g. scripts/resolve.sh) must not pass through resolvePath.
 */
export function pluginScriptPath(prefKey: string, relativeDefault: string): string {
  const configured = (preferences.get(prefKey) as string | undefined)?.trim();
  const candidate = configured || relativeDefault;
  return needsResolvePath(candidate) ? utils.resolvePath(candidate) : candidate;
}
